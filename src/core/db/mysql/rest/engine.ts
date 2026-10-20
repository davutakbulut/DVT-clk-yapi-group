// PostgREST uyumlu sorgu motoru (K-116): postgrest-js isteğini MariaDB SQL'ine çevirir, RLS'in karşılığını (access.generated)
// uygular ve PostgREST biçiminde yanıt üretir. Satırlar tek JSON_OBJECT olarak seçilir → gömülü ilişkiler, boolean/JSON/zaman
// biçimi her düzeyde aynı kuralla çıkar.
import { escape, type PoolConnection } from 'mysql2/promise';
import { ACCESS, type RoleAccess } from '../access.generated';
import type { Actor } from '../pool';
import { SCHEMA, type ColumnKind, type TableMeta } from '../schema.generated';
import { VIEWS } from './views';
import { type ColumnNode, type Condition, type EmbedNode, type Filter, type OrderTerm, type SelectNode, parseList, parseLogic, parseOperation, parseOrder, parseSelect, RestParseError } from './parse';
import { filterValue, toDbValue } from './values';

export interface RestError {
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly details: string | null;
  readonly hint: string | null;
}
export class RestFailure extends Error {
  constructor(readonly error: RestError) {
    super(error.message);
  }
}
const fail = (status: number, code: string, message: string, details: string | null = null): never => {
  throw new RestFailure({ status, code, message, details, hint: null });
};

// ---------------------------------------------------------------- tablolar ve erişim

interface TableInfo {
  /** İstekteki ad (görünüm adı olabilir) */
  readonly name: string;
  /** Gerçek tablo */
  readonly base: string;
  readonly meta: TableMeta;
  /** Görünümde açık sütunlar (yoksa tümü) */
  readonly columns: readonly string[];
  /** Görünüm koşulu (takma ad = görünüm adı) */
  readonly viewWhere: string | null;
}

function table(name: string): TableInfo {
  const view = VIEWS[name];
  const base = view?.base ?? name;
  const meta = SCHEMA[base];
  if (!meta) return fail(404, 'PGRST205', `Could not find the table 'public.${name}' in the schema cache`);
  return { name, base, meta, columns: view?.columns ?? Object.keys(meta.cols), viewWhere: view?.where ?? null };
}

function kindOf(t: TableInfo, column: string): ColumnKind {
  const k = t.columns.includes(column) ? t.meta.cols[column] : undefined;
  if (!k) return fail(400, '42703', `column ${t.name}.${column} does not exist`);
  return k;
}

type Command = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

function roleAccess(t: TableInfo, actor: Actor): RoleAccess | null {
  if (actor.kind === 'service') return null;
  const entry = ACCESS[t.name];
  if (!entry) return fail(403, '42501', `permission denied for table ${t.name}`);
  return actor.kind === 'anon' ? entry.anon : entry.user;
}

/** Komut için kural SQL'i (takma ada uyarlanmış). Yetki yoksa 42501. Kural yoksa okuma 'FALSE', yazma 42501. */
function policy(t: TableInfo, actor: Actor, cmd: Command, alias: string, part: 'using' | 'check' = 'using', columns?: readonly string[]): string {
  const view = t.viewWhere ? t.viewWhere.replace(new RegExp(`\\b${t.name}\\.`, 'g'), `${q(alias)}.`) : null;
  const access = roleAccess(t, actor);
  if (!access) return view ?? 'TRUE';
  const colGrant = access.columnGrants?.[cmd];
  const granted = access.grants.includes(cmd) || (colGrant && columns?.every((c) => colGrant.includes(c)));
  if (!granted) fail(actor.kind === 'anon' ? 401 : 403, '42501', `permission denied for table ${t.name}`);
  const raw = cmd === 'SELECT' ? access.select : cmd === 'INSERT' ? access.insert : cmd === 'DELETE' ? access.delete : part === 'check' ? access.updateCheck : access.update;
  if (raw == null) {
    if (cmd === 'SELECT' || (cmd !== 'INSERT' && part === 'using')) return 'FALSE';
    return fail(actor.kind === 'anon' ? 401 : 403, '42501', `new row violates row-level security policy for table "${t.name}"`);
  }
  const sql = alias === t.base ? raw : raw.replace(new RegExp(`\\b${t.base}\\.`, 'g'), `${q(alias)}.`);
  return view ? `(${view}) AND (${sql})` : sql;
}

