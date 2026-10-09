'use server';

import { createHash } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getCurrentUser, requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { dbErrorKey } from '@/core/content/adminContent';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { rateLimit } from '@/core/rate-limit';
import { clientIp as requestIp } from '@/core/request/clientIp';
import { DONE, failed, type ActionState } from '@/lib/formState';
import type { Json } from '@/types/database';
import { EMPTY_ENGINE_RULE, engineRuleSchema, getCachedCatalogRows, getCachedEngineRules, toOverrides } from './data/engineRepository';
import { loadPriceTable } from './data/pricesRepository';
import { DEFAULT_RULES, getCachedRules } from './data/rulesRepository';
import { computeSectionProps, FAMILY_KEYS, FAMILY_KIND, type FamilyKey } from './engine/catalog';
import { computeEnginePrice } from './engine/pricing';
import { ENGINE_APPS, ENGINE_RULE_KEY, isEngineKind } from './engine/registry';
import { allFields } from './engine/runtime';
import { bomToItems, parseSavedParams, runEngine } from './engine/server';

const ADMINS = ['super_admin', 'admin'] as const;
const issues = (error: z.ZodError) => Object.fromEntries(error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation']));

// ── Profil kataloğu (K-110): kod ASCII (HEB360, SHS40x40x3, CHS139.7x6); tür ve ölçüler kesit çizimini/değerlerini üretir
const num = (v: unknown) => Number(String(v ?? '').replace(',', '.'));
const profileSchema = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  code: z.string().trim().regex(/^[A-Za-z0-9.x_-]{2,40}$/),
  label: z.string().trim().min(1).max(60),
  family: z.enum(FAMILY_KEYS),
  h: z.coerce.number().positive().max(2000),
  b: z.coerce.number().positive().max(2000),
  tw: z.coerce.number().min(0).max(200).optional(),
  tf: z.coerce.number().min(0).max(200).optional(),
  r: z.coerce.number().min(0).max(200).optional(),
  t: z.coerce.number().min(0).max(200).optional(),
  kgPerM: z.coerce.number().positive().max(10000),
  isActive: z.boolean(),
});

/** Profil kaydet (yalnız admin; RLS 0008 aynı sınır). kg/m panelde girilir; boş bırakılırsa ölçülerden hesaplanır (K-110). */
export async function saveSteelProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return failed('forbidden');
  const raw = Object.fromEntries(formData);
  const family = String(raw['family'] ?? '') as FamilyKey;
  const kind = (FAMILY_KEYS as readonly string[]).includes(family) ? FAMILY_KIND[family] : 'I';
  const dimsRaw = { h: num(raw['h']), b: num(raw['b']), tw: raw['tw'] ? num(raw['tw']) : undefined, tf: raw['tf'] ? num(raw['tf']) : undefined, r: raw['r'] ? num(raw['r']) : 0, t: raw['t'] ? num(raw['t']) : undefined };
  // kg/m boşsa ölçülerden hesapla
  let kgPerM = raw['kgPerM'] ? num(raw['kgPerM']) : NaN;
  if (!Number.isFinite(kgPerM) || kgPerM <= 0) {
    try { kgPerM = computeSectionProps({ code: String(raw['code']), label: '', family, kind, dims: dimsRaw }).G; } catch { kgPerM = NaN; }
  }
  const parsed = profileSchema.safeParse({ ...raw, family, ...dimsRaw, kgPerM, isActive: raw['isActive'] === 'on' });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const dims: Record<string, number> = { h: v.h, b: v.b };
  for (const k of ['tw', 'tf', 'r', 't'] as const) if (v[k] !== undefined) dims[k] = v[k]!;
  const row = { code: v.code, label: v.label, family: v.family, kind, kg_per_m: Math.round(v.kgPerM * 1000) / 1000, dimensions: dims, is_active: v.isActive };
  const result = v.id ? await client.data.from('steel_profiles').update(row).eq('id', v.id) : await client.data.from('steel_profiles').insert(row);
  if (result.error) {
    logger.error('Profil kaydedilemedi', { module: 'configurator', code: result.error.code, message: result.error.message });
    return failed(dbErrorKey(result.error.code));
  }
  revalidateTag(CACHE_TAGS.configurator);
  revalidatePath('/admin/configurator/profiles');
  return DONE;
}

export async function deleteSteelProfile(formData: FormData): Promise<void> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('steel_profiles').delete().eq('id', id.data);
  if (error) {
    logger.error('Profil silinemedi', { module: 'configurator', code: error.code, message: error.message });
    return;
  }
  revalidateTag(CACHE_TAGS.configurator);
  revalidatePath('/admin/configurator/profiles');
}

// ── Kaydet / paylaş (Faz 28, K-110 biçimi: params = {kind, state})
const saveSchema = z.object({
  params: z.string().max(4000),
  locale: z.enum(['tr', 'en']),
  name: z.string().trim().max(120).optional().or(z.literal('')),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  consentKvkk: z.boolean(),
  configurationId: z.string().uuid().optional().or(z.literal('')),
  token: z.string().uuid().optional().or(z.literal('')),
  website: z.literal(''),
});
async function clientIp(): Promise<string> { return requestIp(await headers()); }

