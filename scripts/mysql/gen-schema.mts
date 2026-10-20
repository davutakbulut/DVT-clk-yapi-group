// PostgreSQL envanterinden (pg-inventory.json) MariaDB şeması + sorgu katmanı için sütun/ilişki haritası üretir (K-116).
//   node scripts/mysql/gen-schema.mts
// Çıktılar: db/migrations/0001_schema.sql · src/core/db/mysql/schema.generated.ts · scripts/mysql/untranslated.txt
// Çevrilemeyen CHECK kuralları (app_private fonksiyonu, dizi operatörü…) untranslated.txt'ye yazılır: doğrulama uygulama katmanında (zod).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Col = { t: string; c: string; udt: string; n: 'YES' | 'NO'; d: string | null; np: number | null; ns: number | null };
type Con = { t: string; name: string; type: 'p' | 'u' | 'f' | 'c' | 'n'; def: string };
type Idx = { t: string; name: string; def: string };

const root = join(import.meta.dirname, '..', '..');
const inv = JSON.parse(readFileSync(join(import.meta.dirname, 'pg-inventory.json'), 'utf8')) as { columns: Col[]; constraints: Con[]; indexes: Idx[] };
const untranslated: string[] = [];

const tables = [...new Set(inv.columns.map((c) => c.t))].sort();
const cols = (t: string) => inv.columns.filter((c) => c.t === t);
const cons = (t: string, type: Con['type']) => inv.constraints.filter((c) => c.t === t && c.type === type);
const RESERVED = new Set(['key', 'usage', 'position']);
const q = (n: string) => `\`${n}\``;
/** CHECK ifadesinde ayrılmış sütun adlarını tırnaklar (tek tırnaklı dizelerin dışında). */
const quoteReserved = (sql: string) => sql.split(/('(?:[^']|'')*')/).map((part, i) => (i % 2 ? part : part.replace(/"([a-z_]+)"/g, '$1').replace(/\b([a-z_]+)\b/g, (w) => (RESERVED.has(w) ? q(w) : w)))).join('');
const listCols = (def: string) => (/\(([^)]*)\)/.exec(def)?.[1] ?? '').split(',').map((s) => s.trim().replace(/"/g, ''));

// İndekslenen/anahtar olan metin sütunları VARCHAR olmalı (MariaDB TEXT'i uzunluksuz indekslemez).
const keyed = new Set<string>();
for (const c of inv.constraints) if (c.type === 'p' || c.type === 'u' || c.type === 'f') for (const k of listCols(c.def)) keyed.add(`${c.t}.${k}`);
for (const i of inv.indexes) if (!/\(\(/.test(i.def)) for (const k of listCols(i.def.slice(i.def.indexOf(' USING ')))) keyed.add(`${i.t}.${k.replace(/ (DESC|ASC)$/, '')}`);

const JSON_KINDS = new Set(['jsonb', 'json', '_text', '_uuid', '_numeric']);
export type Kind = 'uuid' | 'text' | 'json' | 'bool' | 'int' | 'num' | 'ts' | 'date';
function kind(udt: string): Kind {
  if (udt === 'uuid') return 'uuid';
  if (JSON_KINDS.has(udt)) return 'json';
  if (udt === 'bool') return 'bool';
  if (udt === 'int2' || udt === 'int4' || udt === 'int8') return 'int';
  if (udt === 'numeric') return 'num';
  if (udt === 'timestamptz') return 'ts';
  if (udt === 'date') return 'date';
  return 'text';
}

function sqlType(c: Col): string {
  switch (c.udt) {
    case 'uuid': return 'UUID';
    case 'text': return keyed.has(`${c.t}.${c.c}`) ? 'VARCHAR(255)' : 'MEDIUMTEXT';
    case 'bool': return 'BOOLEAN';
    case 'int2': return 'SMALLINT';
    case 'int4': return 'INT';
    case 'int8': return 'BIGINT';
    case 'numeric': return `DECIMAL(${c.np ?? 20},${c.ns ?? 6})`;
    case 'timestamptz': return 'DATETIME(6)';
    case 'date': return 'DATE';
    default: if (JSON_KINDS.has(c.udt)) return 'JSON';
  }
  throw new Error(`Bilinmeyen tür ${c.t}.${c.c}: ${c.udt}`);
}

function sqlDefault(c: Col): string | null {
  const d = c.d;
  if (d == null) return null;
  if (d === 'gen_random_uuid()') return 'UUID_v4()';
  if (d === 'now()') return 'CURRENT_TIMESTAMP(6)';
  if (d === 'CURRENT_DATE') return '(CURRENT_DATE)';
  if (d === '(CURRENT_DATE + 365)') return '(CURRENT_DATE + INTERVAL 365 DAY)';
  if (d === 'true' || d === 'false') return d.toUpperCase();
  if (/^-?\d+(\.\d+)?$/.test(d)) return d;
  if (d.startsWith('substr(replace((gen_random_uuid())::text')) return "(SUBSTR(REPLACE(UUID_v4(), '-', ''), 1, 10))";
  const lit = /^'(.*)'::(text|jsonb|text\[\]|uuid\[\]|numeric\[\])$/s.exec(d);
  if (lit) {
    const [, v, t] = lit;
    if (t!.endsWith('[]')) return `('${JSON.stringify(v === '{}' ? [] : v!.slice(1, -1).split(','))}')`;
    return t === 'jsonb' ? `('${v}')` : `'${v}'`;
  }
  throw new Error(`Çevrilemeyen varsayılan ${c.t}.${c.c}: ${d}`);
}

// app_private doğrulama fonksiyonlarının satır içi karşılıkları (MariaDB CHECK saklı fonksiyon çağıramaz). Kaynak: 0001, 0053, 0055, 0060.
// (?-i): PostgreSQL ~ büyük/küçük harfe duyarlı; MariaDB REGEXP _ci harmanlamada duyarsız.
const RESERVED_SLUGS = "'kategori','category','etiket','tag','arama','search','sayfa','page','403','api'";
const slugOk = (e: string) => `COALESCE(${e} REGEXP '(?-i)^[a-z0-9]+(-[a-z0-9]+)*$' AND CHAR_LENGTH(${e}) <= 80 AND ${e} NOT IN (${RESERVED_SLUGS}), FALSE)`;
const has = (arr: string, v: string) => `JSON_CONTAINS(${arr}, '"${v}"')`;
const localesOk = (arr: string) => `(JSON_TYPE(${arr}) = 'ARRAY' AND JSON_LENGTH(${arr}) = ${has(arr, 'tr')} + ${has(arr, 'en')})`;
const INLINE: [RegExp, (...a: string[]) => string][] = [
  [/app_private\.is_valid_slug_map\(([a-z_]+)\)/g, (_, s) => `COALESCE(JSON_TYPE(${s}) = 'OBJECT' AND JSON_LENGTH(${s}) = JSON_CONTAINS_PATH(${s}, 'one', '$.tr') + JSON_CONTAINS_PATH(${s}, 'one', '$.en') AND ${slugOk(`JSON_VALUE(${s}, '$.tr')`)} AND (JSON_VALUE(${s}, '$.en') IS NULL OR ${slugOk(`JSON_VALUE(${s}, '$.en')`)}), FALSE)`],
  [/app_private\.is_publishable\(([a-z_]+), (NULL::jsonb|[a-z_]+), "?([a-z_]+)"?, ([a-z_]+)\)/g, (_, l, s, t, m) =>
    `COALESCE(${localesOk(l)} AND (NOT ${has(l, 'tr')} OR NULLIF(JSON_VALUE(${t}, '$.tr'), '') IS NOT NULL) AND (NOT ${has(l, 'en')} OR (NULLIF(JSON_VALUE(${t}, '$.en'), '') IS NOT NULL${s === 'NULL::jsonb' ? '' : ` AND (${s} IS NULL OR JSON_VALUE(${s}, '$.en') IS NOT NULL)`} AND COALESCE(JSON_VALUE(${m}, '$.en.reviewed') IN ('1', 'true'), FALSE))), FALSE)`],
  [/app_private\.is_content_type\(([a-z_]+)\)/g, (_, x) => `${x} IN ('service','product','product_category','solution','price_guide','project','project_category','blog_post','static_page','job_posting','configurator_page')`],
  [/app_private\.is_drawing_key\(([a-z_]+)\)/g, (_, x) => `(${x} IS NULL OR ${x} IN ('konut','cati','kentsel','endustri','betonarme','epoksi','alcipan','tadilat','peyzaj','proje'))`],
  [/app_private\.is_category_icon_key\(([a-z_]+)\)/g, (_, x) => `(${x} IS NULL OR ${x} IN ('profile','sheet','rebar','panel','insulation','board','drywall','wall','cement','generic'))`],
  [/\(([a-z_]+) <@ ARRAY\['tr'::text, 'en'::text\]\)/g, (_, x) => localesOk(x)],
];

/** PostgreSQL CHECK ifadesini MariaDB'ye çevirir; çevrilemezse null. */
export function translateCheck(def: string): string | null {
  let s = def.replace(/^CHECK /, '');
  for (const [re, fn] of INLINE) s = s.replace(re, fn as (...a: string[]) => string);
  if (/app_private\.|public\.|<@|@>|&&|ARRAY\[[^\]]*\] *\)|cardinality|array_length|jsonb_array_length|jsonb_object_keys/.test(s.replace(/= ANY \(ARRAY\[[^\]]*\]\)/g, ''))) return null;
  s = s.replace(/= ANY \(ARRAY\[([^\]]*)\]\)/g, (_, list: string) => `IN (${list})`);
  s = s.replace(/::(text|numeric|jsonb|integer|bigint|smallint|double precision|timestamp with time zone|date)\b/g, '');
  s = s.replace(/\(\s*([a-z_]+)\s*->>\s*('[^']*')\s*\)/g, (_, col: string, key: string) => `JSON_VALUE(${col}, '$.${key.slice(1, -1)}')`);
  s = s.replace(/\b([a-z_]+)\s*->>\s*('[^']*')/g, (_, col: string, key: string) => `JSON_VALUE(${col}, '$.${key.slice(1, -1)}')`);
  s = s.replace(/jsonb_typeof\(([a-z_]+)\) = '([a-z]+)'/g, (_, col: string, t: string) => `JSON_TYPE(${col}) = '${t.toUpperCase()}'`);
  s = s.replace(/\bbtrim\(/g, 'TRIM(').replace(/ (!?)~ '/g, (_, neg: string) => ` ${neg ? 'NOT ' : ''}REGEXP '(?-i)`);
  s = s.replace(/\(([^()]+) IS DISTINCT FROM ([^()]+)\)/g, '(NOT ($1 <=> $2))');
  s = s.replace(/\bnow\(\)/g, 'CURRENT_TIMESTAMP(6)').replace(/\bpg_column_size\(/g, 'LENGTH(');
  if (/->|::|~\*|ILIKE|similar to|make_interval|jsonb|IS DISTINCT/i.test(s)) return null;
  // MariaDB dize sabitinde \ kaçış karakteri (PostgreSQL standard_conforming_strings'te değil): regex'teki \s, \d, \+ korunmalı
  return s.replace(/\\/g, '\\\\');
}

/** `((slug ->> 'tr'::text))` gibi ifade indeksleri → STORED üretilmiş sütun adı + ifadesi. */
function exprColumn(expr: string): { name: string; sql: string } | null {
  const m = /^\(\(([a-z_]+) ->> '([a-z]+)'::text\)\)$/.exec(expr.trim());
  if (m) return { name: `${m[1]}_${m[2]}`, sql: `VARCHAR(255) AS (JSON_VALUE(${m[1]}, '$.${m[2]}')) STORED` };
  const l = /^lower\(([a-z_]+)\)$/.exec(expr.trim());
  if (l) return { name: `${l[1]}_lower`, sql: `VARCHAR(255) AS (LOWER(${l[1]})) STORED` };
  return null;
}

const out: string[] = [
  '-- K-116 · MariaDB şeması. Üretici: scripts/mysql/gen-schema.mts (PostgreSQL envanterinden). Elle düzenlemeyin — üreticiyi düzeltin.',
  'SET NAMES utf8mb4;',
  'SET time_zone = \'+00:00\';',
  '',
  // auth.users karşılığı (K-116: kendi giriş sistemimiz)
  `CREATE TABLE users (
  id UUID NOT NULL DEFAULT UUID_v4(),
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NULL,
  email_confirmed_at DATETIME(6) NULL,
  last_sign_in_at DATETIME(6) NULL,
  meta JSON NOT NULL DEFAULT ('{}'),
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY users_email_uq (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;`,
  '',
];
const fks: string[] = [];
const meta: Record<string, { pk: string[]; cols: Record<string, Kind>; fks: { name: string; cols: string[]; ref: string; refCols: string[] }[] }> = {};

for (const t of tables) {
  const lines: string[] = [];
  const tcols = cols(t);
  const hasUpdatedAt = tcols.some((c) => c.c === 'updated_at' && c.udt === 'timestamptz');
  for (const c of tcols) {
    const def = sqlDefault(c);
    const onUpdate = hasUpdatedAt && c.c === 'updated_at' ? ' ON UPDATE CURRENT_TIMESTAMP(6)' : '';
    lines.push(`  ${q(c.c)} ${sqlType(c)} ${c.n === 'NO' ? 'NOT NULL' : 'NULL'}${def ? ` DEFAULT ${def}` : ''}${onUpdate}`);
  }
  const extra: string[] = [];
  for (const p of cons(t, 'p')) extra.push(`  PRIMARY KEY (${listCols(p.def).map(q).join(', ')})`);
  for (const u of cons(t, 'u')) extra.push(`  UNIQUE KEY ${u.name} (${listCols(u.def).map(q).join(', ')})`);
  for (const c of cons(t, 'c')) {
    const sql = translateCheck(c.def);
    // REGEXP'e giren JSON_VALUE açıkça metne: boş değerde MariaDB REGEXP'i yanlış sonuç / 'NULL argument passed' verir (0006)
    const fixed = sql && /REGEXP/.test(sql) ? sql.replace(/JSON_VALUE\((\w+), ('\$\.\w+')\)/g, 'CAST(JSON_VALUE($1, $2) AS CHAR CHARACTER SET utf8mb4)') : sql;
    if (fixed) extra.push(`  CONSTRAINT ${c.name} CHECK ${quoteReserved(fixed.startsWith('(') ? fixed : `(${fixed})`)}`);
    else untranslated.push(`${t}.${c.name}: ${c.def}`);
  }
  const conNames = new Set(inv.constraints.filter((c) => c.t === t).map((c) => c.name));
  for (const i of inv.indexes.filter((x) => x.t === t && !conNames.has(x.name))) {
    const unique = i.def.startsWith('CREATE UNIQUE');
    const [head, where] = i.def.split(' WHERE ');
    const list = /USING btree \((.*)\)$/.exec(head!)?.[1];
    if (!list) { untranslated.push(`${t} indeks: ${i.def}`); continue; }
    // tek ifade (slug ->> 'tr' / lower(email)) → üretilmiş sütun; kısmi benzersiz "WHERE x IS NOT NULL" MariaDB'de zaten öyle (NULL'lar çakışmaz)
    const parts = list.split(/,(?![^(]*\))/).map((s) => s.trim());
    const keys = parts.map((p) => {
      if (!p.startsWith('(') && !p.startsWith('lower(')) return p.replace(/^([a-z_]+)/, (n) => q(n));
      const g = exprColumn(p.startsWith('lower(') ? p : p);
      if (!g) throw new Error(`İfade indeksi çevrilemedi: ${i.def}`);
      if (!lines.some((l) => l.startsWith(`  ${g.name} `))) lines.push(`  ${g.name} ${g.sql}`);
      return g.name;
    });
    if (unique && where && !/IS NOT NULL\)*$/.test(where)) {
      // hero_media: "yalnız bir etkin" → etkin değilken NULL olan üretilmiş sütun
      const flag = `${keys[0]!.replace(/`/g, "")}_uq_flag`;
      lines.push(`  ${flag} TINYINT AS (IF(${keys[0]}, 1, NULL)) STORED`);
      extra.push(`  UNIQUE KEY ${i.name} (${flag})`);
      continue;
    }
    extra.push(`  ${unique ? 'UNIQUE KEY' : 'KEY'} ${i.name} (${keys.map((k) => (k.startsWith('`') ? k : q(k))).join(', ')})`);
  }
  out.push(`CREATE TABLE ${t} (\n${[...lines, ...extra].join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;`, '');
  const tfks: { name: string; cols: string[]; ref: string; refCols: string[] }[] = [];
  for (const f of cons(t, 'f')) {
    const m = /FOREIGN KEY \(([^)]*)\) REFERENCES ([a-z_.]+)\(([^)]*)\)(.*)$/.exec(f.def)!;
    const ref = m[2] === 'auth.users' ? 'users' : m[2]!.replace(/^public\./, '');
    const onDelete = /ON DELETE (CASCADE|SET NULL|RESTRICT)/.exec(m[4] ?? '')?.[0] ?? '';
    fks.push(`ALTER TABLE ${t} ADD CONSTRAINT ${f.name} FOREIGN KEY (${m[1]!.split(', ').map(q).join(', ')}) REFERENCES ${ref} (${m[3]!.split(', ').map(q).join(', ')}) ${onDelete};`.replace(/ ;$/, ';'));
    tfks.push({ name: f.name, cols: m[1]!.split(',').map((s) => s.trim()), ref, refCols: m[3]!.split(',').map((s) => s.trim()) });
  }
  meta[t] = { pk: cons(t, 'p').flatMap((p) => listCols(p.def)), cols: Object.fromEntries(tcols.map((c) => [c.c, kind(c.udt)])), fks: tfks };
}
meta.users = { pk: ['id'], cols: { id: 'uuid', email: 'text', password_hash: 'text', email_confirmed_at: 'ts', last_sign_in_at: 'ts', meta: 'json', created_at: 'ts', updated_at: 'ts' }, fks: [] };

mkdirSync(join(root, 'db/migrations'), { recursive: true });
mkdirSync(join(root, 'src/core/db/mysql'), { recursive: true });
writeFileSync(join(root, 'db/migrations/0001_schema.sql'), [...out, '-- Yabancı anahtarlar (tablolar oluştuktan sonra)', ...fks, ''].join('\n'));
writeFileSync(
  join(root, 'src/core/db/mysql/schema.generated.ts'),
  `// Üretici: scripts/mysql/gen-schema.mts — elle düzenlemeyin (K-116).\n// Sütun türleri sonuç dönüşümü (JSON/boolean/sayı/tarih) için, yabancı anahtarlar gömülü ilişkiler için.\nexport type ColumnKind = 'uuid' | 'text' | 'json' | 'bool' | 'int' | 'num' | 'ts' | 'date';\nexport interface TableMeta {\n  readonly pk: readonly string[];\n  readonly cols: Readonly<Record<string, ColumnKind>>;\n  readonly fks: readonly { readonly name: string; readonly cols: readonly string[]; readonly ref: string; readonly refCols: readonly string[] }[];\n}\nexport const SCHEMA: Readonly<Record<string, TableMeta>> = ${JSON.stringify(meta, null, 1)};\n`,
);
writeFileSync(join(import.meta.dirname, 'untranslated.txt'), untranslated.join('\n') + '\n');
console.log(`${tables.length + 1} tablo, ${fks.length} yabancı anahtar, ${untranslated.length} çevrilemeyen kural`);
