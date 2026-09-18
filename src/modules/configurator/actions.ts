'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { dbErrorKey } from '@/core/content/adminContent';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';

const ADMINS = ['super_admin', 'admin'] as const;
const issues = (error: z.ZodError) => Object.fromEntries(error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation']));

// Kod: ASCII büyük harf/rakam/nokta/x (HEB360, PIPE139.7x6, 2L100x100x10); toLowerCase/toUpperCase Türkçe tuzağı yok → yalnız ASCII kabul edilir (K-16)
const profileSchema = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  code: z.string().trim().regex(/^[A-Za-z0-9.x_-]{2,40}$/),
  family: z.string().trim().min(1).max(40),
  kgPerM: z.coerce.number().positive().max(10000),
  usage: z.enum(['column', 'beam', 'rafter', 'purlin', 'girt', 'bracing', 'wind_column', 'other']).optional().or(z.literal('')),
  isActive: z.boolean(),
});

/** Profil kaydet (yalnız admin; RLS 0008 aynı sınır). kg/m 3 basamak — metraj bu değerle çarpar, uydurma yok (K-55). */
export async function saveSteelProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return failed('forbidden');
  const raw = Object.fromEntries(formData);
  const parsed = profileSchema.safeParse({ ...raw, kgPerM: String(raw['kgPerM'] ?? '').replace(',', '.'), isActive: raw['isActive'] === 'on' });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const row = { code: v.code, family: v.family, kg_per_m: v.kgPerM, usage: v.usage || null, is_active: v.isActive };
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

// ── Faz 28 · kaydet / paylaş
import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/core/auth';
import { rateLimit } from '@/core/rate-limit';
import type { Json } from '@/types/database';
import { parseParams, serializeParams } from './domain/params';
import { computePrice } from './domain/pricing';
import { buildStructure } from './domain/structure';
import { computeTakeoff } from './domain/takeoff';
import { loadPriceTable } from './data/pricesRepository';
import { getCachedWeights } from './data/profilesRepository';
import { DEFAULT_RULES, getCachedRules } from './data/rulesRepository';

const saveSchema = z.object({
  params: z.string().max(200),
  locale: z.enum(['tr', 'en']),
  name: z.string().trim().max(120).optional().or(z.literal('')),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  consentKvkk: z.boolean(),
  configurationId: z.string().uuid().optional().or(z.literal('')),
  token: z.string().uuid().optional().or(z.literal('')),
  website: z.literal(''),
});