/**
 * Kaydet (K-29/K-30): üye → hesabına; anonim → e-posta + KVKK onayı, token bağlantısı. Metraj ve fiyat SUNUCUDA yeniden hesaplanır
 * (istemci sayısı kabul edilmez); fiyat yalnız üyeye. Var olan kayda yeni sürüm: sahiplik RPC'de doğrulanır.
 */
export async function saveConfiguration(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = saveSchema.safeParse({ ...raw, consentKvkk: raw['consentKvkk'] === 'on', website: String(raw['website'] ?? '') });
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === 'website')) return { ...DONE, data: { token: '', ref: '', version: '1' } };
    return failed('validation', issues(parsed.error));
  }
  const v = parsed.data;
  let body: unknown;
  try { body = JSON.parse(v.params); } catch { return failed('validation', { params: 'validation' }); }
  if (typeof body !== 'object' || body === null || !isEngineKind((body as { kind?: unknown }).kind)) return failed('validation', { params: 'validation' });
  const { kind, raw: rawState } = parseSavedParams(body as Record<string, unknown>);
  const user = await getCurrentUser();
  if (!user) {
    if (!v.email) return failed('validation', { email: 'validation' });
    if (!v.consentKvkk) return failed('validation', { consentKvkk: 'validation' });
  }
  const ip = await clientIp();
  const limit = await rateLimit(`config:${ip || 'unknown'}`, Number(process.env['CONFIG_RATE_LIMIT'] ?? 10) || 10, 600);
  if (!limit.allowed) return failed('rateLimited');

  const [rulesResult, rowsResult, engineRules] = await Promise.all([getCachedRules(), getCachedCatalogRows(), getCachedEngineRules()]);
  const rules = rulesResult.ok ? rulesResult.data : DEFAULT_RULES;
  const run = await runEngine(kind, rawState, toOverrides(engineRules.ok ? engineRules.data[kind] : EMPTY_ENGINE_RULE), rowsResult.ok ? rowsResult.data : [], v.locale);
  const price = user ? computeEnginePrice(run.out, await loadPriceTable(rules)) : null;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { data, error } = await client.data.rpc('save_configuration', {
    p: {
      name: v.name || '',
      locale: v.locale,
      params: { kind, state: run.state },
      owner_email: user ? null : v.email,
      consent_kvkk: v.consentKvkk,
      tonnage_kg: run.out.steelKg > 0 ? Math.round(run.out.steelKg * 1000) / 1000 : null,
      estimated_price: price?.total ?? null,
      currency: price?.currency ?? null,
      price_snapshot: price ? { lines: price.lines, unpriced: price.unpriced, labor_factor: rules.laborFactor } : {},
      items: bomToItems(run.out),
      configuration_id: v.configurationId || null,
      token: v.token || null,
      ip_masked: ip ? createHash('sha256').update(ip.replace(/\.\d+$/, '.0')).digest('hex').slice(0, 16) : null,
    } as Json,
  });
  if (error) {
    logger.error('Konfigurasyon kaydedilemedi', { module: 'configurator', code: error.code, message: error.message });
    return failed(error.code === '22023' ? 'validation' : error.code === '42501' ? 'forbidden' : 'unexpected');
  }
  const out = data as { ref_code?: string; public_token?: string; version?: number } | null;
  return { ...DONE, data: { token: out?.public_token ?? '', ref: out?.ref_code ?? '', version: String(out?.version ?? 1) } };
}

