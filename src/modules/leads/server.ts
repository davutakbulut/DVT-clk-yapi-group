// Yalnız SUNUCU public API'si (next/headers'a dokunan veri katmanı). İstemci bileşenleri index.ts'i kullanır.
export { getLeadForAdmin, getMailOverview, getQuoteFormOptionsText, listLeadsForAdmin, listStaffChoices, type LeadDetail, type LeadRow, type MailOverview, type MailTemplateRow, type StaffChoice } from './data/adminLeadsRepository';
