import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import type { MediaAsset } from '@/core/storage';
import { isLocalizedText, pickLocale } from '@/lib/localized';

export interface TestimonialData {
  readonly id: string;
  readonly source: 'manual' | 'google' | 'visitor';
  readonly authorName: string;
  readonly authorTitle: string;
  readonly company: string | null;
  readonly rating: number;
  readonly body: string;
  readonly isVerified: boolean;
  /** Örnek (tasarım önizleme) kaydı: "Örnek" rozetiyle görünür; ortalamaya ve JSON-LD'ye girmez (K-78). */
  readonly isSample: boolean;
  readonly isFeatured: boolean;
  readonly reviewedOn: string | null;
  readonly avatar: MediaAsset | null;
  readonly avatarUrl: string | null;
  readonly serviceId: string | null;
  readonly projectId: string | null;
  readonly productId: string | null;
}

const MEDIA_SELECT = 'storage_bucket, storage_path, width, height, blur_data_url, alt, variants';
type MediaRow = { storage_bucket: string; storage_path: string; width: number | null; height: number | null; blur_data_url: string | null; alt: unknown; variants: unknown };
const rec = (v: unknown): Record<string, string> => (isLocalizedText(v) ? (v as Record<string, string>) : {});

/** Yayındaki yorumlar: öne çıkan önce, sonra tarih. Gövde o dilde yoksa orijinal dil gösterilir (çeviri beklemez; kaynak metin gerçek). */
async function fetchTestimonials(locale: string): Promise<Result<TestimonialData[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data
    .from('testimonials')
    .select(`id, source, author_name, author_title, company, rating, body, original_locale, is_verified, is_featured, is_sample, reviewed_on, avatar_url, service_id, project_id, product_id, avatar:media_library!testimonials_avatar_id_fkey(${MEDIA_SELECT})`)
    .eq('status', 'published')
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('reviewed_on', { ascending: false, nullsFirst: false })
    .limit(100);
  if (error) return err(appError('external_service', error.message, { module: 'testimonials' }));
  const items: TestimonialData[] = [];
  for (const row of data) {
    const bodyMap = rec(row.body);
    const body = pickLocale(bodyMap, locale) || (row.original_locale ? (bodyMap[row.original_locale] ?? '') : '') || Object.values(bodyMap)[0] || '';
    if (!body) continue;
    const avatar = row.avatar as MediaRow | null;
    items.push({
      id: row.id,
      source: row.source as TestimonialData['source'],
      authorName: row.author_name,
      authorTitle: pickLocale(rec(row.author_title), locale),
      company: row.company,
      rating: row.rating,
      body,
      isVerified: row.is_verified,
      isSample: row.is_sample,
      isFeatured: row.is_featured,
      reviewedOn: row.reviewed_on,
      avatar: avatar ? { bucket: avatar.storage_bucket, path: avatar.storage_path, width: avatar.width, height: avatar.height, blurDataUrl: avatar.blur_data_url, alt: rec(avatar.alt), variants: rec(avatar.variants) } : null,
      avatarUrl: row.avatar_url,
      serviceId: row.service_id,
      projectId: row.project_id,
      productId: row.product_id,
    });
  }
  return ok(items);
}

export const getCachedTestimonials = cached(fetchTestimonials, ['testimonials', 'list'], { tags: [CACHE_TAGS.testimonials, CACHE_TAGS.media] });

/** Bir varlığa bağlı yayındaki yorumlar (hizmet/proje/ürün detayı). */
export async function getCachedTestimonialsFor(locale: string, entity: { readonly serviceId?: string; readonly projectId?: string; readonly productId?: string }): Promise<TestimonialData[]> {
  const all = await getCachedTestimonials(locale);
  if (!all.ok) return [];
  return all.data.filter((t) => (entity.serviceId && t.serviceId === entity.serviceId) || (entity.projectId && t.projectId === entity.projectId) || (entity.productId && t.productId === entity.productId));
}
