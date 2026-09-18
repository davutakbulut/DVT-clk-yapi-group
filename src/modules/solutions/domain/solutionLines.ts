import { isLocalizedText, type LocalizedText } from '@/lib/localized';

/** Avantaj: "Başlık | Açıklama" satırı. Karşılaştırma: "Kriter | Çelik | Alternatif" satırı. TR/EN satırları sırayla eşleşir. */
export interface Advantage {
  readonly title: LocalizedText;
  readonly description: LocalizedText;
}
export interface ComparisonRow {
  readonly criterion: LocalizedText;
  readonly steel: LocalizedText;
  readonly alternative: LocalizedText;
}
export interface Comparison {
  readonly alternative: LocalizedText;
  readonly rows: readonly ComparisonRow[];
}

function cells(text: string, width: number): string[][] {
  return text
    .split('\n')
    .map((line) => line.split('|').map((p) => p.trim()))
    .filter((parts) => parts[0])
    .map((parts) => Array.from({ length: width }, (_, i) => parts[i] ?? ''));
}

function merge(tr: string[][], en: string[][], keys: readonly string[]): Record<string, LocalizedText>[] {
  return tr.map((row, i) => {
    const e = en[i];
    return Object.fromEntries(
      keys.map((key, k) => {
        const value: Record<string, string> = {};
        if (row[k]) value['tr'] = row[k]!;
        if (e?.[k]) value['en'] = e[k]!;
        return [key, value];
      }),
    );
  });
}

export function parseAdvantages(tr: string, en: string): Advantage[] {
  return merge(cells(tr, 2), cells(en, 2), ['title', 'description']).map((r) => ({ title: r['title']!, description: r['description']! }));
}

export function formatAdvantages(items: readonly Advantage[], locale: 'tr' | 'en'): string {
  return items
    .map((a) => [a.title[locale] ?? '', a.description[locale] ?? ''].join(' | ').replace(/ \| $/, ''))
    .filter((line) => line.trim() !== '' && line.trim() !== '|')
    .join('\n');
}

export function readAdvantages(value: unknown): Advantage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((s) => {
    if (typeof s !== 'object' || s === null) return [];
    const { title, description } = s as { title?: unknown; description?: unknown };
    if (!isLocalizedText(title)) return [];
    return [{ title, description: isLocalizedText(description) ? description : {} }];
  });
}

export function parseComparisonRows(tr: string, en: string): ComparisonRow[] {
  return merge(cells(tr, 3), cells(en, 3), ['criterion', 'steel', 'alternative']).map((r) => ({ criterion: r['criterion']!, steel: r['steel']!, alternative: r['alternative']! }));
}

export function formatComparisonRows(rows: readonly ComparisonRow[], locale: 'tr' | 'en'): string {
  return rows
    .map((r) => [r.criterion[locale] ?? '', r.steel[locale] ?? '', r.alternative[locale] ?? ''].join(' | '))
    .filter((line) => line.replace(/[\s|]/g, '') !== '')
    .join('\n');
}

export function readComparison(value: unknown): Comparison {
  const v = (typeof value === 'object' && value !== null ? value : {}) as { alternative?: unknown; rows?: unknown };
  const rows = Array.isArray(v.rows)
    ? v.rows.flatMap((r) => {
        if (typeof r !== 'object' || r === null) return [];
        const { criterion, steel, alternative } = r as { criterion?: unknown; steel?: unknown; alternative?: unknown };
        if (!isLocalizedText(criterion)) return [];
        return [{ criterion, steel: isLocalizedText(steel) ? steel : {}, alternative: isLocalizedText(alternative) ? alternative : {} }];
      })
    : [];
  return { alternative: isLocalizedText(v.alternative) ? v.alternative : {}, rows };
}
