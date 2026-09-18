// Yalnız SUNUCU public API'si (next/headers'a dokunan veri katmanı). İstemci bileşenleri index.ts'i kullanır.
export { listRedirectsForAdmin, listSlugHistory, type AdminRedirect, type SlugHistoryRow } from './data/adminRedirectsRepository';
