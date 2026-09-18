'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection, LocalizedField, MediaSelect, PublishFields, type MediaOption } from '@/modules/admin-shell';
import { savePost } from '../../actions';
import type { AdminPost, Choice } from '../../data/adminBlogRepository';
import { SeoPanel } from './SeoPanel';

interface Props {
  readonly post: AdminPost | null;
  readonly images: readonly MediaOption[];
  readonly categories: readonly Choice[];
  readonly tags: readonly Choice[];
  readonly authors: readonly Choice[];
  readonly otherKeywords: Readonly<Record<'tr' | 'en', readonly string[]>>;
  readonly otherIntros: Readonly<Record<'tr' | 'en', readonly string[]>>;
}

const FORM_ID = 'post-form';

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostForm({ post, images, categories, tags, authors, otherKeywords, otherIntros }: Props) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(savePost, IDLE);
  const select = (name: string, label: string, options: readonly Choice[], value: string | null | undefined) => (
    <div className="grid gap-1">
      <Label htmlFor={`f-${name}`}>{label}</Label>
      <select id={`f-${name}`} name={name} defaultValue={value ?? ''} className="h-9 rounded-md border bg-background px-2 text-sm">
        <option value="">{t('common.none')}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <form id={FORM_ID} action={action} className="grid gap-6">
        <input type="hidden" name="id" value={post?.id ?? ''} />
        <ActionMessage state={state} />
        <FormSection title={t('blog.content')}>
          <LocalizedField name="title" label={t('form.name')} value={post?.title} state={state} required />
          <LocalizedField name="excerpt" label={t('blog.excerpt')} value={post?.excerpt} state={state} multiline rows={2} />
          <LocalizedField name="body" label={t('blog.body')} value={post?.body} state={state} multiline rows={22} />
          <div className="grid gap-3 sm:grid-cols-2">
            {select('categoryId', t('blog.category'), categories, post?.category_id)}
            {select('authorId', t('blog.author'), authors, post?.author_id)}
          </div>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">{t('blog.tags')}</legend>
            {tags.length === 0 ? <p className="text-xs text-muted-foreground">{t('common.empty')}</p> : null}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {tags.map((tag) => (
                <label key={tag.id} className="flex items-center gap-2">
                  <input type="checkbox" name="tags" value={tag.id} defaultChecked={post?.tagIds.includes(tag.id) ?? false} /> {tag.label}
                </label>
              ))}
            </div>
          </fieldset>
        </FormSection>
        <FormSection title={t('blog.media')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <MediaSelect name="coverImageId" label={t('blog.cover')} options={images} value={post?.cover_image_id} />
            <MediaSelect name="ogImageId" label={t('blog.ogImage')} options={images} value={post?.og_image_id} />
            <div className="grid gap-1">
              <Label htmlFor="f-publishedAt">{t('blog.publishedAt')}</Label>
              <Input id="f-publishedAt" name="publishedAt" type="datetime-local" defaultValue={toLocalInput(post?.published_at ?? null)} aria-invalid={state.fieldErrors?.['publishedAt'] ? 'true' : undefined} />
              <FieldError state={state} name="publishedAt" />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="isFeatured" defaultChecked={post?.is_featured ?? false} /> {t('form.featured')}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="allowComments" defaultChecked={post?.allow_comments ?? true} /> {t('blog.allowComments')}
            </label>
          </div>
        </FormSection>
        <FormSection title={t('blog.seo')}>
          <LocalizedField name="focusKeyword" label={t('blog.focusKeyword')} value={post?.focus_keyword} state={state} />
          <LocalizedField name="seoTitle" label={t('blog.seoTitle')} value={post?.seo_title} state={state} />
          <LocalizedField name="seoDescription" label={t('blog.seoDescription')} value={post?.seo_description} state={state} multiline rows={2} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label htmlFor="f-canonicalUrl">{t('blog.canonical')}</Label>
              <Input id="f-canonicalUrl" name="canonicalUrl" type="url" defaultValue={post?.canonical_url ?? ''} aria-invalid={state.fieldErrors?.['canonicalUrl'] ? 'true' : undefined} />
              <FieldError state={state} name="canonicalUrl" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="f-revisionNote">{t('blog.revisionNote')}</Label>
              <Input id="f-revisionNote" name="revisionNote" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="noindex" defaultChecked={post?.noindex ?? false} /> {t('blog.noindex')}
          </label>
        </FormSection>
        <PublishFields state={state} value={post ? { status: post.status, published_locales: post.published_locales, reviewedEn: post.reviewedEn, slug: post.slug } : null} />
        <div>
          <Button type="submit" size="sm" disabled={pending}>
            {t('common.save')}
          </Button>
        </div>
      </form>
      <SeoPanel formId={FORM_ID} otherKeywords={otherKeywords} otherIntros={otherIntros} hasAuthorChoice={authors.length > 0} />
    </div>
  );
}
