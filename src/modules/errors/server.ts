// Yalnız SUNUCU public API'si (next/headers'a dokunan veri katmanı). İstemci bileşenleri index.ts'i kullanır.
export { listErrors, listBrokenLinks, listVitals, setResolved, type ErrorRow, type BrokenLink, type VitalRow } from './data/errorsRepository';
