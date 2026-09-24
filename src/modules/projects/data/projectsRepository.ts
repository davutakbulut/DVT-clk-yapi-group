import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { isVisibleIn, publishedSlugs, slugFor, type Publishable } from '@/core/content';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import type { MediaAsset } from '@/core/storage';
import { isLocalizedText, pickLocale } from '@/lib/localized';

export interface CategoryRef {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly drawing: string | null;
}

export interface ProjectCardData {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly location: string;
  readonly isFeatured: boolean;
  readonly completedOn: string | null;
  readonly cover: MediaAsset | null;
  readonly categories: readonly Pick<CategoryRef, 'slug' | 'name'>[];
  /** K-106: aşama, yıl, alan, tonaj, süre etiketi, teknik çizim */
  readonly phase: 'completed' | 'ongoing' | 'design';
  readonly year: number | null;
  readonly areaM2: number | null;
  readonly tonnage: number | null;
  readonly duration: string;
  readonly drawing: string | null;
}

export interface ProjectImage extends MediaAsset {
  readonly caption: string | null;
}

export interface ProjectDetailData {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly excerpt: string;
  readonly body: string;
  readonly location: string;
  readonly clientName: string | null;
  readonly areaM2: number | null;
  readonly tonnage: number | null;
  readonly startedOn: string | null;
  readonly completedOn: string | null;
  readonly publishedAt: string | null;
  readonly updatedAt: string;
  readonly seo: { readonly title: string | null; readonly description: string | null; readonly canonicalUrl: string | null; readonly noindex: boolean };
  readonly alternates: { readonly tr: string | null; readonly en: string | null };
  readonly cover: MediaAsset | null;
  readonly images: readonly ProjectImage[];
  readonly categories: readonly { readonly slug: string; readonly name: string }[];
  readonly services: readonly { readonly slug: string; readonly title: string }[];
}

const MEDIA_SELECT = 'storage_bucket, storage_path, width, height, blur_data_url, alt, variants';
type MediaRow = { storage_bucket: string; storage_path: string; width: number | null; height: number | null; blur_data_url: string | null; alt: unknown; variants: unknown };
type RpcMedia = { bucket: string; path: string; width: number | null; height: number | null; alt?: string | null; blur?: string | null; variants?: unknown } | null;
const rec = (v: unknown): Record<string, string> => (isLocalizedText(v) ? (v as Record<string, string>) : {});
const lt = (v: unknown) => (isLocalizedText(v) ? v : {});

function rowMedia(m: MediaRow | null): MediaAsset | null {
  return m ? { bucket: m.storage_bucket, path: m.storage_path, width: m.width, height: m.height, blurDataUrl: m.blur_data_url, alt: rec(m.alt), variants: rec(m.variants) } : null;
}
function rpcMedia(m: RpcMedia, locale: string): MediaAsset | null {
  if (!m) return null;
  return { bucket: m.bucket, path: m.path, width: m.width, height: m.height, variants: rec(m.variants), blurDataUrl: m.blur ?? null, alt: m.alt ? { [locale]: m.alt } : {} };
}

async function fetchCategories(locale: string): Promise<Result<CategoryRef[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('project_categories').select('id, slug, name, description, drawing_key').eq('is_active', true).order('sort_order', { ascending: true, nullsFirst: false });
  if (error) return err(appError('external_service', error.message, { module: 'projects' }));
  const out: CategoryRef[] = [];
  for (const c of data) {
    const slug = slugFor(c.slug, locale);
    const name = pickLocale(lt(c.name), locale);
    if (slug && name) out.push({ id: c.id, slug, name, description: pickLocale(lt(c.description), locale), drawing: c.drawing_key });
  }
  return ok(out);
}

type ListRow = {
  id: string;
  slug: unknown;
  title: unknown;
  excerpt: unknown;
  location: unknown;
  is_featured: boolean;
  completed_on: string | null;
  phase: string;
  year: number | null;
  area_m2: number | null;
  tonnage: number | string | null;
  duration_label: unknown;
  drawing_key: string | null;
  status: string;
  published_locales: string[];
  published_at: string | null;
  cover: MediaRow | null;
  relations: { category: { slug: unknown; name: unknown; drawing_key?: string | null; is_active: boolean } | null }[];
};

