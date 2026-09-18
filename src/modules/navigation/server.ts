// Yalnız SUNUCU public API'si (next/headers'a dokunan veri katmanı). İstemci bileşenleri index.ts'i kullanır.
export { listMenuItemsForAdmin, listMenusForAdmin } from './data/adminMenuRepository';
export { orphanRoutes } from './services/orphanReport';
