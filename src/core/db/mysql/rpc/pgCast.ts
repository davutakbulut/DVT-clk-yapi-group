// PostgreSQL ifade ve tür dönüşümlerinin JS karşılıkları (K-116): plpgsql gövdeleri birebir taşınsın diye.
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { Actor } from '../pool';
import { SCHEMA } from '../schema.generated';
import { RpcError } from './registry';

export type Row = Record<string, unknown>;
export const select = async <T = Row>(conn: PoolConnection, sql: string, params: unknown[] = []) => (await conn.query<RowDataPacket[]>(sql, params))[0] as T[];
export const exec = async (conn: PoolConnection, sql: string, params: unknown[] = []) => (await conn.query<ResultSetHeader>(sql, params))[0];

export const isObject = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v);

/** jsonb::text biçimi (", " ve ": " ayraçlı); uzunluk sınırı Postgres'teki gibi ölçülsün. */
export function jsonbText(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(jsonbText).join(', ')}]`;
  if (isObject(v)) return `{${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${jsonbText(x)}`).join(', ')}}`;
  return JSON.stringify(v ?? null);
}
/** jsonb ->> : metin dışı değer JSON metni olur, null → null. */
export const txt = (p: Row, key: string): string | null => {
  const v = p[key];
  return v == null ? null : typeof v === 'string' ? v : jsonbText(v);
};
/** btrim yalnız boşluk kırpar (trim() sekme/satır sonunu da alırdı). */
export const btrim = (s: string) => s.replace(/^ +| +$/g, '');
export const nullif = (s: string | null) => (s === '' ? null : s);
/** nullif(btrim(x), '') — formların en sık kalıbı. */
export const clean = (s: string | null) => (s == null ? null : nullif(btrim(s)));
/** length(): kod noktası sayar. */
export const charLen = (s: string) => [...s].length;
/** pg_column_size(jsonb) yaklaşığı: JSON metninin bayt boyu. */
export const jsonSize = (v: unknown) => Buffer.byteLength(JSON.stringify(v ?? null));
/** lower(): 'tr' yerelinde I → ı olur, e-posta eşleşmesi bozulurdu. */
export const lower = (s: string) => s.toLocaleLowerCase('en');

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
/** ::uuid — geçersizse 22P02; tireli küçük harfe çevrilir (UUID sütunu ve JSON dizilerindeki biçim). */
export function toUuid(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v);
  if (!UUID_RE.test(s)) throw new RpcError('22P02', `invalid input syntax for type uuid: "${s.slice(0, 64)}"`);
  const h = lower(s.replace(/-/g, ''));
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
/** ::boolean (Postgres girdi kuralları: büyük/küçük harf duyarsız, tekil önekler). */
export function toBool(s: string | null): boolean | null {
  if (s == null) return null;
  const v = lower(s.trim());
  if (v && ('true'.startsWith(v) || 'yes'.startsWith(v) || v === 'on' || v === '1')) return true;
  if (v && ('false'.startsWith(v) || 'no'.startsWith(v) || v === 'off' || v === 'of' || v === '0')) return false;
  throw new RpcError('22P02', `invalid input syntax for type boolean: "${s.slice(0, 64)}"`);
}
/** ::numeric */
export function toNumeric(s: string | null): number | null {
  if (s == null) return null;
  if (!/^\s*[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?\s*$/i.test(s)) throw new RpcError('22P02', `invalid input syntax for type numeric: "${s.slice(0, 64)}"`);
  return Number(s);
}
/** ::integer */
export function toInt(s: string | null): number | null {
  if (s == null) return null;
  if (!/^\s*[+-]?\d+\s*$/.test(s)) throw new RpcError('22P02', `invalid input syntax for type integer: "${s.slice(0, 64)}"`);
  return Number(s);
}

/** jsonb ->> yolu SQL'de: JSON null → NULL, metin tırnaksız. */
export const jsonText = (col: string, path: string) => `IF(JSON_TYPE(JSON_EXTRACT(${col}, ${path})) = 'NULL', NULL, JSON_UNQUOTE(JSON_EXTRACT(${col}, ${path})))`;

/** site_settings 'contact.email' (#>> '{}' + btrim + nullif). */
export async function companyEmail(conn: PoolConnection): Promise<string | null> {
  const [r] = await select<{ v: string | null }>(conn, `SELECT ${jsonText('value', "'$'")} AS v FROM site_settings WHERE \`key\` = 'contact.email'`);
  return clean(r?.v ?? null);
}

/** PostgREST: EXECUTE yetkisi olmayan rol → 42501 (oturumsuzda 401, oturumluda 403). */
export const denied = (actor: Actor, message: string) => new RpcError('42501', message, actor.kind === 'anon' ? 401 : 403);
export const noExecute = (actor: Actor, fn: string) => denied(actor, `permission denied for function ${fn}`);
export const invalid = (message: string) => new RpcError('22023', message);
export const uid = (actor: Actor) => (actor.kind === 'user' ? actor.userId : null);

/** Sunucu saati UTC 'YYYY-MM-DD HH:MM:SS.ffffff'; plpgsql now() = transaction başı, işleyici başına bir kez alınır. */
export const dbNow = () => `${new Date().toISOString().slice(0, 23).replace('T', ' ')}000`;

/** to_jsonb(satır) karşılığı: boolean true/false, zaman ISO +00:00 (PostgREST biçimi). */
export function pgRow(table: string, row: Row): Row {
  const cols = SCHEMA[table]?.cols ?? {};
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    const kind = cols[k];
    out[k] = v == null ? null : kind === 'bool' ? Boolean(v) : kind === 'ts' ? `${String(v).replace(' ', 'T')}+00:00` : v;
  }
  return out;
}
