/** İçerik JSONB'si: {"tr": "...", "en": "..."} (Kural 7). */
export type LocalizedText = Readonly<Partial<Record<string, string>>>;

/**
 * Dil için metin. `fallback` verilmezse çevrilmemiş alan BOŞ döner — İngilizce sayfada Türkçe metin çıkmaz.
 * Marka adı gibi dilden bağımsız alanlarda `fallback: 'tr'` verilir.
 */
export function pickLocale(text: LocalizedText | null | undefined, locale: string, options?: { readonly fallback?: string }): string {
  if (!text) return '';
  const own = text[locale];
  if (own && own.trim() !== '') return own;
  const fallback = options?.fallback ? text[options.fallback] : undefined;
  return fallback && fallback.trim() !== '' ? fallback : '';
}

export function isLocalizedText(value: unknown): value is LocalizedText {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every((v) => typeof v === 'string');
}
