'use server';

import { revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { checkbox, dbErrorKey, localized, publishColumns, publishSchema, readPublishedAt, slugMap } from '@/core/content/adminContent';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';
import type { Json } from '@/types/database';
import { CONFIGURATOR_KEYS, parseFaqs, parsePairs } from './domain/types';

const EDITORS = ['super_admin', 'admin', 'editor'] as const;
const uuid = z.string().uuid().optional().or(z.literal(''));
const short = z.string().trim().max(300).optional().or(z.literal(''));
const long = z.string().max(40000).optional().or(z.literal(''));
const issues = (error: z.ZodError) => Object.fromEntries(error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation']));

const schema = publishSchema.extend({
  configuratorKey: z.enum(CONFIGURATOR_KEYS),
  titleTr: z.string().trim().min(1).max(200), titleEn: short,
  heroSummaryTr: short, heroSummaryEn: short,
  bodyTr: long, bodyEn: long,
  benefitsTr: long, benefitsEn: long,
  stepsTr: long, stepsEn: long,
  faqsTr: long, faqsEn: long,
  ctaTitleTr: short, ctaTitleEn: short, ctaLeadTr: short, ctaLeadEn: short, ctaButtonTr: short, ctaButtonEn: short,
  coverImageId: uuid, ogImageId: uuid,
  seoTitleTr: short, seoTitleEn: short, seoDescriptionTr: short, seoDescriptionEn: short, focusKeywordTr: short, focusKeywordEn: short,
  canonicalUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  noindex: z.boolean(), publishEn: z.boolean(), reviewedEn: z.boolean(),
});

/** Konfigüratör rehber sayfası kaydet (K-107). Anahtar tekil: aynı konfigüratöre ikinci sayfa 23505 → validation. */
export async function saveGuide(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = schema.safeParse({ ...Object.fromEntries(formData), noindex: checkbox(formData, 'noindex'), publishEn: checkbox(formData, 'publishEn'), reviewedEn: checkbox(formData, 'reviewedEn') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const slug = slugMap({ slugTr: v.slugTr, slugEn: v.slugEn, titleTr: v.titleTr });
  const existingPublishedAt = v.id ? await readPublishedAt(client.data, 'configurator_pages', v.id) : null;
  const publish = publishColumns(v, { titleEn: v.titleEn ?? '', slugEn: slug['en'] ?? null, hasSlug: true, reviewerId: gate.data.id }, existingPublishedAt);
  if (!publish.ok) return failed('validation', { [publish.field]: 'validation' });
  const row = {
    configurator_key: v.configuratorKey, slug,
    title: localized(v.titleTr, v.titleEn), hero_summary: localized(v.heroSummaryTr, v.heroSummaryEn), body: localized(v.bodyTr, v.bodyEn),
    benefits: parsePairs(v.benefitsTr ?? '', v.benefitsEn ?? '') as unknown as Json,
    steps: parsePairs(v.stepsTr ?? '', v.stepsEn ?? '') as unknown as Json,
    faqs: parseFaqs(v.faqsTr ?? '', v.faqsEn ?? '') as unknown as Json,
    cta: { title: localized(v.ctaTitleTr, v.ctaTitleEn), lead: localized(v.ctaLeadTr, v.ctaLeadEn), button: localized(v.ctaButtonTr, v.ctaButtonEn) } as unknown as Json,
    cover_image_id: v.coverImageId || null, og_image_id: v.ogImageId || null,
    seo_title: localized(v.seoTitleTr, v.seoTitleEn), seo_description: localized(v.seoDescriptionTr, v.seoDescriptionEn), focus_keyword: localized(v.focusKeywordTr, v.focusKeywordEn),
    canonical_url: v.canonicalUrl || null, noindex: v.noindex, ...publish.columns,
  };
  let id = v.id || '';
  if (id) {
    const { error } = await client.data.from('configurator_pages').update(row).eq('id', id);
    if (error) return fail(error);
  } else {
    const { data, error } = await client.data.from('configurator_pages').insert(row).select('id').single();
    if (error) return fail(error);
    id = data.id;
  }
  revalidateTag(CACHE_TAGS.configuratorPages);
  if (!v.id) redirect(`/admin/configurator-pages/${id}`);
  return DONE;
}
function fail(error: { code?: string; message: string }): ActionState {
  logger.error('Rehber sayfasi kaydedilemedi', { module: 'configurator-pages', code: error.code, message: error.message });
  return failed(error.code === '23505' ? 'validation' : dbErrorKey(error.code), error.code === '23505' ? { configuratorKey: 'validation' } : undefined);
}
export async function deleteGuide(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('configurator_pages').delete().eq('id', id.data);
  if (error) { logger.error('Rehber sayfasi silinemedi', { module: 'configurator-pages', code: error.code }); return; }
  revalidateTag(CACHE_TAGS.configuratorPages);
  redirect('/admin/configurator-pages');
}
