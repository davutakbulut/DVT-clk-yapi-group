import { getSiteUrl } from '@/core/config/site';
import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { parseBulkMailSettings, type BulkMailSettings } from '@/core/mail/bulkSettings';
import { isMailConfigured } from '@/core/mail/provider';
import { parseAudience, type CampaignAudience, type CampaignStatus, type RecipientStatus, type SuppressionReason } from '../domain/types';

export interface CampaignStats {
  readonly total: number;
  readonly pending: number;
  readonly sent: number;
  readonly failed: number;
  readonly skipped: number;
  readonly unsubscribed: number;
}

export interface CampaignRow {
  readonly id: string;
  readonly name: string;
  readonly subject: string;
  readonly locale: 'tr' | 'en';
  readonly status: CampaignStatus;
  readonly scheduled_at: string | null;
  readonly started_at: string | null;
  readonly finished_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly stats: CampaignStats;
}

export interface CampaignDetail extends CampaignRow {
  readonly preheader: string;
  readonly body: string;
  readonly cta_label: string;
  readonly cta_url: string;
  readonly audience: CampaignAudience;
}

export interface RecipientRow {
  readonly id: string;
  readonly email: string;
  readonly full_name: string | null;
  readonly company: string | null;
  readonly source: string;
  readonly status: RecipientStatus;
  readonly error: string | null;
  readonly sent_at: string | null;
  readonly unsubscribed_at: string | null;
}

export interface SuppressionRow {
  readonly id: string;
  readonly email: string;
  readonly reason: SuppressionReason;
  readonly note: string | null;
  readonly created_at: string;
}

export interface AudiencePreview {
  readonly total: number;
  readonly suppressed: number;
  readonly customer: number;
  readonly lead: number;
  readonly manual: number;
  readonly sample: readonly { email: string; name: string | null; company: string | null; source: string }[];
}

export interface SendingOverview {
  readonly settings: BulkMailSettings;
  /** Son 1 saatte gönderilen TÜM iletiler (otomatik iletiler dahil). */
  readonly sentLastHour: number;
  readonly providerConfigured: boolean;
  readonly suppressions: number;
  /** Önizleme ve test iletisinde görünen site adı (site.name ayarı). */
  readonly siteName: { readonly tr: string; readonly en: string };
}

const EMPTY_STATS: CampaignStats = { total: 0, pending: 0, sent: 0, failed: 0, skipped: 0, unsubscribed: 0 };
const LIST = 'id, name, subject, locale, status, scheduled_at, started_at, finished_at, created_at, updated_at';
const fail = (message: string) => err(appError('external_service', message, { module: 'mail-campaigns' }));

/** Liste: en yeni üstte; alıcı sayaçları tek RPC ile. RLS: super_admin/admin. */
export async function listCampaigns(): Promise<Result<CampaignRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [rows, stats] = await Promise.all([
    client.data.from('mail_campaigns').select(LIST).order('created_at', { ascending: false }).limit(200),
    client.data.rpc('mail_campaign_stats'),
  ]);
  const failure = rows.error ?? stats.error;
  if (failure) return fail(failure.message);
  const byId = new Map((stats.data ?? []).map((s) => [s.campaign_id, s]));
  return ok((rows.data ?? []).map((r) => ({ ...r, locale: r.locale === 'en' ? 'en' : 'tr', status: r.status as CampaignStatus, stats: byId.get(r.id) ?? EMPTY_STATS })));
}

export async function getCampaign(id: string): Promise<Result<CampaignDetail | null>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [row, stats] = await Promise.all([
    client.data.from('mail_campaigns').select(`${LIST}, preheader, body, cta_label, cta_url, audience`).eq('id', id).maybeSingle(),
    client.data.rpc('mail_campaign_stats', { p_ids: [id] }),
  ]);
  const failure = row.error ?? stats.error;
  if (failure) return fail(failure.message);
  if (!row.data) return ok(null);
  const r = row.data;
  return ok({ ...r, locale: r.locale === 'en' ? 'en' : 'tr', status: r.status as CampaignStatus, audience: parseAudience(r.audience), stats: stats.data?.[0] ?? EMPTY_STATS });
}

/** Alıcılar: durum süzgeci + adres araması; en çok 500 satır (tamamı için CSV dışa aktarım). */
export async function listRecipients(campaignId: string, filter: { readonly status?: RecipientStatus; readonly q?: string } = {}, limit = 500): Promise<Result<RecipientRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  let q = client.data.from('mail_campaign_recipients').select('id, email, full_name, company, source, status, error, sent_at, unsubscribed_at').eq('campaign_id', campaignId).order('email').limit(limit);
  if (filter.status) q = q.eq('status', filter.status);
  const term = filter.q?.trim().replace(/[%,()]/g, '');
  if (term) q = q.or(`email.ilike.%${term}%,full_name.ilike.%${term}%,company.ilike.%${term}%`);
  const { data, error } = await q;
  if (error) return fail(error.message);
  return ok(data.map((r) => ({ ...r, status: r.status as RecipientStatus })));
}

export async function listSuppressions(search?: string): Promise<Result<SuppressionRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  let q = client.data.from('mail_suppressions').select('id, email, reason, note, created_at').order('created_at', { ascending: false }).limit(500);
  const term = search?.trim().replace(/[%,()]/g, '');
  if (term) q = q.ilike('email', `%${term}%`);
  const { data, error } = await q;
  if (error) return fail(error.message);
  return ok(data.map((r) => ({ ...r, reason: r.reason as SuppressionReason })));
}

/** Gönderim ayarları + bu saatin kullanımı + sağlayıcı durumu (liste ve kampanya sayfasının üst bilgisi). */
export async function getSendingOverview(): Promise<Result<SendingOverview>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const [setting, name, sent, suppressions] = await Promise.all([
    client.data.from('site_settings').select('value').eq('key', 'mail.bulk').maybeSingle(),
    client.data.from('site_settings').select('value').eq('key', 'site.name').maybeSingle(),
    client.data.from('email_logs').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('created_at', since),
    client.data.from('mail_suppressions').select('id', { count: 'exact', head: true }),
  ]);
  const failure = setting.error ?? name.error ?? sent.error ?? suppressions.error;
  if (failure) return fail(failure.message);
  const names = (name.data?.value as { tr?: string; en?: string } | null) ?? {};
  const host = getSiteUrl().hostname;
  return ok({ settings: parseBulkMailSettings(setting.data?.value), sentLastHour: sent.count ?? 0, providerConfigured: isMailConfigured(), suppressions: suppressions.count ?? 0, siteName: { tr: names.tr || host, en: names.en || names.tr || host } });
}

export async function previewAudience(audience: CampaignAudience): Promise<Result<AudiencePreview>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.rpc('mail_audience_preview', { p: audience as never });
  if (error) return fail(error.message);
  const d = (data ?? {}) as Partial<AudiencePreview>;
  return ok({ total: Number(d.total ?? 0), suppressed: Number(d.suppressed ?? 0), customer: Number(d.customer ?? 0), lead: Number(d.lead ?? 0), manual: Number(d.manual ?? 0), sample: Array.isArray(d.sample) ? d.sample : [] });
}

export async function listAudienceCities(): Promise<Result<string[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.rpc('mail_audience_cities');
  if (error) return fail(error.message);
  return ok(data ?? []);
}
