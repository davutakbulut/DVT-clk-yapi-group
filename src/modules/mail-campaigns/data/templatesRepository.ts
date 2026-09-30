import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { TEMPLATE_CATEGORIES, type CampaignTemplate, type LocalizedPair, type TemplateCategory } from '../domain/types';

const COLUMNS = 'id, name, category, description, subject, preheader, body, cta_label, cta_url, sort_order, is_active';
const fail = (message: string) => err(appError('external_service', message, { module: 'mail-campaigns' }));

const pair = (value: unknown): LocalizedPair => {
  const v = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  return { tr: typeof v['tr'] === 'string' ? v['tr'] : '', en: typeof v['en'] === 'string' ? v['en'] : '' };
};

function toTemplate(row: { id: string; name: string; category: string; description: string; subject: unknown; preheader: unknown; body: unknown; cta_label: unknown; cta_url: unknown; sort_order: number; is_active: boolean }): CampaignTemplate {
  const category = (TEMPLATE_CATEGORIES as readonly string[]).includes(row.category) ? (row.category as TemplateCategory) : 'announcement';
  return { id: row.id, name: row.name, category, description: row.description, subject: pair(row.subject), preheader: pair(row.preheader), body: pair(row.body), cta_label: pair(row.cta_label), cta_url: pair(row.cta_url), sort_order: row.sort_order, is_active: row.is_active };
}

/** Hazır şablonlar (K-109): kategori ve sıra düzeninde. `activeOnly` → kampanya taslağındaki seçici. RLS: super_admin/admin. */
export async function listCampaignTemplates(activeOnly = false): Promise<Result<CampaignTemplate[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  let q = client.data.from('mail_campaign_templates').select(COLUMNS).order('category').order('sort_order').order('name').limit(300);
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) return fail(error.message);
  // Seçicide kategoriler TEMPLATE_CATEGORIES sırasıyla görünür (alfabetik değil)
  const rank = (c: string) => (TEMPLATE_CATEGORIES as readonly string[]).indexOf(c);
  return ok(data.map(toTemplate).sort((a, b) => rank(a.category) - rank(b.category) || a.sort_order - b.sort_order));
}

export async function getCampaignTemplate(id: string): Promise<Result<CampaignTemplate | null>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('mail_campaign_templates').select(COLUMNS).eq('id', id).maybeSingle();
  if (error) return fail(error.message);
  return ok(data ? toTemplate(data) : null);
}
