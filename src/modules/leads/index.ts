// İstemciye de inebilen public API. Veri çeken sunucu bileşenleri ve getter'lar server.ts'te (K-116: veri katmanı artık yalnız sunucuda çalışır).
export { LeadForm } from './components/site/LeadForm';
export { LeadNoteForm, LeadReplyForm, LeadStatusForm, QuoteFormOptionsForm } from './components/admin/LeadPanels';
export { MailTemplateForm } from './components/admin/MailTemplatePanels';
export { leadFormSchema, parseOptions, formatOptions, readOptions, type QuoteFormOptions, type FormOption } from './domain/leadSchema';
