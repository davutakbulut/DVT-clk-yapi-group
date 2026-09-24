'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';
import { linesToItems } from './domain/pageCopy';

const MODULE = 'site-settings';
const MANAGERS = ['super_admin', 'admin'] as const;

const optional = z.string().trim().max(500).optional().or(z.literal(''));
const schema = z.object({
  siteNameTr: z.string().trim().min(1).max(120),
  siteNameEn: optional,
  taglineTr: optional,
  taglineEn: optional,
  developerName: optional,
  developerUrl: z.string().trim().url().optional().or(z.literal('')),
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/).optional().or(z.literal('')),
  email: z.string().trim().email().optional().or(z.literal('')),
  addressTr: optional,
  addressEn: optional,
  mapUrl: z.string().trim().url().optional().or(z.literal('')),
  hoursTr: optional,
  hoursEn: optional,
  logoMediaId: z.string().uuid().optional().or(z.literal('')),
  logoDarkMediaId: z.string().uuid().optional().or(z.literal('')),
  seoTr: optional,
  seoEn: optional,
});

// value jsonb NOT NULL: JS null SQL NULL'a döner (23502). Boş değer JSON'da '' / {} / [] olarak yazılır;
// okuma şeması (domain/settings.ts) bunları null'a indirger.
const localized = (tr?: string, en?: string) => {
  const out: Record<string, string> = {};
  if (tr) out['tr'] = tr;
  if (en) out['en'] = en;
  return out;
};

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(MANAGERS);
  if (!gate.ok) return failed('forbidden');
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed('validation', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation'])));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');

  const values: Record<string, unknown> = {
    'site.name': localized(v.siteNameTr, v.siteNameEn),
    'site.tagline': localized(v.taglineTr, v.taglineEn),
    'site.developer': v.developerName ? { name: v.developerName, url: v.developerUrl || null } : null,
    'site.logo_media_id': v.logoMediaId || '',
    'site.logo_dark_media_id': v.logoDarkMediaId || '',
    'contact.phone': v.phone || '',
    'contact.email': v.email || '',
    'contact.address': localized(v.addressTr, v.addressEn),
    'contact.map_url': v.mapUrl || '',
    'contact.working_hours': localized(v.hoursTr, v.hoursEn),
    'seo.default_description': localized(v.seoTr, v.seoEn),
  };
  // Anahtar başına update (upsert değil): is_public/description referans verisinde kalır, yalnız değer değişir.
  for (const [key, value] of Object.entries(values)) {
    const { error } = await client.data.from('site_settings').update({ value: value as never, updated_by: gate.data.id }).eq('key', key);
    if (error) {
      logger.error('Ayar kaydedilemedi', { module: MODULE, key, code: error.code });
      return failed(error.code === '42501' ? 'forbidden' : 'unexpected');
    }
  }
  revalidateTag(CACHE_TAGS.siteSettings);
  return DONE;
}

async function writeSettings(values: Record<string, unknown>): Promise<ActionState> {
  const gate = await requireRole(MANAGERS);
  if (!gate.ok) return failed('forbidden');
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  for (const [key, value] of Object.entries(values)) {
    const { error } = await client.data.from('site_settings').update({ value: value as never, updated_by: gate.data.id }).eq('key', key);
    if (error) {
      logger.error('Ayar kaydedilemedi', { module: MODULE, key, code: error.code });
      return failed(error.code === '42501' ? 'forbidden' : 'unexpected');
    }
  }
  revalidateTag(CACHE_TAGS.siteSettings);
  return DONE;
}

const code = z.string().trim().max(200).optional().or(z.literal(''));

