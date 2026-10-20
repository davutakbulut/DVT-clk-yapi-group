// İçerik/analitik/konfigüratör RPC'lerinin ortak yardımcıları (K-116); genel dönüşümler pgCast.ts'te.
import { createHash } from 'node:crypto';
import { ACCESS } from '../access.generated';
import type { Actor } from '../pool';
import { denied, isObject, jsonbText, toUuid } from './pgCast';
import { RpcError } from './registry';

/** SECURITY DEFINER fonksiyonlar RLS'siz okurdu: `readable(DEFINER, …)` tabloyu süzmeden verir. */
export const DEFINER: Actor = { kind: 'service' };

/**
 * SECURITY INVOKER fonksiyonun okuduğu tablo: çağıranın RLS okuma kuralıyla süzülmüş türetilmiş tablo (takma adı çağıran verir).
 * PostgreSQL alt sorgulara da RLS uygular; her tablo bu yoldan okunur.
 */
export function readable(actor: Actor, table: string): string {
  if (actor.kind === 'service') return `\`${table}\``;
  const access = ACCESS[table]?.[actor.kind === 'anon' ? 'anon' : 'user'];
  if (!access?.grants.includes('SELECT')) throw denied(actor, `permission denied for table ${table}`);
  return `(SELECT * FROM \`${table}\` WHERE ${access.select ?? 'FALSE'})`;
}

/** UPDATE için RLS: okuma + USING koşulu ve WITH CHECK. Yetki yoksa 42501. */
export function updatable(actor: Actor, table: string): { using: string; check: string } {
  if (actor.kind === 'service') return { using: 'TRUE', check: 'TRUE' };
  const access = ACCESS[table]?.[actor.kind === 'anon' ? 'anon' : 'user'];
  if (!access?.grants.includes('UPDATE')) throw denied(actor, `permission denied for table ${table}`);
  return { using: `(${access.select ?? 'FALSE'}) AND (${access.update ?? 'FALSE'})`, check: access.updateCheck ?? 'FALSE' };
}

/** `x->'a'->'b'`: nesne olmayan düzeyde undefined (PostgreSQL null). */
export const at = (v: unknown, ...keys: string[]): unknown => keys.reduce<unknown>((o, k) => (isObject(o) ? o[k] : undefined), v);
/** `x->'a'->>'b'`: metin; metin değilse jsonb metni; yok/null → null. */
export const textAt = (v: unknown, ...keys: string[]): string | null => {
  const x = at(v, ...keys);
  return x == null ? null : typeof x === 'string' ? x : jsonbText(x);
};

/** left(s, n): kod noktasıyla. */
export const left = (s: string | null, n: number): string | null => (s == null ? null : Array.from(s).slice(0, n).join(''));
/** PostgreSQL lower() (UTF-8 yerel ayarı): 'İ' → 'i'; toLocaleLowerCase('en') 'i̇' (birleşen nokta) üretirdi. */
export const pgLower = (s: string): string => s.replace(/İ/g, 'i').toLocaleLowerCase('en');
export const md5 = (s: string): string => createHash('md5').update(s).digest('hex');

/** date parametresi: 'YYYY-MM-DD' ya da null. */
export function dateOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v);
  if (!/^\d{4}-\d\d-\d\d$/.test(s)) throw new RpcError('22007', `invalid input syntax for type date: "${s.slice(0, 64)}"`);
  return s;
}
/** uuid[] parametresi (JSON dizi). */
export function uuidList(v: unknown): string[] {
  if (v == null) return [];
  if (!Array.isArray(v)) throw new RpcError('22P02', 'malformed array literal');
  return v.map((x) => toUuid(x)).filter((x): x is string => x !== null);
}
/** jsonb_array_elements(x): null → satır yok, dizi değilse hata. */
export function elements(v: unknown): unknown[] {
  if (v == null) return [];
  if (!Array.isArray(v)) throw new RpcError('22023', 'cannot extract elements from a scalar');
  return v;
}
/** ISO zaman girdisi (::timestamptz); geçersizse 22007. */
export function tsOrNull(v: string | null, toDb: (s: string) => string): string | null {
  if (v == null) return null;
  try {
    return toDb(v);
  } catch {
    throw new RpcError('22007', `invalid input syntax for type timestamp with time zone: "${v.slice(0, 64)}"`);
  }
}
