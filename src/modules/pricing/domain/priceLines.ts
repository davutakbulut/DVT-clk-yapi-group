import { isLocalizedText, type LocalizedText } from '@/lib/localized';

/** Rehber satırı (admin satır biçimi): TR "Sistem türü | Açıklama | MALZEME_KODU | min çarpan | max çarpan", EN "System type | Description". */
export interface PriceRowInput {
  readonly systemType: LocalizedText;
  readonly description: LocalizedText;
  readonly materialCode: string | null;
  readonly minFactor: number;
  readonly maxFactor: number;
}

function num(v: string | undefined, fallback: number): number {
  if (!v) return fallback;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function cells(text: string): string[][] {
  return text
    .split('\n')
    .map((l) => l.split('|').map((p) => p.trim()))
    .filter((p) => p[0]);
}

export function parsePriceRows(tr: string, en: string): PriceRowInput[] {
  const b = cells(en);
  return cells(tr).map((p, i) => {
    const e = b[i];
    const systemType: Record<string, string> = { tr: p[0]! };
    const description: Record<string, string> = {};
    if (p[1]) description['tr'] = p[1];
    if (e?.[0]) systemType['en'] = e[0];
    if (e?.[1]) description['en'] = e[1];
    const min = num(p[3], 1);
    const max = Math.max(min, num(p[4], min));
    return { systemType, description, materialCode: p[2] ? p[2].toUpperCase() : null, minFactor: min, maxFactor: max };
  });
}

export function formatPriceRows(rows: readonly { systemType: LocalizedText; description: LocalizedText; materialCode: string | null; minFactor: number; maxFactor: number }[], locale: 'tr' | 'en'): string {
  return rows
    .map((r) => (locale === 'tr' ? [r.systemType['tr'] ?? '', r.description['tr'] ?? '', r.materialCode ?? '', String(r.minFactor), String(r.maxFactor)].join(' | ') : [r.systemType['en'] ?? '', r.description['en'] ?? ''].join(' | ').replace(/ \| $/, '')))
    .filter((line) => line.replace(/[\s|]/g, '') !== '')
    .join('\n');
}

/** "50, 100, 200" → [50, 100, 200]; geçersiz/negatif değerler düşer, boşsa varsayılan. */
export function parsePresets(text: string, fallback: readonly number[] = [50, 100, 200]): number[] {
  const out = text
    .split(/[,\s;]+/)
    .map((v) => Number(v.replace(',', '.')))
    .filter((n) => Number.isFinite(n) && n > 0);
  return out.length > 0 ? Array.from(new Set(out)).sort((a, b) => a - b) : [...fallback];
}

export function readLocalized(v: unknown): LocalizedText {
  return isLocalizedText(v) ? v : {};
}
