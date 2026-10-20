// İstemciye de inebilen public API (error.tsx istemci bileşeni). Veri çeken getter'lar server.ts'te (K-116).
export { ErrorPage } from './components/site/ErrorPage';
export type { ErrorPageKey, ErrorPageText } from './services/getErrorPage';
export { ErrorPageForm } from './components/admin/ErrorPageForm';
export { LegalPage } from './components/site/LegalPage';
export { LegalPageForm } from './components/admin/LegalPageForm';
export { LEGAL_PAGE_KEYS, type LegalPageKey } from './domain/legalPageKeys';
