'use server';

import { createHash } from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getCurrentUser, requireRole } from '@/core/auth';
import { CACHE_TAGS } from '@/core/cache/tags';
import { checkbox, dbErrorKey, localized, publishColumns, publishSchema, readPublishedAt, slugMap } from '@/core/content/adminContent';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';
import { readingMinutes } from '@/lib/markdown';
import type { Json } from '@/types/database';

const EDITORS = ['super_admin', 'admin', 'editor'] as const;
const uuid = z.string().uuid().optional().or(z.literal(''));
const short = z.string().trim().max(300).optional().or(z.literal(''));
const long = z.string().max(120000).optional().or(z.literal(''));
const issues = (error: z.ZodError) => Object.fromEntries(error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation']));
const ids = (formData: FormData, name: string) => formData.getAll(name).map(String).filter((v) => z.string().uuid().safeParse(v).success);

function fail(what: string, error: { code?: string; message: string }): ActionState {
  logger.error(what, { module: 'blog', code: error.code, message: error.message });
  return failed(dbErrorKey(error.code));
}

const postSchema = publishSchema.extend({
  titleTr: z.string().trim().min(1).max(200),
  titleEn: short,
  excerptTr: short,
  excerptEn: short,
  bodyTr: long,
  bodyEn: long,
  categoryId: uuid,
  authorId: uuid,
  coverImageId: uuid,
  ogImageId: uuid,
  publishedAt: z.string().trim().optional().or(z.literal('')),
  isFeatured: z.boolean(),
  allowComments: z.boolean(),
  seoTitleTr: short,
  seoTitleEn: short,
  seoDescriptionTr: short,
  seoDescriptionEn: short,
  focusKeywordTr: short,
  focusKeywordEn: short,
  canonicalUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  noindex: z.boolean(),
  publishEn: z.boolean(),
  reviewedEn: z.boolean(),
  revisionNote: short,
});

export async function savePost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = postSchema.safeParse({
    ...Object.fromEntries(formData),
    isFeatured: checkbox(formData, 'isFeatured'),
    allowComments: checkbox(formData, 'allowComments'),
    noindex: checkbox(formData, 'noindex'),
    publishEn: checkbox(formData, 'publishEn'),
    reviewedEn: checkbox(formData, 'reviewedEn'),
  });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const scheduled = v.publishedAt ? new Date(v.publishedAt) : null;
  if (scheduled && Number.isNaN(scheduled.getTime())) return failed('validation', { publishedAt: 'validation' });
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');

  const slug = slugMap({ slugTr: v.slugTr, slugEn: v.slugEn, titleTr: v.titleTr });
  const existingPublishedAt = v.id ? await readPublishedAt(client.data, 'blog_posts', v.id) : null;
  const publish = publishColumns(v, { titleEn: v.titleEn ?? '', slugEn: slug['en'] ?? null, hasSlug: true, reviewerId: gate.data.id }, existingPublishedAt);
  if (!publish.ok) return failed('validation', { [publish.field]: 'validation' });
  // Zamanlama: tarih verildiyse (gelecek olabilir) published_at odur; K-07 isVisibleIn gelecekteki tarihi gizler.
  const columns = { ...publish.columns, published_at: scheduled ? scheduled.toISOString() : publish.columns.published_at };

  const minutes: Record<string, number> = {};
  if (v.bodyTr?.trim()) minutes['tr'] = readingMinutes(v.bodyTr);
  if (v.bodyEn?.trim()) minutes['en'] = readingMinutes(v.bodyEn);

  const row = {
    slug,
    title: localized(v.titleTr, v.titleEn),
    excerpt: localized(v.excerptTr, v.excerptEn),
    body: localized(v.bodyTr, v.bodyEn),
    category_id: v.categoryId || null,
    author_id: v.authorId || null,
    cover_image_id: v.coverImageId || null,
    og_image_id: v.ogImageId || null,
    reading_minutes: minutes as Json,
    is_featured: v.isFeatured,
    allow_comments: v.allowComments,
    seo_title: localized(v.seoTitleTr, v.seoTitleEn),
    seo_description: localized(v.seoDescriptionTr, v.seoDescriptionEn),
    focus_keyword: localized(v.focusKeywordTr, v.focusKeywordEn),
    canonical_url: v.canonicalUrl || null,
    noindex: v.noindex,
    ...columns,
  };

  let id = v.id || '';
  if (id) {
    const { error } = await client.data.from('blog_posts').update(row).eq('id', id);
    if (error) return fail('Yazi kaydedilemedi', error);
  } else {
    const { data, error } = await client.data.from('blog_posts').insert(row).select('id').single();
    if (error) return fail('Yazi kaydedilemedi', error);
    id = data.id;
  }
  const del = await client.data.from('blog_post_tags').delete().eq('post_id', id);
  if (del.error) return fail('Etiketler kaydedilemedi', del.error);
  const tagIds = ids(formData, 'tags');
  if (tagIds.length > 0) {
    const ins = await client.data.from('blog_post_tags').insert(tagIds.map((tag_id) => ({ post_id: id, tag_id })));
    if (ins.error) return fail('Etiketler kaydedilemedi', ins.error);
  }
  // Revizyon: her kayıt bir anlık görüntü (02-ADMIN-PANEL). Hata yazımı durdurmaz.
  const snapshot = { title: row.title, excerpt: row.excerpt, body: row.body, slug: row.slug, status: row.status, published_locales: row.published_locales } as Json;
  const rev = await client.data.from('content_revisions').insert({ entity_type: 'blog_post', entity_id: id, snapshot, note: v.revisionNote || null, created_by: gate.data.id });
  if (rev.error) logger.warn('Revizyon yazilamadi', { module: 'blog', code: rev.error.code });

  revalidateTag(CACHE_TAGS.blog);
  if (!v.id) redirect(`/admin/blog/${id}`);
  return DONE;
}

