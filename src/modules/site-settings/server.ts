// Yalnız SUNUCU public API'si (next/headers'a dokunan veri katmanı). İstemci bileşenleri index.ts'i kullanır.
export { loadSettingsForAdmin } from './data/adminSettingsRepository';
export { getIndexNowStatus, type IndexNowStatus } from './data/indexNowRepository';
