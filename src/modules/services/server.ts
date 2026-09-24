// Yalnız SUNUCU public API'si (next/headers'a dokunan veri katmanı). İstemci bileşenleri index.ts'i kullanır.
export { getServiceForAdmin, listImageChoices, listProjectCategoryChoices, listServicesForAdmin, type AdminService, type AdminServiceRow } from './data/adminServicesRepository';