/** /admin/settings/seo — varsayılan OG görseli + arama motoru doğrulama kodları. */
export async function saveSeoSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ ogMediaId: z.string().uuid().optional().or(z.literal('')), google: code, bing: code, yandex: code }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed('validation', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation'])));
  const v = parsed.data;
  return writeSettings({ 'seo.default_og_media_id': v.ogMediaId || '', 'seo.verification': { ...(v.google ? { google: v.google } : {}), ...(v.bing ? { bing: v.bing } : {}), ...(v.yandex ? { yandex: v.yandex } : {}) } });
}

/** /admin/settings/cookies — çerez bandı metinleri (TR zorunlu, EN isteğe bağlı). */
export async function saveCookieBanner(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const field = z.string().trim().min(1).max(500);
  const optionalField = z.string().trim().max(500).optional().or(z.literal(''));
  const parsed = z
    .object({ titleTr: field, bodyTr: field, acceptTr: field, rejectTr: field, settingsTr: field, titleEn: optionalField, bodyEn: optionalField, acceptEn: optionalField, rejectEn: optionalField, settingsEn: optionalField })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed('validation', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation'])));
  const v = parsed.data;
  const value: Record<string, unknown> = { tr: { title: v.titleTr, body: v.bodyTr, accept: v.acceptTr, reject: v.rejectTr, settings: v.settingsTr } };
  if (v.titleEn && v.bodyEn && v.acceptEn && v.rejectEn && v.settingsEn) value['en'] = { title: v.titleEn, body: v.bodyEn, accept: v.acceptEn, reject: v.rejectEn, settings: v.settingsEn };
  return writeSettings({ cookie_banner: value });
}

/** /admin/settings/maintenance — bakım modu; metin static_pages.maintenance'tan, buradaki ek mesaj isteğe bağlı. */
export async function saveMaintenance(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ enabled: z.boolean(), messageTr: optional, messageEn: optional }).safeParse({ ...Object.fromEntries(formData), enabled: formData.get('enabled') === 'on' });
  if (!parsed.success) return failed('validation');
  const v = parsed.data;
  return writeSettings({ maintenance: { enabled: v.enabled, message: localized(v.messageTr, v.messageEn) } });
}

/** /admin/settings/modules — kill switch (K-43): işaretli = açık. Yalnız false yazılır; eksik anahtar açık sayılır. */
export async function saveModules(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const keys = ['services', 'projects', 'blog', 'products', 'solutions', 'pricing', 'testimonials', 'careers', 'leads', 'quoteBasket', 'whatsapp', 'consent', 'configurator'] as const;
  const value: Record<string, boolean> = {};
  for (const key of keys) if (formData.get(`m_${key}`) !== 'on') value[key] = false;
  const result = await writeSettings({ 'modules.enabled': value });
  if (result.ok) {
    revalidateTag(CACHE_TAGS.menus);
    revalidatePath('/', 'layout');
  }
  return result;
}

// ── Faz 30 · IndexNow elle tetikleme (panelde admin oturumu; cron'da service-role — K-56 deseni)
import { submitIndexNow } from '@/core/jobs/indexNow';

export async function triggerIndexNow(): Promise<void> {
  const gate = await requireRole(MANAGERS);
  if (!gate.ok) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const result = await submitIndexNow(client.data);
  if (!result.ok) logger.warn('IndexNow gonderimi basarisiz', { module: MODULE, code: result.error.code, message: result.error.message });
  revalidatePath('/admin/settings/seo');
}

