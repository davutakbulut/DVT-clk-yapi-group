'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection, LocalizedField, PublishFields, type MediaOption } from '@/modules/admin-shell';
import { saveProject } from '../../actions';
import type { AdminProject, Choice } from '../../data/adminProjectsRepository';
import { MediaPicker } from '@/modules/media';

interface Props {
  readonly project: AdminProject | null;
  readonly images: readonly MediaOption[];
  readonly categories: readonly Choice[];
  readonly services: readonly Choice[];
}

export function ProjectForm({ project, images, categories, services }: Props) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveProject, IDLE);
  const field = (name: string, label: string, value: string | number | null | undefined, type = 'text', extra: Record<string, unknown> = {}) => (
    <div className="grid gap-1">
      <Label htmlFor={`f-${name}`}>{label}</Label>
      <Input id={`f-${name}`} name={name} type={type} defaultValue={value ?? ''} aria-invalid={state.fieldErrors?.[name] ? 'true' : undefined} {...extra} />
      <FieldError state={state} name={name} />
    </div>
  );
  const checks = (name: string, label: string, options: readonly Choice[], selected: readonly string[]) => (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">{label}</legend>
      {options.length === 0 ? <p className="text-xs text-muted-foreground">{t('common.empty')}</p> : null}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {options.map((o) => (
          <label key={o.id} className="flex items-center gap-2">
            <input type="checkbox" name={name} value={o.id} defaultChecked={selected.includes(o.id)} /> {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="id" value={project?.id ?? ''} />
      <ActionMessage state={state} />
      <FormSection title={t('projects.content')}>
        <LocalizedField name="title" label={t('form.name')} value={project?.title} state={state} required />
        <LocalizedField name="excerpt" label={t('projects.excerpt')} value={project?.excerpt} state={state} multiline rows={2} />
        <LocalizedField name="body" label={t('projects.body')} value={project?.body} state={state} multiline rows={12} />
        <LocalizedField name="location" label={t('projects.location')} value={project?.location} state={state} />
      </FormSection>
      <FormSection title={t('projects.facts')}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {field('clientName', t('projects.clientName'), project?.client_name)}
          {field('areaM2', t('projects.areaM2'), project?.area_m2, 'number', { min: 0, step: '0.01' })}
          {field('tonnage', t('projects.tonnage'), project?.tonnage, 'number', { min: 0, step: '0.001' })}
          {field('startedOn', t('projects.startedOn'), project?.started_on, 'date')}
          {field('completedOn', t('projects.completedOn'), project?.completed_on, 'date')}
        </div>
      </FormSection>
      <FormSection title={t('projects.media')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <MediaPicker name="coverImageId" label={t('projects.cover')} options={images} value={project?.cover_image_id} folder="projects" />
          <MediaPicker name="ogImageId" label={t('projects.ogImage')} options={images} value={project?.og_image_id} folder="projects" />
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="f-gallery">{t('projects.gallery')}</Label>
            <select id="f-gallery" name="gallery" multiple size={8} defaultValue={project?.gallery ? [...project.gallery] : []} className="rounded-md border bg-background px-2 py-1 text-sm">
              {images.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.path}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{t('projects.galleryHint')}</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isFeatured" defaultChecked={project?.is_featured ?? false} /> {t('form.featured')}
        </label>
      </FormSection>
      <FormSection title={t('projects.relations')}>
        {checks('categories', t('projects.categories'), categories, project?.categoryIds ?? [])}
        {checks('services', t('projects.services'), services, project?.serviceIds ?? [])}
      </FormSection>
      <FormSection title={t('projects.seo')}>
        <LocalizedField name="seoTitle" label={t('projects.seoTitle')} value={project?.seo_title} state={state} />
        <LocalizedField name="seoDescription" label={t('projects.seoDescription')} value={project?.seo_description} state={state} multiline rows={2} />
        <LocalizedField name="focusKeyword" label={t('projects.focusKeyword')} value={project?.focus_keyword} state={state} />
        <div className="grid gap-3 sm:grid-cols-2">{field('canonicalUrl', t('projects.canonical'), project?.canonical_url, 'url')}</div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="noindex" defaultChecked={project?.noindex ?? false} /> {t('projects.noindex')}
        </label>
      </FormSection>
      <PublishFields state={state} value={project ? { status: project.status, published_locales: project.published_locales, reviewedEn: project.reviewedEn, slug: project.slug } : null} />
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