const q = (id: string) => `\`${id.replace(/`/g, '')}\``;

// ---------------------------------------------------------------- ifadeler

/** Değerler mysql2'nin kaçışıyla SQL'e gömülür: alt sorgular farklı sırada üretildiği için konumsal ? parametresi kayardı. */
class Sql {
  private n = 0;
  alias(): string {
    return `e${++this.n}`;
  }
  p(value: unknown): string {
    return escape(value as Parameters<typeof escape>[0]);
  }
}

function jsonPath(path: ColumnNode['path']): string {
  return '$' + path.map((s) => (/^\d+$/.test(s.key) ? `[${s.key}]` : `."${s.key.replace(/"/g, '')}"`)).join('');
}

/** Sütun (ve JSON yolu) için SQL ifadesi. `forOutput`: JSON_OBJECT içine PostgREST biçiminde (boolean true/false, ISO zaman). */
function columnExpr(t: TableInfo, alias: string, column: string, path: ColumnNode['path'], forOutput: boolean, sql: Sql): { expr: string; kind: ColumnKind } {
  const kind = kindOf(t, column);
  const col = `${q(alias)}.${q(column)}`;
  if (path.length) {
    const extract = `JSON_EXTRACT(${col}, ${sql.p(jsonPath(path))})`;
    if (path[path.length - 1]!.text) return { expr: `IF(JSON_TYPE(${extract}) = 'NULL', NULL, JSON_UNQUOTE(${extract}))`, kind: 'text' };
    return { expr: extract, kind: 'json' };
  }
  if (!forOutput) return { expr: col, kind };
  switch (kind) {
    case 'bool':
      return { expr: `IF(${col} IS NULL, NULL, IF(${col}, JSON_EXTRACT('true', '$'), JSON_EXTRACT('false', '$')))`, kind };
    case 'json':
      return { expr: `JSON_EXTRACT(${col}, '$')`, kind };
    case 'ts':
      return { expr: `DATE_FORMAT(${col}, '%Y-%m-%dT%H:%i:%s.%f+00:00')`, kind };
    case 'date':
      return { expr: `DATE_FORMAT(${col}, '%Y-%m-%d')`, kind };
    default:
      return { expr: col, kind };
  }
}

interface EmbedPlan {
  readonly child: TableInfo;
  readonly many: boolean;
  /** (üst takma ad, alt takma ad) → bağlantı koşulu */
  readonly on: (parent: string, child: string) => string;
}

function resolveEmbed(parent: TableInfo, node: EmbedNode): EmbedPlan {
  const child = table(node.relation);
  const hint = node.hint ? node.hint.replace(new RegExp(`^(${parent.name}|${child.name})_`), (m) => (m === `${parent.name}_` ? `${parent.base}_` : `${child.base}_`)) : null;
  const matches = (fk: { name: string; cols: readonly string[] }) => !hint || fk.name === hint || (fk.cols.length === 1 && fk.cols[0] === hint);
  const toOne = parent.meta.fks.filter((fk) => fk.ref === child.base && matches(fk) && fk.cols.every((c) => parent.columns.includes(c)));
  const toMany = child.meta.fks.filter((fk) => fk.ref === parent.base && matches(fk) && fk.cols.every((c) => child.columns.includes(c)));
  const all = [...toOne.map((fk) => ({ fk, many: false })), ...toMany.map((fk) => ({ fk, many: true }))];
  if (all.length === 0) return fail(400, 'PGRST200', `Could not find a relationship between '${parent.name}' and '${child.name}' in the schema cache`);
  if (all.length > 1) return fail(300, 'PGRST201', `Could not embed because more than one relationship was found for '${parent.name}' and '${child.name}'`);
  const { fk, many } = all[0]!;
  return {
    child,
    many,
    on: (p, c) =>
      fk.cols
        .map((col, i) => (many ? `${q(c)}.${q(col)} = ${q(p)}.${q(fk.refCols[i]!)}` : `${q(c)}.${q(fk.refCols[i]!)} = ${q(p)}.${q(col)}`))
        .join(' AND '),
  };
}

// ---------------------------------------------------------------- filtreler

/** İstek parametrelerinden filtreler; `alt.sütun=…` gömüye ait olanlar yolu ile ayrılır. */
export interface FilterSet {
  readonly own: Filter[];
  readonly order: OrderTerm[];
  limit: number | null;
  offset: number | null;
  readonly nested: Map<string, FilterSet>;
}

