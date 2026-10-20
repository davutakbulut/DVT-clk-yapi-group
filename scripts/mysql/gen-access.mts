// PostgreSQL RLS kuralları + tablo yetkilerinden MariaDB sorgu katmanının erişim haritasını üretir (K-116).
//   node scripts/mysql/gen-access.mts   → src/core/db/mysql/access.generated.ts
// Kurallar MariaDB SQL koşuluna çevrilir; bağlantı değişkenleri @app_uid / @app_role (core/db/mysql/pool.ts) okunur.
// Bir kuralın EXISTS alt sorgusundaki tabloya o tablonun kendi SELECT kuralı eklenir (PostgreSQL'de alt sorguya da RLS uygulanır).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Policy = { t: string; name: string; cmd: 'ALL' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE'; roles: string; qual: string | null; with_check: string | null };
type Grant = { t: string; g: 'anon' | 'authenticated'; privs: string };
type ColGrant = { t: string; c: string; g: 'anon' | 'authenticated'; p: string };

const root = join(import.meta.dirname, '..', '..');
const inv = JSON.parse(readFileSync(join(import.meta.dirname, 'pg-inventory.json'), 'utf8')) as { policies: Policy[]; tableGrants: Grant[]; columnGrants: ColGrant[]; rls: { t: string }[] };
const ROLES = ['anon', 'authenticated'] as const;
type Role = (typeof ROLES)[number];
type Cmd = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

const list = (inner: string) => inner.split(',').map((s) => s.trim().replace(/::text$/, ''));

/** Tek kural ifadesini MariaDB'ye çevirir (alt sorgulara kural eklemeden). */
export function translate(expr: string): string {
  let s = expr.replace(/\s+/g, ' ');
  s = s.replace(/\( SELECT app_private\.has_role\(VARIADIC ARRAY\[([^\]]*)\]\) AS has_role\)/g, (_, l: string) => `(@app_role IN (${list(l).join(', ')}))`);
  s = s.replace(/\( SELECT app_private\.has_role\(VARIADIC '\{([^}]*)\}'::text\[\]\) AS has_role\)/g, (_, l: string) => `(@app_role IN (${l.split(',').map((x) => `'${x}'`).join(', ')}))`);
  s = s.replace(/\( SELECT auth\.uid\(\) AS uid\)|auth\.uid\(\)/g, '@app_uid');
  s = s.replace(/\( SELECT app_private\.user_role\(\) AS user_role\)/g, '@app_role');
  s = s.replace(/\brpc_gate_ok\(\)/g, 'TRUE'); // K-104 kapısı dış PostgREST'e karşıydı; MariaDB'ye yalnız uygulama sunucusu bağlanır
  s = s.replace(/\bnow\(\)/g, 'UTC_TIMESTAMP(6)');
  s = s.replace(/= ANY \(ARRAY\[([^\]]*)\]\)/g, (_, l: string) => `IN (${list(l).join(', ')})`);
  s = s.replace(/::(text|uuid|jsonb|numeric|integer|boolean)\b/g, '');
  if (/::|app_private\.|auth\.|ARRAY\[|->/.test(s)) throw new Error(`Çevrilemeyen kural: ${expr}`);
  return s;
}

/** Bir kuralın tamamı: (rol, komut) için izin veren kuralların OR'u; hiç yoksa null (= yasak). */
function combined(table: string, role: Role, cmd: Cmd, part: 'using' | 'check', depth = 0): string | null {
  if (depth > 4) throw new Error(`Kural döngüsü: ${table}`);
  const ps = inv.policies.filter((p) => p.t === table && (p.cmd === cmd || p.cmd === 'ALL') && /\{([^}]*)\}/.exec(p.roles)![1]!.split(',').some((r) => r === role || r === 'public'));
  const exprs = ps
    .map((p) => (part === 'check' ? (p.with_check ?? (cmd === 'INSERT' ? null : p.qual)) : p.qual))
    .filter((e): e is string => e != null)
    .map((e) => expandExists(translate(e), role, depth));
  if (!ps.length) return null;
  if (!exprs.length) return part === 'check' ? 'TRUE' : null;
  return exprs.length === 1 ? exprs[0]! : exprs.map((e) => `(${e})`).join(' OR ');
}

