import 'server-only';
import { z } from 'zod';
import type { ServerDbClient } from '@/core/db/createServerClient';
import { localized } from '@/lib/localized';
import { slugify } from '@/lib/slugify';

export { localized };

/** Admin formlarındaki ortak yayın alanları. */
export const publishSchema = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  publishEn: z.coerce.boolean().default(false),
  reviewedEn: z.coerce.boolean().default(false),
  slugTr: z.string().trim().max(80).optional().or(z.literal('')),
  slugEn: z.string().trim().max(80).optional().or(z.literal('')),
});
export type PublishInput = z.infer<typeof publishSchema>;

export function checkbox(formData: FormData, name: string): boolean {
  const v = formData.get(name);
  return v === 'on' || v === 'true';
}

/**
 * Slug haritası: TR zorunlu (başlıktan üretilir), EN yalnız elle (K-09). DB CHECK'i ile aynı slugify.
 */
export function slugMap(input: { slugTr?: string; slugEn?: string; titleTr: string }): Record<string, string> {
  const tr = slugify(input.slugTr || input.titleTr);
  const out: Record<string, string> = { tr };
  const en = input.slugEn ? slugify(input.slugEn) : '';
  if (en) out['en'] = en;
  return out;
}

/**
 * Yayın kolonları (K-07/K-08): EN yalnız insan onayı + EN başlık + (slug'lı tablolarda) EN slug ile yayına girer.
 * DB kısıtı (is_publishable) da zorlar; burada anlaşılır hata için.
 */
export function publishColumns(input: PublishInput, opts: { readonly titleEn: string; readonly slugEn?: string | null; readonly hasSlug: boolean; readonly reviewerId: string }, existingPublishedAt: string | null) {
  const wantsEn = input.publishEn;
  const canEn = input.reviewedEn && opts.titleEn.trim() !== '' && (!opts.hasSlug || Boolean(opts.slugEn));
  if (wantsEn && !canEn) return { ok: false as const, field: 'publishEn' };
  const locales = ['tr', ...(wantsEn ? ['en'] : [])];
  return {
    ok: true as const,
    columns: {
      status: input.status,
      published_locales: locales,
      published_at: input.status === 'published' ? (existingPublishedAt ?? new Date().toISOString()) : existingPublishedAt,
      translation_meta: { en: { machine: false, reviewed: input.reviewedEn, reviewed_by: input.reviewedEn ? opts.reviewerId : null } },
    },
  };
}

/** Postgres hata kodunu ActionState anahtarına çevirir. */
export function dbErrorKey(code: string | undefined): 'forbidden' | 'validation' | 'unexpected' {
  if (code === '42501') return 'forbidden';
  if (code === '23505' || code === '23514' || code === '23502') return 'validation';
  return 'unexpected';
}

export async function readPublishedAt(client: ServerDbClient, table: string, id: string): Promise<string | null> {
  const { data } = await client.from(table as never).select('published_at').eq('id', id).maybeSingle();
  return (data as { published_at?: string | null } | null)?.published_at ?? null;
}
