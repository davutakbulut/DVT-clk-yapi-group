import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { isVisibleIn, publishedSlugs, slugFor, type Publishable } from '@/core/content';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import type { MediaAsset } from '@/core/storage';
import { isLocalizedText, pickLocale } from '@/lib/localized';

export interface TaxonomyRef {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
}

export interface PostCardData {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly publishedAt: string | null;
  readonly readingMinutes: number | null;
  readonly isFeatured: boolean;
  readonly cover: MediaAsset | null;
  readonly category: { readonly slug: string; readonly name: string } | null;
  readonly tagSlugs: readonly string[];
}

export interface PostDetailData {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly body: string;
  readonly readingMinutes: number | null;
  readonly allowComments: boolean;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
  readonly seo: { readonly title: string | null; readonly description: string | null; readonly canonicalUrl: string | null; readonly noindex: boolean; readonly ogImage: Pick<MediaAsset, 'bucket' | 'path' | 'width' | 'height'> | null };
  readonly alternates: { readonly tr: string | null; readonly en: string | null };
  readonly cover: MediaAsset | null;
  readonly category: { readonly slug: string; readonly name: string } | null;
  readonly tags: readonly { readonly slug: string; readonly name: string }[];
  readonly author: { readonly name: string; readonly position: string | null; readonly bio: string | null; readonly linkedinUrl: string | null; readonly photo: MediaAsset | null } | null;
}

export interface PublishedComment {
  readonly id: string;
  readonly parentId: string | null;
  readonly authorName: string;
  readonly body: string;
  readonly createdAt: string;
}

const MEDIA_SELECT = 'storage_bucket, storage_path, width, height, blur_data_url, alt, variants';
type MediaRow = { storage_bucket: string; storage_path: string; width: number | null; height: number | null; blur_data_url: string | null; alt: unknown; variants: unknown };
type RpcMedia = { bucket: string; path: string; width: number | null; height: number | null; alt?: string | null; blur?: string | null; variants?: unknown } | null;
const rec = (v: unknown): Record<string, string> => (isLocalizedText(v) ? (v as Record<string, string>) : {});
const lt = (v: unknown) => (isLocalizedText(v) ? v : {});
const rowMedia = (m: MediaRow | null): MediaAsset | null => (m ? { bucket: m.storage_bucket, path: m.storage_path, width: m.width, height: m.height, blurDataUrl: m.blur_data_url, alt: rec(m.alt), variants: rec(m.variants) } : null);
const rpcMedia = (m: RpcMedia, locale: string): MediaAsset | null => (m ? { bucket: m.bucket, path: m.path, width: m.width, height: m.height, variants: rec(m.variants), blurDataUrl: m.blur ?? null, alt: m.alt ? { [locale]: m.alt } : {} } : null);

async function fetchTaxonomy(table: 'blog_categories' | 'blog_tags', locale: string): Promise<Result<TaxonomyRef[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const query = table === 'blog_categories' ? client.data.from('blog_categories').select('id, slug, name, description').eq('is_active', true).order('sort_order', { ascending: true, nullsFirst: false }) : client.data.from('blog_tags').select('id, slug, name').order('created_at');
  const { data, error } = await query;
  if (error) return err(appError('external_service', error.message, { module: 'blog' }));
  const out: TaxonomyRef[] = [];
  for (const row of data as { id: string; slug: unknown; name: unknown; description?: unknown }[]) {
    const slug = slugFor(row.slug, locale);
    const name = pickLocale(lt(row.name), locale);
    if (slug && name) out.push({ id: row.id, slug, name, description: pickLocale(lt(row.description), locale) });
  }
  return ok(out);
}

type ListRow = {
  id: string;
  slug: unknown;
  title: unknown;
  excerpt: unknown;
  reading_minutes: unknown;
  is_featured: boolean;
  status: string;
  published_locales: string[];
  published_at: string | null;
  cover: MediaRow | null;
  category: { slug: unknown; name: unknown; is_active: boolean } | null;
  tags: { tag: { slug: unknown } | null }[];
};

async function fetchPostList(locale: string): Promise<Result<PostCardData[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data
    .from('blog_posts')
    .select(`id, slug, title, excerpt, reading_minutes, is_featured, status, published_locales, published_at, cover:media_library!blog_posts_cover_image_id_fkey(${MEDIA_SELECT}), category:blog_categories(slug, name, is_active), tags:blog_post_tags(tag:blog_tags(slug))`)
    .eq('status', 'published')
    .contains('published_locales', [locale])
    .order('published_at', { ascending: false, nullsFirst: false });
  if (error) return err(appError('external_service', error.message, { module: 'blog' }));
  const items: PostCardData[] = [];
  for (const row of data as unknown as ListRow[]) {
    if (!isVisibleIn(row as Publishable, locale)) continue;
    const slug = slugFor(row.slug, locale);
    const title = pickLocale(lt(row.title), locale);
    if (!slug || !title) continue;
    const cSlug = row.category?.is_active ? slugFor(row.category.slug, locale) : null;
    const cName = row.category ? pickLocale(lt(row.category.name), locale) : '';
    const minutes = isLocalizedText(row.reading_minutes) ? Number(row.reading_minutes[locale]) : Number((row.reading_minutes as Record<string, unknown> | null)?.[locale]);
    items.push({
      id: row.id,
      slug,
      title,
      excerpt: pickLocale(lt(row.excerpt), locale),
      publishedAt: row.published_at,
      readingMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
      isFeatured: row.is_featured,
      cover: rowMedia(row.cover),
      category: cSlug && cName ? { slug: cSlug, name: cName } : null,
      tagSlugs: row.tags.flatMap((t) => (t.tag ? [slugFor(t.tag.slug, locale)].filter((s): s is string => Boolean(s)) : [])),
    });
  }
  return ok(items);
}