/** EXISTS ( SELECT 1 FROM t a [JOIN u b ON …] WHERE (…)) → alt sorgudaki her tabloya kendi SELECT kuralı. */
function expandExists(sql: string, role: Role, depth: number): string {
  const start = sql.indexOf('EXISTS ( SELECT 1 FROM ');
  if (start < 0) return sql;
  // alt sorgunun kapanış parantezini dengeleyerek bul (regex açgözlü eşleşmede dış parantezi yutuyordu)
  const open = start + 'EXISTS '.length;
  let depthP = 0;
  let close = -1;
  for (let i = open; i < sql.length; i++) {
    if (sql[i] === '(') depthP++;
    else if (sql[i] === ')' && --depthP === 0) { close = i; break; }
  }
  if (close < 0) throw new Error(`Dengesiz parantez: ${sql}`);
  const inner = sql.slice(open, close + 1);
  return sql.slice(0, start) + expandOne(inner, role, depth) + expandExists(sql.slice(close + 1), role, depth);
}

function expandOne(inner: string, role: Role, depth: number): string {
  if (!/^\( SELECT 1 FROM /.test(inner) || !/ WHERE /.test(inner)) throw new Error(`Tanınmayan EXISTS: ${inner}`);
  return inner.replace(/^\( SELECT 1 FROM \(?([a-z_]+) ([a-z]+)(?: JOIN ([a-z_]+) ([a-z]+) ON \(\((.*?)\)\)\))? WHERE (.*)\)$/, (_m, t1: string, a1: string, t2: string | undefined, a2: string | undefined, on: string | undefined, where: string) => {
    const extra: string[] = [];
    for (const [t, a] of [[t1, a1], [t2, a2]] as const) {
      if (!t || !a) continue;
      const p = combined(t, role, 'SELECT', 'using', depth + 1);
      if (p == null) return 'FALSE';
      if (p !== 'TRUE') extra.push(`(${p.replace(new RegExp(`\\b${t}\\.`, 'g'), `${a}.`)})`);
    }
    const from = t2 ? `${t1} ${a1} JOIN ${t2} ${a2} ON (${on})` : `${t1} ${a1}`;
    return `EXISTS (SELECT 1 FROM ${from} WHERE ${[where, ...extra].join(' AND ')})`;
  });
}

const tables = inv.rls.map((r) => r.t).concat([...new Set(inv.tableGrants.map((g) => g.t))].filter((t) => !inv.rls.some((r) => r.t === t)));
const out: Record<string, unknown> = {};
for (const t of tables) {
  const entry: Record<string, unknown> = {};
  for (const role of ROLES) {
    const key = role === 'anon' ? 'anon' : 'user';
    const privs = inv.tableGrants.find((g) => g.t === t && g.g === role)?.privs.split(',') ?? [];
    const cols = inv.columnGrants.filter((c) => c.t === t && c.g === role);
    const colPrivs = Object.fromEntries([...new Set(cols.map((c) => c.p))].map((p) => [p, cols.filter((c) => c.p === p).map((c) => c.c)]));
    const isView = !inv.rls.some((r) => r.t === t);
    entry[key] = {
      grants: privs,
      ...(Object.keys(colPrivs).length ? { columnGrants: colPrivs } : {}),
      // görünümler (views) RLS taşımaz: tanımları kendi koşulunu içerir
      select: isView ? 'TRUE' : combined(t, role, 'SELECT', 'using'),
      insert: isView ? 'TRUE' : combined(t, role, 'INSERT', 'check'),
      update: isView ? 'TRUE' : combined(t, role, 'UPDATE', 'using'),
      updateCheck: isView ? 'TRUE' : combined(t, role, 'UPDATE', 'check'),
      delete: isView ? 'TRUE' : combined(t, role, 'DELETE', 'using'),
    };
  }
  out[t] = entry;
}

writeFileSync(
  join(root, 'src/core/db/mysql/access.generated.ts'),
  `// Üretici: scripts/mysql/gen-access.mts — elle düzenlemeyin (K-116).
// PostgreSQL RLS kurallarının MariaDB karşılığı. null = kural yok → yasak (RLS varsayılanı). 'TRUE' = koşulsuz.
// grants: tablo yetkisi (PostgreSQL GRANT); yoksa komut "permission denied" ile reddedilir. service aktörü ikisini de atlar.
export interface RoleAccess {
  readonly grants: readonly string[];
  readonly columnGrants?: Readonly<Record<string, readonly string[]>>;
  readonly select: string | null;
  readonly insert: string | null;
  readonly update: string | null;
  readonly updateCheck: string | null;
  readonly delete: string | null;
}
export const ACCESS: Readonly<Record<string, { readonly anon: RoleAccess; readonly user: RoleAccess }>> = ${JSON.stringify(out, null, 1)};
`,
);
console.log(`${tables.length} tablo/görünüm`);