async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? '').split(',')[0]?.trim() ?? '';
}

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
  const user = await getCurrentUser();
  if (!user) {
    if (!v.email) return failed('validation', { email: 'validation' });
    if (!v.consentKvkk) return failed('validation', { consentKvkk: 'validation' });
  }
  const ip = await clientIp();
  const limit = await rateLimit(`config:${ip || 'unknown'}`, Number(process.env['CONFIG_RATE_LIMIT'] ?? 10) || 10, 600);
  if (!limit.allowed) return failed('rateLimited');

  const [rulesResult, weightsResult] = await Promise.all([getCachedRules(), getCachedWeights()]);
  const rules = rulesResult.ok ? rulesResult.data : DEFAULT_RULES;
  const weights = weightsResult.ok ? weightsResult.data : { profiles: {}, panels: {} };
  const params = parseParams(new URLSearchParams(v.params), rules.limits);
  const structure = buildStructure(params, { trussThresholdM: rules.trussThresholdM, purlinSpacingM: rules.purlinSpacingM });
  const takeoff = computeTakeoff(structure, rules.profileMap, weights.profiles, weights.panels);
  const price = user ? computePrice(takeoff, await loadPriceTable(rules)) : null;
  const q = new URLSearchParams(serializeParams(params));
  const paramsJson = Object.fromEntries([...q.entries()].map(([k, val]) => [k, k === 'p' || k === 'd' || k === 'c' ? val === '1' : Number(val)]));
  const items = [
    ...takeoff.lines.map((l) => ({ element_group: l.group, profile_code: l.profileCode, piece_count: l.pieces, total_length_m: l.totalLengthM, total_weight_kg: l.totalWeightKg })),
    ...takeoff.panels.map((p) => ({ element_group: `panel_${p.kind}`, piece_count: p.pieces, total_area_m2: p.totalAreaM2, total_weight_kg: p.totalWeightKg })),
    { element_group: 'plates', piece_count: takeoff.plates },
    { element_group: 'bolts', piece_count: takeoff.bolts },
  ];
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { data, error } = await client.data.rpc('save_configuration', {
    p: {
      name: v.name || '',
      locale: v.locale,
      params: paramsJson,
      owner_email: user ? null : v.email,
      consent_kvkk: v.consentKvkk,
      tonnage_kg: takeoff.complete ? takeoff.steelKg + takeoff.panelKg : null,
      estimated_price: price?.total ?? null,
      currency: price?.currency ?? null,
      price_snapshot: price ? { lines: price.lines, unpriced: price.unpriced, labor_factor: rules.laborFactor } : {},
      items,
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

// ── Faz 29 · admin: kurallar, satışa dönüştür
import { redirect } from 'next/navigation';
import { limitsSchema } from './domain/params';
import { DEFAULT_PROFILE_MAP } from './domain/profiles';
import type { ProfileKey } from './domain/structure';

const PROFILE_KEYS = Object.keys(DEFAULT_PROFILE_MAP) as ProfileKey[];
const PRICE_KEYS = ['steel', 'roof_panel', 'wall_panel', 'bolt'] as const;
const code = z.string().trim().regex(/^[A-Za-z0-9.x_-]{0,40}$/);
const rulesSchema = z.object({
  trussThresholdM: z.coerce.number().positive().max(200),
  purlinSpacingM: z.coerce.number().positive().max(5),
  laborFactor: z.coerce.number().min(1).max(10),
  limits: z.string().max(2000),
});

/** Kurallar (configurator_rules, yalnız admin RLS): eşik, aşık aralığı, işçilik, limitler (JSON), profil ve fiyat eşlemeleri. */
export async function saveRules(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return failed('forbidden');
  const raw = Object.fromEntries(formData);
  const parsed = rulesSchema.safeParse({ ...raw, trussThresholdM: String(raw['trussThresholdM'] ?? '').replace(',', '.'), purlinSpacingM: String(raw['purlinSpacingM'] ?? '').replace(',', '.'), laborFactor: String(raw['laborFactor'] ?? '').replace(',', '.') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  let limits: unknown;
  try {
    limits = JSON.parse(parsed.data.limits);
  } catch {
    return failed('validation', { limits: 'validation' });
  }
  const limitsParsed = limitsSchema.safeParse(limits);
  if (!limitsParsed.success) return failed('validation', { limits: 'validation' });
  const profileMap: Record<string, string> = {};
  for (const k of PROFILE_KEYS) {
    const c = code.safeParse(raw[`profile_${k}`] ?? '');
    if (!c.success) return failed('validation', { [`profile_${k}`]: 'validation' });
    profileMap[k] = c.data || DEFAULT_PROFILE_MAP[k];
  }
  const priceMap: Record<string, string> = {};
  for (const k of PRICE_KEYS) {
    const c = code.safeParse(raw[`price_${k}`] ?? '');
    if (!c.success) return failed('validation', { [`price_${k}`]: 'validation' });
    priceMap[k] = c.data;
  }
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const rows = [
    { key: 'limits', value: limitsParsed.data as unknown as Json },
    { key: 'truss_threshold_m', value: parsed.data.trussThresholdM },
    { key: 'purlin_spacing_m', value: parsed.data.purlinSpacingM },
    { key: 'labor_factor', value: parsed.data.laborFactor },
    { key: 'profile_map', value: profileMap },
    { key: 'price_map', value: priceMap },
  ];
  for (const row of rows) {
    const { error } = await client.data.from('configurator_rules').upsert({ key: row.key, value: row.value as Json }, { onConflict: 'key' });
    if (error) {
      logger.error('Kural kaydedilemedi', { module: 'configurator', key: row.key, code: error.code, message: error.message });
      return failed(dbErrorKey(error.code));
    }
  }
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