const RESERVED_PARAMS = new Set(['select', 'columns', 'on_conflict']);

export function filtersFromParams(params: URLSearchParams): FilterSet {
  const root: FilterSet = { own: [], order: [], limit: null, offset: null, nested: new Map() };
  const at = (path: string[]): FilterSet => {
    let cur = root;
    for (const seg of path) {
      let next = cur.nested.get(seg);
      if (!next) cur.nested.set(seg, (next = { own: [], order: [], limit: null, offset: null, nested: new Map() }));
      cur = next;
    }
    return cur;
  };
  for (const [key, value] of params) {
    if (RESERVED_PARAMS.has(key)) continue;
    // "a.b.order" → yol [a, b] + anahtar order; sütun adı JSON yolu (->) içerebilir, onu bölme
    const arrow = key.search(/->/);
    const head = arrow >= 0 ? key.slice(0, arrow) : key;
    const segs = head.split('.');
    const last = segs.pop()!;
    const name = arrow >= 0 ? last + key.slice(arrow) : last;
    const set = at(segs);
    if (name === 'order') set.order.push(...parseOrder(value));
    else if (name === 'limit') set.limit = Number(value);
    else if (name === 'offset') set.offset = Number(value);
    else if (name === 'or' || name === 'and') set.own.push(parseLogic(name, false, value));
    else if ((name === 'not.or' || name === 'not.and') && value.startsWith('(')) set.own.push(parseLogic(name.slice(4) as 'and' | 'or', true, value));
    else set.own.push(parseOperation(name, value));
  }
  return root;
}

function conditionSql(t: TableInfo, alias: string, c: Condition, sql: Sql): string {
  const { expr, kind } = columnExpr(t, alias, c.column, c.path, false, sql);
  const v = (raw: string) => sql.p(filterValue(kind, raw));
  let out: string;
  switch (c.op) {
    case 'eq': out = `${expr} = ${v(c.value)}`; break;
    case 'neq': out = `${expr} <> ${v(c.value)}`; break;
    case 'gt': out = `${expr} > ${v(c.value)}`; break;
    case 'gte': out = `${expr} >= ${v(c.value)}`; break;
    case 'lt': out = `${expr} < ${v(c.value)}`; break;
    case 'lte': out = `${expr} <= ${v(c.value)}`; break;
    case 'like': out = `${expr} LIKE BINARY ${sql.p(c.value.replace(/\*/g, '%'))}`; break;
    case 'ilike': out = `LOWER(${expr}) LIKE LOWER(${sql.p(c.value.replace(/\*/g, '%'))})`; break;
    case 'match': out = `${expr} REGEXP BINARY ${sql.p(c.value)}`; break;
    case 'imatch': out = `${expr} REGEXP ${sql.p(c.value)}`; break;
    case 'is': {
      const val = c.value.toLocaleLowerCase('en');
      out = `${expr} IS ${val === 'null' ? 'NULL' : val === 'true' ? 'TRUE' : val === 'false' ? 'FALSE' : val === 'unknown' ? 'UNKNOWN' : fail(400, '22P02', `invalid is value: ${c.value}`)}`;
      break;
    }
    case 'in': {
      const list = parseList(c.value);
      out = list.length ? `${expr} IN (${list.map((x) => v(x)).join(', ')})` : 'FALSE';
      break;
    }
    case 'cs':
    case 'cd':
    case 'ov': {
      const json = containerJson(c.value);
      out = c.op === 'cs' ? `JSON_CONTAINS(${expr}, ${sql.p(json)})` : c.op === 'cd' ? `JSON_CONTAINS(${sql.p(json)}, ${expr})` : `JSON_OVERLAPS(${expr}, ${sql.p(json)})`;
      break;
    }
  }
  return c.negate ? `NOT (${out})` : out;
}

/** `{a,b}` (PostgreSQL dizi) ya da JSON metni → JSON metni. */
function containerJson(raw: string): string {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) return raw;
  } catch {
    // dizi sabiti
  }
  return JSON.stringify(parseList(raw));
}

function filterSql(t: TableInfo, alias: string, f: Filter, sql: Sql): string {
  if (f.kind === 'cond') return conditionSql(t, alias, f, sql);
  const parts = f.items.map((x) => `(${filterSql(t, alias, x, sql)})`);
  const joined = parts.length ? parts.join(f.op === 'and' ? ' AND ' : ' OR ') : f.op === 'and' ? 'TRUE' : 'FALSE';
  return f.negate ? `NOT (${joined})` : joined;
}

