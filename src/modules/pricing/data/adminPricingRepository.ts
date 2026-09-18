import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { isLocalizedText, type LocalizedText } from '@/lib/localized';

export interface AdminPriceGuideRow {
  readonly id: string;
  readonly title: LocalizedText;
  readonly slug: LocalizedText;
  readonly status: string;
  readonly published_locales: readonly string[];
  readonly sort_order: number | null;
  readonly updated_at: string;
  readonly prices_updated_at: string | null;
  readonly stale_after_days: number;
  /** Panel "bayat" uyarısı: fiyat hiç girilmemiş ya da stale_after_days'i aşmış. */
  readonly isStale: boolean;
  readonly rowCount: number;
}

export interface AdminPriceGuideLine {
  readonly id: string;
  readonly systemType: LocalizedText;
  readonly description: LocalizedText;
  readonly materialCode: string | null;
  readonly minFactor: number;
  readonly maxFactor: number;
}

export interface AdminPriceGuide extends Omit<AdminPriceGuideRow, 'isStale' | 'rowCount'> {
  readonly service_id: string | null;
  readonly intro: LocalizedText;
  readonly factors: LocalizedText;
  readonly formula: LocalizedText;
  readonly disclaimer: LocalizedText;
  readonly quantity_unit: string;
  readonly quantity_presets: readonly number[];
  readonly vat_included: boolean;
  readonly og_image_id: string | null;
  readonly seo_title: LocalizedText;
  readonly seo_description: LocalizedText;
  readonly focus_keyword: LocalizedText;
  readonly canonical_url: string | null;
  readonly noindex: boolean;
  readonly reviewedEn: boolean;
  readonly rows: readonly AdminPriceGuideLine[];
}

export interface AdminMaterialPrice {
  readonly id: string;
  readonly code: string;
  readonly name: LocalizedText;
  readonly category: string;
  readonly unit: string;
  readonly unit_price: number;
  readonly currency: string;
  readonly valid_from: string;
  readonly note: string | null;
  readonly updated_at: string;
  readonly historyCount: number;
}

export interface Choice {
  readonly id: string;
  readonly label: string;
}

const lt = (v: unknown): LocalizedText => (isLocalizedText(v) ? v : {});
const fail = (message: string) => err(appError('external_service', message, { module: 'pricing' }));
const isStale = (pricesUpdatedAt: string | null, days: number) => pricesUpdatedAt === null || Date.now() - new Date(pricesUpdatedAt).getTime() > days * 86_400_000;
const LIST = 'id, title, slug, status, published_locales, sort_order, updated_at, prices_updated_at, stale_after_days';

export async function listPriceGuidesForAdmin(): Promise<Result<AdminPriceGuideRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('price_guides').select(`${LIST}, rows:price_guide_rows(id)`).order('sort_order', { ascending: true, nullsFirst: false }).order('created_at');
  if (error) return fail(error.message);
  return ok(data.map((r) => ({ ...r, title: lt(r.title), slug: lt(r.slug), isStale: isStale(r.prices_updated_at, r.stale_after_days), rowCount: (r.rows as unknown[] | null)?.length ?? 0 })));
}

export async function getPriceGuideForAdmin(id: string): Promise<Result<AdminPriceGuide | null>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [guide, rows] = await Promise.all([
    client.data.from('price_guides').select(`${LIST}, service_id, intro, factors, formula, disclaimer, quantity_unit, quantity_presets, vat_included, og_image_id, seo_title, seo_description, focus_keyword, canonical_url, noindex, translation_meta`).eq('id', id).maybeSingle(),
    client.data.from('price_guide_rows').select('id, system_type, description, min_factor, max_factor, material:material_prices(code)').eq('price_guide_id', id).order('sort_order'),
  ]);
  const failure = guide.error ?? rows.error;
  if (failure) return fail(failure.message);
  if (!guide.data) return ok(null);
  const g = guide.data;
  const meta = (g.translation_meta ?? {}) as { en?: { reviewed?: boolean } };
  return ok({
    ...g,
    title: lt(g.title),
    slug: lt(g.slug),
    intro: lt(g.intro),
    factors: lt(g.factors),
    formula: lt(g.formula),
    disclaimer: lt(g.disclaimer),
    seo_title: lt(g.seo_title),
    seo_description: lt(g.seo_description),
    focus_keyword: lt(g.focus_keyword),
    quantity_presets: (g.quantity_presets ?? []).map(Number),
    reviewedEn: meta.en?.reviewed === true,
    rows: (rows.data ?? []).map((r) => ({ id: r.id, systemType: lt(r.system_type), description: lt(r.description), materialCode: (r.material as { code?: string } | null)?.code ?? null, minFactor: Number(r.min_factor), maxFactor: Number(r.max_factor) })),
  });
}

export async function listPricingChoices(): Promise<Result<{ services: Choice[]; materials: Choice[] }>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [services, materials] = await Promise.all([
    client.data.from('services').select('id, title').order('sort_order', { ascending: true, nullsFirst: false }),
    client.data.from('material_prices').select('id, code, name, unit_price, currency, unit').order('code'),
  ]);
  const failure = services.error ?? materials.error;
  if (failure) return fail(failure.message);
  return ok({
    services: (services.data ?? []).map((s) => ({ id: s.id, label: lt(s.title)['tr'] ?? '' })),
    materials: (materials.data ?? []).map((m) => ({ id: m.id, label: `${m.code} · ${lt(m.name)['tr'] ?? ''} · ${m.unit_price} ${m.currency}/${m.unit}` })),
  });
}

export async function listMaterialPricesForAdmin(): Promise<Result<AdminMaterialPrice[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('material_prices').select('id, code, name, category, unit, unit_price, currency, valid_from, note, updated_at, history:material_price_history(id)').order('category').order('code');
  if (error) return fail(error.message);
  return ok(data.map((m) => ({ ...m, name: lt(m.name), unit_price: Number(m.unit_price), historyCount: (m.history as unknown[] | null)?.length ?? 0 })));
}

/** Fiyat geçmişi (0008 tetikleyicisi): eski değer, geçerlilik aralığı. Yalnız admin/sales/viewer okur (RLS). */
export async function listMaterialPriceHistory(materialPriceId: string): Promise<Result<{ id: string; unit_price: number; currency: string; valid_from: string; valid_until: string }[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('material_price_history').select('id, unit_price, currency, valid_from, valid_until').eq('material_price_id', materialPriceId).order('valid_until', { ascending: false }).limit(20);
  if (error) return fail(error.message);
  return ok(data.map((h) => ({ ...h, unit_price: Number(h.unit_price) })));
}
