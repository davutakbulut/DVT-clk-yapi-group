// Yalnız SUNUCU public API'si (next/headers'a dokunan veri katmanı). İstemci bileşenleri index.ts'i kullanır.
export { listOverrides, listGlossary, listMissingTranslations, type OverrideRow, type GlossaryTerm, type MissingRow } from './data/adminTranslationsRepository';
