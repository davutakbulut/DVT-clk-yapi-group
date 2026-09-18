// Yalnız SUNUCU public API'si (next/headers'a dokunan veri katmanı). İstemci bileşenleri index.ts'i kullanır.
export { getSolutionForAdmin, listSolutionChoices, listSolutionsForAdmin, type AdminSolution, type AdminSolutionRow } from './data/adminSolutionsRepository';
