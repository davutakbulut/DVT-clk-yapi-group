// Yalnız SUNUCU public API'si (next/headers'a dokunan veri katmanı). İstemci bileşenleri index.ts'i kullanır.
export { listLegalPagesForAdmin, listSystemPagesForAdmin, type AdminLegalPage } from './data/adminStaticPageRepository';
