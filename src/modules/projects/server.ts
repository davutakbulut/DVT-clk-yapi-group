// Yalnız SUNUCU public API'si (next/headers'a dokunan veri katmanı). İstemci bileşenleri index.ts'i kullanır.
export { getProjectForAdmin, listCategoriesForAdmin, listProjectChoices, listProjectsForAdmin, type AdminCategory, type AdminProject, type AdminProjectRow } from './data/adminProjectsRepository';
