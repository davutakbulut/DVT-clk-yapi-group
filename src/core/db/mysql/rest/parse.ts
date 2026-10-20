// PostgREST istek dilinin (postgrest-js'in ürettiği) ayrıştırıcısı (K-116). Saf fonksiyonlar: SQL üretmez.
// Kapsam: select ağacı (takma ad, JSON yolu, gömülü ilişki + !ipucu/!inner, count), filtreler (not., or/and), order, limit/offset.

export interface ColumnNode {
  readonly kind: 'column';
  readonly column: string;
  /** `name->tr` / `name->>tr` yolu: [anahtar, metin mi] çiftleri */
  readonly path: readonly { readonly key: string; readonly text: boolean }[];
  readonly alias: string;
}
export interface EmbedNode {
  readonly kind: 'embed';
  readonly relation: string;
  readonly alias: string;
  readonly hint: string | null;
  readonly inner: boolean;
  readonly children: readonly SelectNode[];
}
export interface StarNode {
  readonly kind: 'star';
}
export interface CountNode {
  readonly kind: 'count';
  readonly alias: string;
}
export type SelectNode = ColumnNode | EmbedNode | StarNode | CountNode;

/** Virgülle böler; parantez ve çift tırnak içini korur. */
export function splitTop(input: string, sep = ','): string[] {
  const out: string[] = [];
  let depth = 0;
  let quoted = false;
  let cur = '';
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (ch === '"' && input[i - 1] !== '\\') quoted = !quoted;
    if (!quoted) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      else if (ch === sep && depth === 0) {
        out.push(cur);
        cur = '';
        continue;
      }
    }
    cur += ch;
  }
  if (cur.length) out.push(cur);
  return out.map((s) => s.trim()).filter((s) => s.length);
}

/** `col`, `col->a->>b`, `col::text` → sütun + yol. */
export function parseColumnRef(ref: string): { column: string; path: ColumnNode['path'] } {
  const clean = ref.replace(/::[a-z0-9_ ]+$/i, '').trim();
  const parts = clean.split(/(->>|->)/);
  const column = parts[0]!.trim();
  const path: { key: string; text: boolean }[] = [];
  for (let i = 1; i < parts.length; i += 2) path.push({ key: parts[i + 1]!.trim().replace(/^'|'$/g, ''), text: parts[i] === '->>' });
  return { column, path };
}

export function parseSelect(input: string): SelectNode[] {
  return splitTop(input.replace(/\s+/g, ' ')).map((item): SelectNode => {
    if (item === '*') return { kind: 'star' };
    const open = item.indexOf('(');
    if (open > 0 && item.endsWith(')')) {
      const head = item.slice(0, open).trim();
      const body = item.slice(open + 1, -1);
      const colon = head.indexOf(':');
      const alias = colon > 0 ? head.slice(0, colon).trim() : null;
      const target = (colon > 0 ? head.slice(colon + 1) : head).trim();
      // "count()" toplamı (ör. `menu_items(count)` gömüsünün içinde değil; kök düzeyde)
      if (target === 'count' && !body.trim()) return { kind: 'count', alias: alias ?? 'count' };
      const bits = target.split('!');
      const relation = bits[0]!.replace(/^\.\.\./, '');
      const inner = bits.slice(1).includes('inner');
      const hint = bits.slice(1).find((b) => b !== 'inner' && b !== 'left') ?? null;
      return { kind: 'embed', relation, alias: alias ?? relation, hint, inner, children: parseSelect(body) };
    }
    if (item === 'count') return { kind: 'count', alias: 'count' };
    // takma ad: "alias:col" — "::" tür dönüşümüyle karışmasın
    const m = /^([a-zA-Z_][a-zA-Z0-9_]*):(?!:)(.+)$/.exec(item);
    const alias = m ? m[1]! : null;
    const ref = parseColumnRef(m ? m[2]! : item);
    const lastKey = ref.path.length ? ref.path[ref.path.length - 1]!.key : ref.column;
    return { kind: 'column', column: ref.column, path: ref.path, alias: alias ?? lastKey };
  });
}

export type Operator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'is' | 'in' | 'cs' | 'cd' | 'ov' | 'match' | 'imatch';
const OPERATORS = new Set<string>(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'cs', 'cd', 'ov', 'match', 'imatch']);

export interface Condition {
  readonly kind: 'cond';
  readonly column: string;
  readonly path: ColumnNode['path'];
  readonly op: Operator;
  readonly negate: boolean;
  readonly value: string;
}
export interface Logic {
  readonly kind: 'logic';
  readonly op: 'and' | 'or';
  readonly negate: boolean;
  readonly items: readonly Filter[];
}
export type Filter = Condition | Logic;

/** `not.eq.x` / `in.(a,b)` → işleç + değer. */
export function parseOperation(column: string, raw: string): Condition {
  let rest = raw;
  let negate = false;
  if (rest.startsWith('not.')) {
    negate = true;
    rest = rest.slice(4);
  }
  const dot = rest.indexOf('.');
  const op = dot < 0 ? rest : rest.slice(0, dot);
  if (!OPERATORS.has(op)) throw new RestParseError(`Bilinmeyen işleç: ${op}`);
  const ref = parseColumnRef(column);
  return { kind: 'cond', column: ref.column, path: ref.path, op: op as Operator, negate, value: dot < 0 ? '' : rest.slice(dot + 1) };
}

/** `or=(a.eq.1,and(b.gt.2,c.is.null))` değerinin gövdesi (parantez dahil). */
export function parseLogic(op: 'and' | 'or', negate: boolean, raw: string): Logic {
  if (!raw.startsWith('(') || !raw.endsWith(')')) throw new RestParseError(`Mantık ifadesi parantezsiz: ${raw}`);
  const items = splitTop(raw.slice(1, -1)).map((part): Filter => {
    const lm = /^(not\.)?(and|or)(\(.*\))$/s.exec(part);
    if (lm) return parseLogic(lm[2] as 'and' | 'or', !!lm[1], lm[3]!);
    // col.op.value — sütun JSON yolu içerebilir (a->>b), ilk "." işleç ayıracı değilse atla
    const m = /^([^.]+?)\.((?:not\.)?[a-z]+(?:\..*)?)$/s.exec(part);
    if (!m) throw new RestParseError(`Koşul çözülemedi: ${part}`);
    return parseOperation(m[1]!, m[2]!);
  });
  return { kind: 'logic', op, negate, items };
}

export interface OrderTerm {
  readonly column: string;
  readonly path: ColumnNode['path'];
  readonly desc: boolean;
  readonly nulls: 'first' | 'last' | null;
}
export function parseOrder(raw: string): OrderTerm[] {
  return splitTop(raw).map((term) => {
    const bits = term.split('.');
    // sütun JSON yolunda "." olmaz; son parçalar yön/null sırası
    const flags = new Set(bits.slice(1));
    const ref = parseColumnRef(bits[0]!);
    return { column: ref.column, path: ref.path, desc: flags.has('desc'), nulls: flags.has('nullsfirst') ? 'first' : flags.has('nullslast') ? 'last' : null };
  });
}

/** `in.(a,"b,c")` / `cs.{a,b}` listeleri. */
export function parseList(raw: string): string[] {
  const body = raw.replace(/^[({]/, '').replace(/[)}]$/, '');
  if (!body.trim()) return [];
  return splitTop(body).map((v) => (v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1).replace(/\\"/g, '"') : v));
}

export class RestParseError extends Error {}
