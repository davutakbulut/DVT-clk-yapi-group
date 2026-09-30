// Yalnız SUNUCU public API'si (next/headers'a dokunan veri katmanı). İstemci bileşenleri index.ts'i kullanır.
export { getCampaign, getSendingOverview, listAudienceCities, listCampaigns, listRecipients, listSuppressions, type CampaignDetail, type CampaignRow, type CampaignStats, type RecipientRow, type SendingOverview, type SuppressionRow } from './data/adminCampaignsRepository';
export { CampaignList } from './components/admin/CampaignList';
export { CampaignReport } from './components/admin/CampaignReport';
export { unsubscribeByToken, type UnsubscribeOutcome } from './data/unsubscribeRepository';
