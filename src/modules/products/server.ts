// Yalnız SUNUCU public API'si (next/headers'a dokunan veri katmanı). İstemci bileşenleri index.ts'i kullanır.
export { getProductForAdmin, listProductCategoriesForAdmin, listProductChoices, listProductsForAdmin, type AdminProduct, type AdminProductCategory, type AdminProductRow } from './data/adminProductsRepository';