/** Sosyal medya bağlantıları (/admin/settings/social): satırlar platform_i / url_i; boş satır atlanır, geçersiz URL alan hatası. */
export async function saveSocialLinks(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(MANAGERS);
  if (!gate.ok) return failed('forbidden');
  const count = Math.min(30, Math.max(0, Number(formData.get('count') ?? 0) || 0));
  const links: { platform: string; url: string }[] = [];
  const fieldErrors: Record<string, string> = {};
  for (let i = 0; i < count; i += 1) {
    const platform = String(formData.get(`platform_${i}`) ?? '').trim();
    const url = String(formData.get(`url_${i}`) ?? '').trim();
    if (!platform && !url) continue;
    if (!platform || platform.length > 40) fieldErrors[`platform_${i}`] = 'validation';
    if (!/^https:\/\/[^\s]+$/.test(url)) fieldErrors[`url_${i}`] = 'validation';
    links.push({ platform, url });
  }
  if (Object.keys(fieldErrors).length) return failed('validation', fieldErrors);
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { error } = await client.data.from('site_settings').update({ value: links as never, updated_by: gate.data.id }).eq('key', 'social.links');
  if (error) {
    logger.error('Sosyal bağlantılar kaydedilemedi', { module: MODULE, code: error.code });
    return failed('unexpected');
  }
  revalidateTag(CACHE_TAGS.siteSettings);
  revalidatePath('/', 'layout');
  return DONE;
}

/** Hizmetler & Projeler sayfa metinleri (K-106): services.page / projects.page. Liste alanları "Başlık | Metin" satırları. */
export async function savePagesCopy(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(MANAGERS);
  if (!gate.ok) return failed('forbidden');
  const f = (k: string) => String(formData.get(k) ?? '').slice(0, 20000);
  const loc = (k: string) => localized(f(`${k}Tr`).trim(), f(`${k}En`).trim());
  const list = (k: string) => linesToItems(f(`${k}Tr`), f(`${k}En`));
  if (!f('sHeroTitleTr').trim() || !f('pHeroTitleTr').trim()) return failed('validation', { sHeroTitle: 'validation' });
  const groupKeys = ['steel', 'engineering', 'construction'] as const;
  const toolHrefs = ['/configurator', '/products', '/pricing'];
  const tools = (() => {
    const split = (s: string) => s.split('\n').map((l) => l.split('|').map((p) => p.trim())).filter((p) => p[0]);
    const a = split(f('sToolsTr')), b = split(f('sToolsEn'));
    return a.slice(0, 3).map((row, i) => ({ href: toolHrefs[i]!, title: localized(row[0], b[i]?.[0]), text: localized(row[1], b[i]?.[1]), cta: localized(row[2], b[i]?.[2]) }));
  })();
  const services = {
    hero: { title: loc('sHeroTitle'), lede: loc('sHeroLede') },
    groups: list('sGroups').slice(0, 3).map((g, i) => ({ key: groupKeys[i], title: g.title, lede: g.text })),
    why: { title: loc('sWhyTitle'), lede: loc('sWhyLede'), items: list('sWhy') },
    steps: { title: loc('sStepsTitle'), items: list('sSteps') },
    tools: { title: loc('sToolsTitle'), lede: loc('sToolsLede'), items: tools },
    faq: { title: loc('sFaqTitle'), items: list('sFaq').map((i) => ({ q: i.title, a: i.text })) },
    cta: { title: loc('sCtaTitle'), lede: loc('sCtaLede') },
  };
  const projects = {
    hero: { title: loc('pHeroTitle'), lede: loc('pHeroLede') },
    stats: list('pStats').map((i) => ({ value: i.title, label: i.text })),
    steps: { title: loc('pStepsTitle'), items: list('pSteps') },
    empty: { title: loc('pEmptyTitle'), text: loc('pEmptyText') },
    cta: { title: loc('pCtaTitle'), lede: loc('pCtaLede') },
  };
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  for (const [key, value] of [['services.page', services], ['projects.page', projects]] as const) {
    const { error } = await client.data.from('site_settings').upsert({ key, value: value as never, is_public: true, updated_by: gate.data.id }, { onConflict: 'key' });
    if (error) { logger.error('Sayfa metni kaydedilemedi', { module: MODULE, key, code: error.code }); return failed('unexpected'); }
  }
  revalidateTag(CACHE_TAGS.siteSettings); revalidateTag(CACHE_TAGS.services); revalidateTag(CACHE_TAGS.projects);
  revalidatePath('/', 'layout');
  return DONE;
}