function orderSql(t: TableInfo, alias: string, terms: readonly OrderTerm[], sql: Sql): string {
  // PostgreSQL varsayılanı: ASC → NULLS LAST, DESC → NULLS FIRST (MariaDB tersini yapar)
  return terms
    .map((o) => {
      const { expr } = columnExpr(t, alias, o.column, o.path, false, sql);
      const nullsLast = o.nulls ? o.nulls === 'last' : !o.desc;
      return `(${expr} IS NULL) ${nullsLast ? 'ASC' : 'DESC'}, ${expr} ${o.desc ? 'DESC' : 'ASC'}`;
    })
    .join(', ');
}

// ---------------------------------------------------------------- SELECT

/** Satırın JSON_OBJECT ifadesi; gömüler ilişkili alt sorgu. `inner` gömüler üst sorguya EXISTS koşulu ekler. */
function objectExpr(t: TableInfo, alias: string, nodes: readonly SelectNode[], filters: FilterSet, actor: Actor, sql: Sql, innerConds: string[]): string {
  const pairs: string[] = [];
  const add = (key: string, expr: string) => pairs.push(`${sql.p(key)}, ${expr}`);
  for (const node of nodes) {
    if (node.kind === 'star') for (const c of t.columns) add(c, columnExpr(t, alias, c, [], true, sql).expr);
    else if (node.kind === 'column') add(node.alias, columnExpr(t, alias, node.column, node.path, true, sql).expr);
    else if (node.kind === 'count') fail(400, 'PGRST100', 'count() toplamı yalnız gömü içinde desteklenir');
    else {
      const plan = resolveEmbed(t, node);
      const ca = sql.alias();
      const sub = filters.nested.get(node.alias) ?? filters.nested.get(node.relation) ?? { own: [], order: [], limit: null, offset: null, nested: new Map() };
      const where = [plan.on(alias, ca), policy(plan.child, actor, 'SELECT', ca), ...sub.own.map((f) => filterSql(plan.child, ca, f, sql))];
      const childInner: string[] = [];
      const onlyCount = node.children.length === 1 && node.children[0]!.kind === 'count';
      const obj = onlyCount ? '' : objectExpr(plan.child, ca, node.children, sub, actor, sql, childInner);
      where.push(...childInner);
      const from = `FROM ${q(plan.child.base)} AS ${q(ca)} WHERE ${where.map((w) => `(${w})`).join(' AND ')}`;
      if (node.inner) innerConds.push(`EXISTS (SELECT 1 ${from})`);
      if (onlyCount) {
        add(node.alias, `JSON_ARRAY(JSON_OBJECT('count', (SELECT COUNT(*) ${from})))`);
      } else if (plan.many) {
        const ord = sub.order.length ? ` ORDER BY ${orderSql(plan.child, ca, sub.order, sql)}` : '';
        const lim = sub.limit != null ? ` LIMIT ${Math.max(0, Math.floor(sub.limit))}${sub.offset ? ` OFFSET ${Math.max(0, Math.floor(sub.offset))}` : ''}` : '';
        add(node.alias, `COALESCE((SELECT JSON_ARRAYAGG(${obj}${ord}${lim}) ${from}), JSON_ARRAY())`);
      } else {
        add(node.alias, `(SELECT ${obj} ${from} LIMIT 1)`);
      }
    }
  }
  return `JSON_OBJECT(${pairs.join(', ')})`;
}

interface SelectPlan {
  readonly t: TableInfo;
  readonly nodes: readonly SelectNode[];
  readonly filters: FilterSet;
}

function whereFor(plan: SelectPlan, actor: Actor, sql: Sql, cmd: Command, extra: readonly string[] = []): { where: string } {
  const conds = [policy(plan.t, actor, cmd, plan.t.name), ...plan.filters.own.map((f) => filterSql(plan.t, plan.t.name, f, sql)), ...extra];
  return { where: conds.map((c) => `(${c})`).join(' AND ') };
}

