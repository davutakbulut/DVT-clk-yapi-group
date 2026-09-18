import { isLocalizedText, type LocalizedText } from '@/lib/localized';

export interface ProcessStep {
  readonly title: LocalizedText;
  readonly description: LocalizedText;
}

function lines(text: string): { title: string; description: string }[] {
  return text
    .split('\n')
    .map((line) => line.split('|').map((p) => p.trim()))
    .filter((parts) => parts[0])
    .map(([title, description = '']) => ({ title: title!, description }));
}

/** TR ve EN metin alanları ("Başlık | Açıklama" satırları) → adım dizisi. Satırlar sıraya göre eşleşir; EN eksikse yalnız TR yazılır. */
export function parseSteps(tr: string, en: string): ProcessStep[] {
  const a = lines(tr);
  const b = lines(en);
  return a.map((step, i) => {
    const e = b[i];
    const title: Record<string, string> = { tr: step.title };
    const description: Record<string, string> = {};
    if (step.description) description['tr'] = step.description;
    if (e?.title) title['en'] = e.title;
    if (e?.description) description['en'] = e.description;
    return { title, description };
  });
}

/** Adım dizisi → tek dilin form metni. */
export function formatSteps(steps: readonly ProcessStep[], locale: 'tr' | 'en'): string {
  return steps
    .map((s) => [s.title[locale] ?? '', s.description[locale] ?? ''].join(' | ').replace(/ \| $/, ''))
    .filter((line) => line.trim() !== '' && line.trim() !== '|')
    .join('\n');
}

export function readSteps(value: unknown): ProcessStep[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((s) => {
    if (typeof s !== 'object' || s === null) return [];
    const { title, description } = s as { title?: unknown; description?: unknown };
    if (!isLocalizedText(title)) return [];
    return [{ title, description: isLocalizedText(description) ? description : {} }];
  });
}