/** Paylaşım bağlantısında fiyat görünsün mü (K-29): sahibi karar verir; RPC sahipliği doğrular. */
export async function setSharing(formData: FormData): Promise<void> {
  const token = z.string().uuid().safeParse(formData.get('token'));
  if (!token.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.rpc('set_configuration_sharing', { p_token: token.data, p_share_price: formData.get('sharePrice') === 'on' });
  if (error) logger.warn('Paylasim ayari kaydedilemedi', { module: 'configurator', code: error.code });
  revalidatePath('/[locale]/(configurator)/configurator/k/[token]', 'page');
}

// ── Admin: genel kurallar (işçilik, fiyat eşlemesi) ve tür bazlı motor ayarları (K-110)
const PRICE_KEYS = ['steel', 'roof_panel', 'wall_panel', 'bolt'] as const;
const code = z.string().trim().regex(/^[A-Za-z0-9.x_-]{0,40}$/);

export async function saveRules(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return failed('forbidden');
  const raw = Object.fromEntries(formData);
  const labor = z.coerce.number().min(1).max(10).safeParse(String(raw['laborFactor'] ?? '').replace(',', '.'));
  if (!labor.success) return failed('validation', { laborFactor: 'validation' });
  const priceMap: Record<string, string> = {};
  for (const k of PRICE_KEYS) {
    const c = code.safeParse(raw[`price_${k}`] ?? '');
    if (!c.success) return failed('validation', { [`price_${k}`]: 'validation' });
    priceMap[k] = c.data;
  }
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  for (const row of [{ key: 'labor_factor', value: labor.data }, { key: 'price_map', value: priceMap }]) {
    const { error } = await client.data.from('configurator_rules').upsert({ key: row.key, value: row.value as Json }, { onConflict: 'key' });
    if (error) { logger.error('Kural kaydedilemedi', { module: 'configurator', key: row.key, code: error.code, message: error.message }); return failed(dbErrorKey(error.code)); }
  }
  revalidateTag(CACHE_TAGS.configurator);
  revalidatePath('/admin/configurator/rules');
  return DONE;
}

/**
 * Tür bazlı motor ayarı: her aralık alanı için min/max/adım/varsayılan, seçim/anahtar alanları için varsayılan, profil alanları için
 * varsayılan katalog kodu, notlar (satır satır, TR/EN). Alan adları `f_<id>_min|max|step|value`, `p_<id>`, `notesTr`, `notesEn`.
 */
export async function saveEngineRule(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return failed('forbidden');
  const kind = formData.get('kind');
  if (!isEngineKind(kind)) return failed('validation', { kind: 'validation' });
  const app = ENGINE_APPS[kind];
  const raw = Object.fromEntries(formData);
  const fields: Record<string, Record<string, number | string | boolean>> = {};
  const errors: Record<string, string> = {};
  for (const f of allFields(app)) {
    const o: Record<string, number | string | boolean> = {};
    if (f.type === 'range') {
      for (const k of ['min', 'max', 'step', 'value'] as const) {
        const text = String(raw[`f_${f.id}_${k}`] ?? '').trim();
        if (!text) continue;
        const n = num(text);
        if (!Number.isFinite(n) || (k === 'step' && n <= 0)) { errors[`f_${f.id}_${k}`] = 'validation'; continue; }
        o[k] = n;
      }
      if (o['min'] !== undefined && o['max'] !== undefined && Number(o['min']) > Number(o['max'])) errors[`f_${f.id}_max`] = 'validation';
    } else if (f.type === 'toggle') {
      const text = String(raw[`f_${f.id}_value`] ?? '');
      if (text === '1' || text === '0') o['value'] = text === '1';
    } else {
      const text = String(raw[`f_${f.id}_value`] ?? '');
      if (text && f.options?.some((x) => String(x.value) === text)) o['value'] = f.options.find((x) => String(x.value) === text)!.value;
    }
    if (Object.keys(o).length) fields[f.id] = o;
  }
  const profiles: Record<string, string> = {};
  for (const p of app.profiles) {
    const c = code.safeParse(raw[`p_${p.id}`] ?? '');
    if (!c.success) { errors[`p_${p.id}`] = 'validation'; continue; }
    if (c.data) profiles[p.id] = c.data;
  }
  if (Object.keys(errors).length) return failed('validation', errors);
  const lines = (k: string) => String(raw[k] ?? '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 10);
  const value = engineRuleSchema.parse({ fields, profiles, notes: { tr: lines('notesTr'), en: lines('notesEn') } });
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { error } = await client.data.from('configurator_rules').upsert({ key: ENGINE_RULE_KEY(kind), value: value as unknown as Json }, { onConflict: 'key' });
  if (error) { logger.error('Motor ayari kaydedilemedi', { module: 'configurator', kind, code: error.code, message: error.message }); return failed(dbErrorKey(error.code)); }
  revalidateTag(CACHE_TAGS.configurator);
  revalidatePath('/admin/configurator/rules');
  return DONE;
}

/** Konfigürasyon → satış (RPC, sales/admin): talebi olmalı; kalemler satış kalemi olur, fiyat satışçı girer. */
export async function convertConfigurationToSale(formData: FormData): Promise<void> {
  const gate = await requireRole(['super_admin', 'admin', 'sales']);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { data, error } = await client.data.rpc('create_sale_from_configuration', { p_configuration_id: id.data });
  if (error || !data) {
    logger.error('Konfigurasyon satisa donusturulemedi', { module: 'configurator', code: error?.code, message: error?.message });
    return;
  }
  revalidatePath(`/admin/configurator/${id.data}`);
  revalidatePath('/admin/configurator');
  revalidatePath('/admin/sales');
  redirect(`/admin/sales/${data}`);
}

export async function archiveConfiguration(formData: FormData): Promise<void> {
  const gate = await requireRole(['super_admin', 'admin', 'sales']);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('configurations').update({ status: 'archived' }).eq('id', id.data);
  if (error) logger.error('Konfigurasyon arsivlenemedi', { module: 'configurator', code: error.code, message: error.message });
  revalidatePath('/admin/configurator');
  revalidatePath(`/admin/configurator/${id.data}`);
}
