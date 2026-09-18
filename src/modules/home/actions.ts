'use server';

import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { checkbox, dbErrorKey, localized, publishColumns } from '@/core/content/adminContent';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';
import type { Json } from '@/types/database';
import { parseStats } from './domain/stats';

const EDITORS = ['super_admin', 'admin', 'editor'] as const;
const uuid = z.string().uuid().optional().or(z.literal(''));
const text = z.string().trim().max(300).optional().or(z.literal(''));
const issues = (error: z.ZodError) => Object.fromEntries(error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation']));

const heroSchema = z.object({
  id: uuid,
  label: z.string().trim().max(80).optional().or(z.literal('')),
  desktopVideoId: uuid,
  mobileVideoId: uuid,
  desktopPosterId: uuid,
  mobilePosterId: uuid,
  durationSeconds: z.coerce.number().min(0).max(60).optional(),
  headlineTr: text,
  headlineEn: text,
  subheadlineTr: text,
  subheadlineEn: text,
  ctaLabelTr: text,
  ctaLabelEn: text,
  ctaPath: z.string().trim().regex(/^\/[a-z0-9-]*(\/[a-z0-9-]+)*$/).optional().or(z.literal('')),
  isActive: z.boolean(),
});

export async function saveHero(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = heroSchema.safeParse({ ...Object.fromEntries(formData), isActive: checkbox(formData, 'isActive') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const row = {
    label: v.label || 'main',
    desktop_video_id: v.desktopVideoId || null,
    mobile_video_id: v.mobileVideoId || null,
    desktop_poster_id: v.desktopPosterId || null,
    mobile_poster_id: v.mobilePosterId || null,
    duration_seconds: v.durationSeconds ?? null,
    headline: localized(v.headlineTr, v.headlineEn),
    subheadline: localized(v.subheadlineTr, v.subheadlineEn),
    cta_label: localized(v.ctaLabelTr, v.ctaLabelEn),
    cta_path: v.ctaPath || null,
    is_active: v.isActive,
  };
  // Tek aktif hero (unique partial index): önce diğerleri pasife alınır.
  if (v.isActive) await client.data.from('hero_media').update({ is_active: false }).neq('id', v.id || '00000000-0000-0000-0000-000000000000');
  const { error } = v.id ? await client.data.from('hero_media').update(row).eq('id', v.id) : await client.data.from('hero_media').insert(row);
  if (error) {
    logger.error('Hero kaydedilemedi', { module: 'home', code: error.code, message: error.message });
    return failed(dbErrorKey(error.code));
  }
  revalidateTag(CACHE_TAGS.hero);
  return DONE;
}

const aboutSchema = z.object({
  eyebrowTr: text,
  eyebrowEn: text,
  titleTr: z.string().trim().min(1).max(200),
  titleEn: text,
  bodyTr: z.string().max(20000).optional().or(z.literal('')),
  bodyEn: z.string().max(20000).optional().or(z.literal('')),
  imageId: uuid,
  stats: z.string().max(4000).optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  publishEn: z.boolean(),
  reviewedEn: z.boolean(),
});

export async function saveAbout(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = aboutSchema.safeParse({ ...Object.fromEntries(formData), publishEn: checkbox(formData, 'publishEn'), reviewedEn: checkbox(formData, 'reviewedEn') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { data: existing } = await client.data.from('about_content').select('published_at').eq('key', 'main').maybeSingle();
  const publish = publishColumns({ id: '', status: v.status, publishEn: v.publishEn, reviewedEn: v.reviewedEn, slugTr: '', slugEn: '' }, { titleEn: v.titleEn ?? '', hasSlug: false, reviewerId: gate.data.id }, existing?.published_at ?? null);
  if (!publish.ok) return failed('validation', { [publish.field]: 'validation' });
  const { error } = await client.data
    .from('about_content')
    .update({ eyebrow: localized(v.eyebrowTr, v.eyebrowEn), title: localized(v.titleTr, v.titleEn), body: localized(v.bodyTr, v.bodyEn), image_id: v.imageId || null, stats: parseStats(v.stats ?? '') as unknown as Json, ...publish.columns })
    .eq('key', 'main');
  if (error) {
    logger.error('Hakkımızda kaydedilemedi', { module: 'home', code: error.code, message: error.message });
    return failed(dbErrorKey(error.code));
  }
  revalidateTag(CACHE_TAGS.about);
  return DONE;
}