async function fetchProjectList(locale: string): Promise<Result<ProjectCardData[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data
    .from('projects')
    .select(`id, slug, title, excerpt, location, is_featured, completed_on, phase, year, area_m2, tonnage, duration_label, drawing_key, status, published_locales, published_at, cover:media_library!projects_cover_image_id_fkey(${MEDIA_SELECT}), relations:project_category_relations(category:project_categories(slug, name, drawing_key, is_active))`)
    .eq('status', 'published')
    .contains('published_locales', [locale])
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('completed_on', { ascending: false, nullsFirst: false });
  if (error) return err(appError('external_service', error.message, { module: 'projects' }));
  const items: ProjectCardData[] = [];
  for (const row of data as unknown as ListRow[]) {
    if (!isVisibleIn(row as Publishable, locale)) continue;
    const slug = slugFor(row.slug, locale);
    const title = pickLocale(lt(row.title), locale);
    if (!slug || !title) continue;
    const categories = row.relations.flatMap((r) => {
      const c = r.category;
      const cSlug = c && c.is_active ? slugFor(c.slug, locale) : null;
      const name = c ? pickLocale(lt(c.name), locale) : '';
      return cSlug && name ? [{ slug: cSlug, name }] : [];
    });
    const catDrawing = row.relations.map((r) => r.category?.drawing_key ?? null).find((d) => d) ?? null;
    items.push({ id: row.id, slug, title, excerpt: pickLocale(lt(row.excerpt), locale), location: pickLocale(lt(row.location), locale), isFeatured: row.is_featured, completedOn: row.completed_on, cover: rowMedia(row.cover), categories,
      phase: row.phase === 'ongoing' || row.phase === 'design' ? row.phase : 'completed', year: row.year ?? (row.completed_on ? Number(row.completed_on.slice(0, 4)) : null), areaM2: row.area_m2 === null ? null : Number(row.area_m2), tonnage: row.tonnage === null ? null : Number(row.tonnage), duration: pickLocale(lt(row.duration_label), locale), drawing: row.drawing_key ?? catDrawing });
  }
  return ok(items);
}

async function fetchProjectBySlug(locale: string, slug: string): Promise<Result<ProjectDetailData | null>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.rpc('get_project_by_slug', { p_locale: locale, p_slug: slug });
  if (error) return err(appError('external_service', error.message, { module: 'projects' }));
  if (!data || typeof data !== 'object') return ok(null);
  const d = data as Record<string, unknown>;
  const seo = (d['seo'] ?? {}) as { title?: string | null; description?: string | null; canonical_url?: string | null; noindex?: boolean };
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return ok({
    id: String(d['id']),
    slug: String(d['slug'] ?? ''),
    title: String(d['title'] ?? ''),
    excerpt: String(d['excerpt'] ?? ''),
    body: typeof d['body'] === 'string' ? d['body'] : '',
    location: String(d['location'] ?? ''),
    clientName: (d['client_name'] as string | null) ?? null,
    areaM2: num(d['area_m2']),
    tonnage: num(d['tonnage']),
    startedOn: (d['started_on'] as string | null) ?? null,
    completedOn: (d['completed_on'] as string | null) ?? null,
    publishedAt: (d['published_at'] as string | null) ?? null,
    updatedAt: String(d['updated_at'] ?? ''),
    seo: { title: seo.title ?? null, description: seo.description ?? null, canonicalUrl: seo.canonical_url ?? null, noindex: seo.noindex === true },
    alternates: (d['alternates'] as { tr: string | null; en: string | null }) ?? { tr: null, en: null },
    cover: rpcMedia((d['cover'] as RpcMedia) ?? null, locale),
    images: ((d['images'] ?? []) as (NonNullable<RpcMedia> & { caption?: string | null })[]).map((m) => ({ ...rpcMedia(m, locale)!, caption: m.caption ?? null })),
    categories: ((d['categories'] ?? []) as { slug: string | null; name: string | null }[]).filter((c): c is { slug: string; name: string } => Boolean(c.slug && c.name)),
    services: ((d['services'] ?? []) as { slug: string | null; title: string | null }[]).filter((s): s is { slug: string; title: string } => Boolean(s.slug && s.title)),
  });
}

async function fetchProjectSlugs(locale: string): Promise<string[]> {
  const client = createPublicClient();
  if (!client.ok) return [];
  return publishedSlugs(client.data, 'projects', locale);
}

export async function resolveOldProjectSlug(locale: string, oldSlug: string): Promise<string | null> {
  const client = createPublicClient();
  if (!client.ok) return null;
  const { data } = await client.data.rpc('resolve_old_slug', { p_entity_type: 'project', p_locale: locale, p_old_slug: oldSlug });
  return typeof data === 'string' && data ? data : null;
}

export const getCachedProjectCategories = cached(fetchCategories, ['projects', 'categories'], { tags: [CACHE_TAGS.projects] });
export const getCachedProjectList = cached(fetchProjectList, ['projects', 'list'], { tags: [CACHE_TAGS.projects, CACHE_TAGS.media] });
export const getCachedProjectBySlug = cached(fetchProjectBySlug, ['projects', 'detail'], { tags: [CACHE_TAGS.projects, CACHE_TAGS.services, CACHE_TAGS.media] });
export const getCachedProjectSlugs = cached(fetchProjectSlugs, ['projects', 'slugs'], { tags: [CACHE_TAGS.projects] });
