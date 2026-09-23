import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { isLocalizedText, type LocalizedText } from '@/lib/localized';

export interface AdminPostRow {
  readonly id: string;
  readonly title: LocalizedText;
  readonly slug: LocalizedText;
  readonly status: string;
  readonly published_locales: readonly string[];
  readonly published_at: string | null;
  readonly is_featured: boolean;
  readonly categoryName: string;
  /** Kapak küçük resmi için medya gömüsü (liste, K-87). */
  readonly thumb?: { readonly storage_path: string; readonly variants: unknown } | null;
}

export interface AdminPost extends Omit<AdminPostRow, 'categoryName'> {
  readonly excerpt: LocalizedText;
  readonly body: LocalizedText;
  readonly category_id: string | null;
  readonly author_id: string | null;
  readonly cover_image_id: string | null;
  readonly og_image_id: string | null;
  readonly allow_comments: boolean;
  readonly seo_title: LocalizedText;
  readonly seo_description: LocalizedText;
  readonly focus_keyword: LocalizedText;
  readonly canonical_url: string | null;
  readonly noindex: boolean;
  readonly reviewedEn: boolean;
  readonly tagIds: readonly string[];
}

export interface Choice {
  readonly id: string;
  readonly label: string;
}

export interface Taxonomy {
  readonly id: string;
  readonly slug: LocalizedText;
  readonly name: LocalizedText;
  readonly description: LocalizedText;
  readonly is_active: boolean;
}

export interface AdminComment {
  readonly id: string;
  readonly post_id: string;
  readonly postTitle: string;
  readonly parent_id: string | null;
  readonly author_name: string;
  readonly author_email: string | null;
  readonly body: string;
  readonly status: string;
  readonly locale: string;
  readonly created_at: string;
}

const lt = (v: unknown): LocalizedText => (isLocalizedText(v) ? v : {});
const LIST = 'id, title, slug, status, published_locales, published_at, is_featured';

export async function listPostsForAdmin(): Promise<Result<AdminPostRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('blog_posts').select(`${LIST}, category:blog_categories(name), thumb:media_library!blog_posts_cover_image_id_fkey(storage_path, variants)`).order('published_at', { ascending: false, nullsFirst: true }).order('created_at', { ascending: false });
  if (error) return err(appError('external_service', error.message, { module: 'blog' }));
  return ok(data.map((r) => ({ ...r, title: lt(r.title), slug: lt(r.slug), categoryName: lt((r.category as { name?: unknown } | null)?.name)['tr'] ?? '' })));
}

/** Form seçenekleri + SEO paneli için diğer yazıların odak kelimeleri ve giriş paragrafları. */
export async function listPostChoices(excludeId?: string): Promise<Result<{ images: { id: string; path: string; mime: string }[]; categories: Choice[]; tags: Choice[]; authors: Choice[]; otherKeywords: Record<'tr' | 'en', string[]>; otherIntros: Record<'tr' | 'en', string[]> }>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [images, categories, tags, authors, others] = await Promise.all([
    client.data.from('media_library').select('id, storage_path, mime_type').like('mime_type', 'image/%').order('created_at', { ascending: false }).limit(500),
    client.data.from('blog_categories').select('id, name').order('sort_order', { ascending: true, nullsFirst: false }),
    client.data.from('blog_tags').select('id, name').order('created_at'),
    client.data.from('team_members').select('id, full_name').order('sort_order', { ascending: true, nullsFirst: false }),
    client.data.from('blog_posts').select('id, focus_keyword, body').limit(500),
  ]);
  const failure = images.error ?? categories.error ?? tags.error ?? authors.error ?? others.error;
  if (failure) return err(appError('external_service', failure.message, { module: 'blog' }));
  const otherKeywords: Record<'tr' | 'en', string[]> = { tr: [], en: [] };
  const otherIntros: Record<'tr' | 'en', string[]> = { tr: [], en: [] };
  for (const p of others.data ?? []) {
    if (p.id === excludeId) continue;
    for (const locale of ['tr', 'en'] as const) {
      const kw = lt(p.focus_keyword)[locale];
      if (kw) otherKeywords[locale].push(kw);
      const body = lt(p.body)[locale];
      if (body) otherIntros[locale].push(body.split(/\s+/).slice(0, 300).join(' '));
    }
  }
  return ok({
    images: (images.data ?? []).map((m) => ({ id: m.id, path: m.storage_path, mime: m.mime_type })),
    categories: (categories.data ?? []).map((c) => ({ id: c.id, label: lt(c.name)['tr'] ?? '' })),
    tags: (tags.data ?? []).map((t) => ({ id: t.id, label: lt(t.name)['tr'] ?? '' })),
    authors: (authors.data ?? []).map((a) => ({ id: a.id, label: a.full_name })),
    otherKeywords,
    otherIntros,
  });
}

export async function getPostForAdmin(id: string): Promise<Result<AdminPost | null>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [post, tags] = await Promise.all([
    client.data.from('blog_posts').select(`${LIST}, excerpt, body, category_id, author_id, cover_image_id, og_image_id, allow_comments, seo_title, seo_description, focus_keyword, canonical_url, noindex, translation_meta`).eq('id', id).maybeSingle(),
    client.data.from('blog_post_tags').select('tag_id').eq('post_id', id),
  ]);
  const failure = post.error ?? tags.error;
  if (failure) return err(appError('external_service', failure.message, { module: 'blog' }));
  if (!post.data) return ok(null);
  const r = post.data;
  const meta = (r.translation_meta ?? {}) as { en?: { reviewed?: boolean } };
  return ok({ ...r, title: lt(r.title), slug: lt(r.slug), excerpt: lt(r.excerpt), body: lt(r.body), seo_title: lt(r.seo_title), seo_description: lt(r.seo_description), focus_keyword: lt(r.focus_keyword), reviewedEn: meta.en?.reviewed === true, tagIds: (tags.data ?? []).map((t) => t.tag_id) });
}

export async function listTaxonomyForAdmin(table: 'blog_categories' | 'blog_tags'): Promise<Result<Taxonomy[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = table === 'blog_categories' ? await client.data.from('blog_categories').select('id, slug, name, description, is_active').order('sort_order', { ascending: true, nullsFirst: false }) : await client.data.from('blog_tags').select('id, slug, name').order('created_at');
  if (error) return err(appError('external_service', error.message, { module: 'blog' }));
  return ok((data as { id: string; slug: unknown; name: unknown; description?: unknown; is_active?: boolean }[]).map((r) => ({ id: r.id, slug: lt(r.slug), name: lt(r.name), description: lt(r.description), is_active: r.is_active ?? true })));
}

export async function listCommentsForAdmin(status: string | null): Promise<Result<AdminComment[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  let query = client.data.from('post_comments').select('id, post_id, parent_id, author_name, author_email, body, status, locale, created_at, post:blog_posts(title)').order('created_at', { ascending: false }).limit(200);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return err(appError('external_service', error.message, { module: 'blog' }));
  return ok(data.map((c) => ({ ...c, postTitle: lt((c.post as { title?: unknown } | null)?.title)['tr'] ?? '' })));
}