export async function deletePost(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('blog_posts').delete().eq('id', id.data);
  if (error) {
    logger.error('Yazi silinemedi', { module: 'blog', code: error.code, message: error.message });
    return;
  }
  revalidateTag(CACHE_TAGS.blog);
  redirect('/admin/blog');
}

const taxonomySchema = z.object({
  id: uuid,
  table: z.enum(['blog_categories', 'blog_tags']),
  nameTr: z.string().trim().min(1).max(120),
  nameEn: short,
  slugTr: z.string().trim().max(80).optional().or(z.literal('')),
  slugEn: z.string().trim().max(80).optional().or(z.literal('')),
  descriptionTr: short,
  descriptionEn: short,
  isActive: z.boolean(),
});

export async function saveTaxonomy(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return failed('forbidden');
  const parsed = taxonomySchema.safeParse({ ...Object.fromEntries(formData), isActive: checkbox(formData, 'isActive') });
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const base = { slug: slugMap({ slugTr: v.slugTr, slugEn: v.slugEn, titleTr: v.nameTr }), name: localized(v.nameTr, v.nameEn) };
  const { error } =
    v.table === 'blog_categories'
      ? v.id
        ? await client.data.from('blog_categories').update({ ...base, description: localized(v.descriptionTr, v.descriptionEn), is_active: v.isActive }).eq('id', v.id)
        : await client.data.from('blog_categories').insert({ ...base, description: localized(v.descriptionTr, v.descriptionEn), is_active: v.isActive })
      : v.id
        ? await client.data.from('blog_tags').update(base).eq('id', v.id)
        : await client.data.from('blog_tags').insert(base);
  if (error) return fail('Blog siniflandirmasi kaydedilemedi', error);
  revalidateTag(CACHE_TAGS.blog);
  return DONE;
}

export async function deleteTaxonomy(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  const table = z.enum(['blog_categories', 'blog_tags']).safeParse(formData.get('table'));
  if (!id.success || !table.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from(table.data).delete().eq('id', id.data);
  if (error) logger.error('Blog siniflandirmasi silinemedi', { module: 'blog', code: error.code, message: error.message });
  revalidateTag(CACHE_TAGS.blog);
}

/** Moderasyon: onayla / reddet / spam. */
export async function moderateComment(formData: FormData): Promise<void> {
  const gate = await requireRole(EDITORS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  const status = z.enum(['approved', 'rejected', 'spam', 'pending']).safeParse(formData.get('status'));
  if (!id.success || !status.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('post_comments').update({ status: status.data, moderated_by: gate.data.id, moderated_at: new Date().toISOString() }).eq('id', id.data);
  if (error) logger.error('Yorum moderasyonu basarisiz', { module: 'blog', code: error.code, message: error.message });
  revalidatePath('/admin/blog/comments');
  revalidateTag(CACHE_TAGS.blog);
}

const commentSchema = z.object({
  postId: z.string().uuid(),
  parentId: uuid,
  authorName: z.string().trim().min(2).max(80),
  authorEmail: z.string().trim().email().max(200).optional().or(z.literal('')),
  body: z.string().trim().min(2).max(4000),
  locale: z.enum(['tr', 'en']),
  website: z.string().max(0).optional().or(z.literal('')), // bal küpü: dolu gelirse bot
});

/** Ziyaretçi yorumu: anonim oturumla INSERT (RLS: yalnız pending, yalnız açık yazıya). IP maskelenmiş ve özetlenmiş saklanır. */
export async function submitComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = commentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed('validation', issues(parsed.error));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const [user, h] = await Promise.all([getCurrentUser(), headers()]);
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]?.trim() ?? '';
  const ipMasked = ip ? createHash('sha256').update(ip.replace(/\.\d+$/, '.0')).digest('hex').slice(0, 16) : null;
  const { error } = await client.data.from('post_comments').insert({
    post_id: v.postId,
    parent_id: v.parentId || null,
    author_name: v.authorName,
    author_email: v.authorEmail || null,
    body: v.body,
    locale: v.locale,
    ip_masked: ipMasked,
    user_id: user?.id ?? null,
  });
  if (error) {
    logger.warn('Yorum alinamadi', { module: 'blog', code: error.code, message: error.message });
    return failed(error.code === '42501' ? 'forbidden' : 'unexpected');
  }
  return DONE;
}
