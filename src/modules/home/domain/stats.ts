import { localized, type LocalizedText } from '@/lib/localized';

export interface AboutStat {
  readonly value: string;
  readonly label: LocalizedText;
}

/** "değer | etiket TR | etiket EN" satırları → stats JSONB. Boş ya da değersiz satır atlanır. */
export function parseStats(textValue: string): AboutStat[] {
  return textValue
    .split('\n')
    .map((line) => line.split('|').map((p) => p.trim()))
    .filter((parts) => parts.length >= 2 && parts[0])
    .map(([value, tr, en]) => ({ value: value!, label: localized(tr, en) }));
}

/** stats JSONB → form metni (parseStats'ın tersi). */
export function formatStats(stats: readonly AboutStat[]): string {
  return stats.map((s) => [s.value, s.label['tr'] ?? '', s.label['en'] ?? ''].join(' | ')).join('\n');
}

/** Bilinmeyen JSON'dan güvenli okuma. */
export function readStats(value: unknown): AboutStat[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((s) => {
    if (typeof s !== 'object' || s === null || !('value' in s)) return [];
    const label = (s as { label?: unknown }).label;
    const safeLabel = typeof label === 'object' && label !== null && !Array.isArray(label) && Object.values(label).every((v) => typeof v === 'string') ? (label as LocalizedText) : {};
    return [{ value: String((s as { value: unknown }).value), label: safeLabel }];
  });
}