async function fetchPostBySlug(locale: string, slug: string): Promise<Result<PostDetailData | null>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.rpc('get_blog_post_by_slug', { p_locale: locale, p_slug: slug });
  if (error) return err(appError('external_service', error.message, { module: 'blog' }));
  if (!data || typeof data !== 'object') return ok(null);
  const d = data as Record<string, unknown>;
  const seo = (d['seo'] ?? {}) as { title?: string | null; description?: string | null; canonical_url?: string | null; noindex?: boolean; og_image?: { bucket: string; path: string; width: number | null; height: number | null } | null };
  const author = d['author'] as { name: string; position: string | null; bio: string | null; linkedin_url: string | null; photo: RpcMedia } | null;
  const category = d['category'] as { slug: string | null; name: string | null } | null;
  return ok({
    id: String(d['id']),
    slug: String(d['slug'] ?? ''),
    title: String(d['title'] ?? ''),
    excerpt: String(d['excerpt'] ?? ''),
    body: typeof d['body'] === 'string' ? d['body'] : '',
    readingMinutes: typeof d['reading_minutes'] === 'number' ? d['reading_minutes'] : null,
    allowComments: d['allow_comments'] === true,
    publishedAt: (d['published_at'] as string | null) ?? null,
    updatedAt: String(d['updated_at'] ?? ''),
    seo: { title: seo.title ?? null, description: seo.description ?? null, canonicalUrl: seo.canonical_url ?? null, noindex: seo.noindex === true, ogImage: seo.og_image ?? null },
    alternates: (d['alternates'] as { tr: string | null; en: string | null }) ?? { tr: null, en: null },
    cover: rpcMedia((d['cover'] as RpcMedia) ?? null, locale),
    category: category?.slug && category.name ? { slug: category.slug, name: category.name } : null,
    tags: ((d['tags'] ?? []) as { slug: string | null; name: string | null }[]).filter((t): t is { slug: string; name: string } => Boolean(t.slug && t.name)),
    author: author ? { name: author.name, position: author.position, bio: author.bio, linkedinUrl: author.linkedin_url, photo: rpcMedia(author.photo, locale) } : null,
  });
}

async function fetchPostSlugs(locale: string): Promise<string[]> {
  const client = createPublicClient();
  if (!client.ok) return [];
  return publishedSlugs(client.data, 'blog_posts', locale);
}

export async function resolveOldPostSlug(locale: string, oldSlug: string): Promise<string | null> {
  const client = createPublicClient();
  if (!client.ok) return null;
  const { data } = await client.data.rpc('resolve_old_slug', { p_entity_type: 'blog_post', p_locale: locale, p_old_slug: oldSlug });
  return typeof data === 'string' && data ? data : null;
}

/** Onaylı yorumlar — dar görünümden (e-posta/IP asla). Önbelleklenmez: onay sonrası anında görünmeli. */
export async function fetchPublishedComments(postId: string): Promise<PublishedComment[]> {
  const client = createPublicClient();
  if (!client.ok) return [];
  const { data } = await client.data.from('published_comments').select('id, parent_id, author_name, body, created_at').eq('post_id', postId).order('created_at');
  return (data ?? []).flatMap((c) => (c.id && c.author_name && c.body && c.created_at ? [{ id: c.id, parentId: c.parent_id, authorName: c.author_name, body: c.body, createdAt: c.created_at }] : []));
}

export const getCachedBlogCategories = cached((locale: string) => fetchTaxonomy('blog_categories', locale), ['blog', 'categories'], { tags: [CACHE_TAGS.blog] });
export const getCachedBlogTags = cached((locale: string) => fetchTaxonomy('blog_tags', locale), ['blog', 'tags'], { tags: [CACHE_TAGS.blog] });
export const getCachedPostList = cached(fetchPostList, ['blog', 'list'], { tags: [CACHE_TAGS.blog, CACHE_TAGS.media] });
export const getCachedPostBySlug = cached(fetchPostBySlug, ['blog', 'detail'], { tags: [CACHE_TAGS.blog, CACHE_TAGS.corporate, CACHE_TAGS.media] });
export const getCachedPostSlugs = cached(fetchPostSlugs, ['blog', 'slugs'], { tags: [CACHE_TAGS.blog] });
