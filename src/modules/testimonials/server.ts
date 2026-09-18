// Yalnız SUNUCU public API'si (next/headers'a dokunan veri katmanı). İstemci bileşenleri index.ts'i kullanır.
export { listTestimonialsForAdmin, listTestimonialChoices, listSyncRuns, readGooglePlaceSetting, type AdminTestimonial, type SyncRun, type TestimonialStatusFilter } from './data/adminTestimonialsRepository';