async function runSelect(conn: PoolConnection, plan: SelectPlan, actor: Actor, opts: { count: boolean; head: boolean; pkIn?: readonly unknown[][] }): Promise<{ rows: unknown[]; total: number | null }> {
  const { t } = plan;
  const sql = new Sql();
  const innerConds: string[] = [];
  const obj = opts.head ? '' : objectExpr(t, t.name, plan.nodes, plan.filters, actor, sql, innerConds);
  const pkCond = opts.pkIn ? [pkInSql(t, t.name, opts.pkIn, sql)] : [];
  const { where } = whereFor(plan, actor, sql, 'SELECT', [...pkCond, ...innerConds]);
  const order = plan.filters.order.length ? ` ORDER BY ${orderSql(t, t.name, plan.filters.order, sql)}` : '';
  const limit = plan.filters.limit != null ? ` LIMIT ${Math.max(0, Math.floor(plan.filters.limit))}` : '';
  const offset = plan.filters.offset ? `${limit ? '' : ' LIMIT 18446744073709551615'} OFFSET ${Math.max(0, Math.floor(plan.filters.offset))}` : '';
  const from = `FROM ${q(t.base)} AS ${q(t.name)} WHERE ${where}`;
  let total: number | null = null;
  if (opts.count) {
    const [rows] = await conn.query(`SELECT COUNT(*) AS n ${from}`);
    total = Number((rows as { n: number }[])[0]!.n);
  }
  if (opts.head) return { rows: [], total };
  const pkSelect = opts.pkIn ? `, ${t.meta.pk.map((c, i) => `${q(t.name)}.${q(c)} AS __k${i}`).join(', ')}` : '';
  const [rows] = await conn.query(`SELECT ${obj} AS r${pkSelect} ${from}${order}${limit}${offset}`);
  const list = rows as { r: unknown; [k: string]: unknown }[];
  const parsed = list.map((row) => (typeof row.r === 'string' ? JSON.parse(row.r) : row.r));
  if (opts.pkIn) {
    // yazma sonrası temsil: dönen sıra yazılan sırayla aynı olsun
    const key = (vals: readonly unknown[]) => JSON.stringify(vals.map((v) => String(v)));
    const index = new Map(opts.pkIn.map((vals, i) => [key(vals), i]));
    const withIdx = list.map((row, i) => ({ i: index.get(key(t.meta.pk.map((_, k) => row[`__k${k}`]))) ?? 0, v: parsed[i] }));
    return { rows: withIdx.sort((a, b) => a.i - b.i).map((x) => x.v), total };
  }
  return { rows: parsed, total };
}

function pkInSql(t: TableInfo, alias: string, keys: readonly unknown[][], sql: Sql): string {
  if (!t.meta.pk.length) return fail(400, 'PGRST000', `${t.name} has no primary key`);
  if (!keys.length) return 'FALSE';
  const cols = t.meta.pk.map((c) => `${q(alias)}.${q(c)}`);
  return `(${cols.join(', ')}) IN (${keys.map((k) => `(${k.map((v) => sql.p(v)).join(', ')})`).join(', ')})`;
}

// ---------------------------------------------------------------- yazma

function writableColumns(t: TableInfo, row: Record<string, unknown>): string[] {
  const cols = Object.keys(row);
  for (const c of cols) if (!t.columns.includes(c)) fail(400, 'PGRST204', `Could not find the '${c}' column of '${t.name}' in the schema cache`);
  return cols;
}

async function pkOf(conn: PoolConnection, t: TableInfo, where: string): Promise<unknown[][]> {
  if (!t.meta.pk.length) return fail(400, 'PGRST000', `${t.name} has no primary key`);
  const [rows] = await conn.query(`SELECT ${t.meta.pk.map((c) => `${q(t.name)}.${q(c)}`).join(', ')} FROM ${q(t.base)} AS ${q(t.name)} WHERE ${where} FOR UPDATE`);
  return (rows as Record<string, unknown>[]).map((r) => t.meta.pk.map((c) => r[c]));
}

async function assertCheck(conn: PoolConnection, t: TableInfo, actor: Actor, cmd: 'INSERT' | 'UPDATE', keys: unknown[][], columns: readonly string[]): Promise<void> {
  if (actor.kind === 'service' || !keys.length) return;
  const sql = new Sql();
  const check = policy(t, actor, cmd, t.name, 'check', columns);
  if (check === 'TRUE') return;
  const cond = pkInSql(t, t.name, keys, sql);
  const [rows] = await conn.query(`SELECT COUNT(*) AS n FROM ${q(t.base)} AS ${q(t.name)} WHERE ${cond} AND (${check})`);
  if (Number((rows as { n: number }[])[0]!.n) !== keys.length) fail(actor.kind === 'anon' ? 401 : 403, '42501', `new row violates row-level security policy for table "${t.name}"`);
}

