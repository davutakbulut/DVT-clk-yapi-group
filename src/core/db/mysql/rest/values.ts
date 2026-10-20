// PostgREST (PostgreSQL) değerleri ↔ MariaDB değerleri (K-116).
import type { ColumnKind } from '../schema.generated';

/** ISO zaman (ofsetli/ofsetsiz, mikro saniyeli) → UTC 'YYYY-MM-DD HH:MM:SS.ffffff'. Date mikro saniyeyi kaybettiği için kesir ayrı taşınır. */
export function toDbTimestamp(value: string | Date): string {
  if (value instanceof Date) return `${value.toISOString().slice(0, 23).replace('T', ' ')}000`;
  const m = /^(\d{4})-(\d\d)-(\d\d)(?:[T ](\d\d):(\d\d)(?::(\d\d)(?:\.(\d+))?)?)?\s*(Z|[+-]\d\d(?::?\d\d)?)?$/.exec(value.trim());
  if (!m) throw new TypeError(`Tanınmayan zaman değeri: ${value}`);
  const [, y, mo, d, h = '0', mi = '0', se = '0', frac = '', tz = 'Z'] = m;
  const off = tz === 'Z' ? 0 : (tz[0] === '-' ? -1 : 1) * (Number(tz.slice(1, 3)) * 60 + (tz.length > 3 ? Number(tz.slice(-2)) : 0));
  const t = new Date(Date.UTC(+y!, +mo! - 1, +d!, +h, +mi - off, +se));
  return `${t.toISOString().slice(0, 19).replace('T', ' ')}.${frac.padEnd(6, '0').slice(0, 6)}`;
}

/** Yazma: JS değeri → sütun türüne uygun MariaDB parametresi. */
export function toDbValue(kind: ColumnKind, value: unknown): unknown {
  if (value === undefined || value === null) return null;
  switch (kind) {
    case 'json':
      return JSON.stringify(value);
    case 'bool':
      return value === true || value === 'true' || value === 1 || value === '1' || value === 't' ? 1 : 0;
    case 'ts':
      return toDbTimestamp(value as string | Date);
    case 'date':
      return typeof value === 'string' ? value.slice(0, 10) : toDbTimestamp(value as Date).slice(0, 10);
    case 'int':
    case 'num':
      return typeof value === 'number' ? value : Number(value);
    default:
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
}

/** Filtre değeri (URL'den gelen metin) → karşılaştırma parametresi. */
export function filterValue(kind: ColumnKind, raw: string): unknown {
  switch (kind) {
    case 'bool':
      return raw === 'true' || raw === 't' || raw === '1' ? 1 : 0;
    case 'ts':
      return toDbTimestamp(raw);
    case 'int':
    case 'num':
      return raw.trim() === '' || Number.isNaN(Number(raw)) ? raw : Number(raw);
    default:
      return raw;
  }
}
