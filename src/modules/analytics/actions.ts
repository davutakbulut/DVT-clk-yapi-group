'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { checkbox } from '@/core/content/adminContent';
import { DONE, failed, type ActionState } from '@/lib/formState';
import { writeAnalyticsConfig } from './data/analyticsRepository';

const id = (re: RegExp) => z.string().trim().max(60).regex(re).optional().or(z.literal(''));

/** /admin/settings/analytics — izleyici açık/kapalı, örnekleme, üçüncü parti kimlikleri (K-39: yükleme onaya bağlı). */
export async function saveAnalyticsConfig(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(['super_admin', 'admin']);
  if (!gate.ok) return failed('forbidden');
  const parsed = z
    .object({ sampleRate: z.coerce.number().min(0.01).max(1).default(1), ga4Id: id(/^(G-[A-Z0-9]+)?$/), adsId: id(/^(AW-[0-9]+)?$/), metaPixelId: id(/^([0-9]{5,20})?$/) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed('validation', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation'])));
  const v = parsed.data;
  const result = await writeAnalyticsConfig({ enabled: checkbox(formData, 'enabled'), sampleRate: v.sampleRate, ga4Id: v.ga4Id ?? '', adsId: v.adsId ?? '', metaPixelId: v.metaPixelId ?? '' }, gate.data.id);
  if (!result.ok) return failed('unexpected');
  revalidateTag(CACHE_TAGS.siteSettings);
  revalidatePath('/', 'layout');
  return DONE;
}