export interface RestRequest {
  readonly method: string;
  readonly table: string;
  readonly params: URLSearchParams;
  readonly prefer: string;
  readonly accept: string;
  readonly body: unknown;
}
export interface RestResult {
  readonly status: number;
  readonly body: unknown;
  readonly contentRange: string | null;
}

export async function handleTable(conn: PoolConnection, actor: Actor, req: RestRequest): Promise<RestResult> {
  const t = table(req.table);
  const filters = filtersFromParams(req.params);
  const nodes = parseSelect(req.params.get('select') ?? '*');
  const plan: SelectPlan = { t, nodes, filters };
  const wantCount = /count=(exact|planned|estimated)/.test(req.prefer);
  const representation = /return=representation/.test(req.prefer);
  const single = req.accept.startsWith('application/vnd.pgrst.object+json');

  const respond = (rows: unknown[], total: number | null, status: number): RestResult => {
    const offset = filters.offset ?? 0;
    const range = rows.length ? `${offset}-${offset + rows.length - 1}` : '*';
    const contentRange = total != null ? `${range}/${total}` : null;
    if (single) {
      if (rows.length !== 1) fail(406, 'PGRST116', 'JSON object requested, multiple (or no) rows returned', `The result contains ${rows.length} rows`);
      return { status, body: rows[0], contentRange };
    }
    return { status, body: rows, contentRange };
  };

  switch (req.method) {
    case 'GET':
    case 'HEAD': {
      const { rows, total } = await runSelect(conn, plan, actor, { count: wantCount, head: req.method === 'HEAD' });
      return respond(rows, total, 200);
    }
    case 'POST': {
      const input = Array.isArray(req.body) ? (req.body as Record<string, unknown>[]) : [req.body as Record<string, unknown>];
      if (!input.length) return respond([], wantCount ? 0 : null, 201);
      const listed = req.params.get('columns')?.split(',').map((c) => c.replace(/"/g, '').trim());
      const cols = listed ?? [...new Set(input.flatMap((r) => writableColumns(t, r)))];
      for (const c of cols) kindOf(t, c);
      const missingDefault = /missing=default/.test(req.prefer) || !listed;
      const upsert = /resolution=(merge|ignore)-duplicates/.exec(req.prefer)?.[1] ?? null;
      policy(t, actor, 'INSERT', t.name, 'check', cols); // yetki + kural varlığı (yoksa burada 42501)
      if (upsert === 'merge') policy(t, actor, 'UPDATE', t.name, 'using', cols);
      const sql = new Sql();
      const values = input
        .map((row) => `(${cols.map((c) => (c in row ? sql.p(toDbValue(t.meta.cols[c]!, row[c])) : missingDefault ? 'DEFAULT' : 'NULL')).join(', ')})`)
        .join(', ');
      const conflict = req.params.get('on_conflict')?.split(',').map((c) => c.trim()) ?? t.meta.pk;
      let keys: unknown[][];
      if (upsert) {
        const updates = upsert === 'merge' ? cols.filter((c) => !conflict.includes(c)).map((c) => `${q(c)} = VALUES(${q(c)})`) : [];
        const onDup = updates.length ? updates.join(', ') : `${q(conflict[0]!)} = ${q(conflict[0]!)}`;
        await conn.query(`INSERT INTO ${q(t.base)} (${cols.map(q).join(', ')}) VALUES ${values} ON DUPLICATE KEY UPDATE ${onDup}`);
        // etkilenen satırlar çakışma anahtarıyla bulunur (MariaDB ON DUPLICATE KEY ile RETURNING vermez)
        const ks = new Sql();
        const cond = input.map((row) => `(${conflict.map((c) => `${q(t.name)}.${q(c)} = ${ks.p(toDbValue(t.meta.cols[c]!, row[c]))}`).join(' AND ')})`).join(' OR ');
        keys = await pkOf(conn, t, cond);
      } else {
        const [rows] = await conn.query(`INSERT INTO ${q(t.base)} (${cols.map(q).join(', ')}) VALUES ${values} RETURNING ${t.meta.pk.map(q).join(', ')}`);
        keys = (rows as Record<string, unknown>[]).map((r) => t.meta.pk.map((c) => r[c]));
      }
      await assertCheck(conn, t, actor, 'INSERT', keys, cols);
      if (!representation) return { status: 201, body: null, contentRange: wantCount ? `*/${keys.length}` : null };
      const { rows } = await runSelect(conn, { t, nodes, filters: { ...filters, own: [] } }, actor, { count: false, head: false, pkIn: keys });
      return respond(rows, wantCount ? keys.length : null, 201);
    }
    case 'PATCH': {
      const patch = req.body as Record<string, unknown>;
      const cols = writableColumns(t, patch);
      const sql = new Sql();
      const { where } = whereFor(plan, actor, sql, 'UPDATE');
      const keys = await pkOf(conn, t, where);
      if (keys.length && cols.length) {
        const up = new Sql();
        const sets = cols.map((c) => `${q(c)} = ${up.p(toDbValue(t.meta.cols[c]!, patch[c]))}`).join(', ');
        const cond = pkInSql(t, t.base, keys, up);
        await conn.query(`UPDATE ${q(t.base)} SET ${sets} WHERE ${cond}`);
        await assertCheck(conn, t, actor, 'UPDATE', keys, cols);
      }
      if (!representation) return { status: 204, body: null, contentRange: wantCount ? `*/${keys.length}` : null };
      const { rows } = await runSelect(conn, { t, nodes, filters: { ...filters, own: [] } }, actor, { count: false, head: false, pkIn: keys });
      return respond(rows, wantCount ? keys.length : null, 200);
    }
    case 'DELETE': {
      const sql = new Sql();
      const { where } = whereFor(plan, actor, sql, 'DELETE');
      const keys = await pkOf(conn, t, where);
      const before = representation ? (await runSelect(conn, { t, nodes, filters: { ...filters, own: [] } }, actor, { count: false, head: false, pkIn: keys })).rows : [];
      if (keys.length) {
        const del = new Sql();
        await conn.query(`DELETE FROM ${q(t.base)} WHERE ${pkInSql(t, t.base, keys, del)}`);
      }
      if (!representation) return { status: 204, body: null, contentRange: wantCount ? `*/${keys.length}` : null };
      return respond(before, wantCount ? keys.length : null, 200);
    }
    default:
      return fail(405, 'PGRST117', `Unsupported HTTP method: ${req.method}`);
  }
}

// ---------------------------------------------------------------- hata eşleme

interface MysqlError {
  readonly errno?: number;
  readonly sqlState?: string;
  readonly sqlMessage?: string;
  readonly message: string;
}

/** MariaDB hatası → PostgreSQL/PostgREST kodu (modüller 23505, 23514, 42501… koduna bakar). */
export function mapError(cause: unknown): RestError {
  if (cause instanceof RestFailure) return cause.error;
  if (cause instanceof RestParseError) return { status: 400, code: 'PGRST100', message: cause.message, details: null, hint: null };
  const e = cause as MysqlError;
  const msg = e.sqlMessage ?? e.message;
  const out = (status: number, code: string, message: string): RestError => ({ status, code, message, details: msg, hint: null });
  switch (e.errno) {
    case 1062: {
      const key = /for key '(?:[^.']+\.)?([^']+)'/.exec(msg)?.[1] ?? '';
      return out(409, '23505', `duplicate key value violates unique constraint "${key}"`);
    }
    case 1451:
    case 1452: {
      const name = /CONSTRAINT `([^`]+)`/.exec(msg)?.[1] ?? '';
      return out(409, '23503', `insert or update on table violates foreign key constraint "${name}"`);
    }
    case 4025: {
      const name = /CONSTRAINT `([^`]+)`/.exec(msg)?.[1] ?? '';
      return out(400, '23514', `new row violates check constraint "${name}"`);
    }
    case 1048:
    case 1364:
      return out(400, '23502', `null value violates not-null constraint: ${msg}`);
    case 1406:
      return out(400, '22001', 'value too long for type');
    case 1292:
    case 1366:
    case 1411:
      return out(400, '22P02', `invalid input syntax: ${msg}`);
    case 3140:
    case 4038:
      return out(400, '22P02', `invalid input syntax for type json: ${msg}`);
    default:
      // SIGNAL SQLSTATE '…' (tetikleyici ve fonksiyon hataları) kodunu aynen taşır
      if (e.sqlState && e.sqlState !== 'HY000' && !e.sqlState.startsWith('42S') && e.errno === 1644) return out(e.sqlState === '42501' ? 403 : 400, e.sqlState, msg);
      return out(500, 'XX000', msg);
  }
}
