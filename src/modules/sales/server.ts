// Yalnız SUNUCU public API'si (next/headers'a dokunan veri katmanı). İstemci bileşenleri index.ts'i kullanır.
export { listSales, getSale, listSaleChoices, latestRates, findSaleByLead, type SaleRow, type SaleDetail, type Choice, type LatestRate } from './data/adminSalesRepository';
