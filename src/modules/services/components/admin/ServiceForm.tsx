'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection, LocalizedField, PublishFields } from '@/modules/admin-shell';
import { saveService } from '../../actions';
import type { AdminService, MediaChoice } from '../../data/adminServicesRepository';
import { formatSteps } from '../../domain/processSteps';
import { MediaPicker } from '@/modules/media';

const ICON_KEYS = ['building', 'factory', 'warehouse', 'roof', 'hammer', 'ruler', 'layers', 'wrench'];

interface Props {
  readonly service: AdminService | null;
  readonly images: readonly MediaChoice[];
  readonly projectCategories?: readonly { id: string; label: string }[];
}
const GROUPS = ['steel', 'engineering', 'construction'] as const;
const DRAWINGS = ['konut', 'cati', 'kentsel', 'endustri', 'betonarme', 'epoksi', 'alcipan', 'tadilat', 'peyzaj', 'proje'];

/** Hizmet formu: içerik · süreç adımları · medya · SEO · yayın (K-08/K-09). Yeni kayıt kaydedilince düzenleme sayfasına gider. */
export function ServiceForm({ service, images, projectCategories = [] }: Props) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveService, IDLE);

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="id" value={service?.id ?? ''} />
      <ActionMessage state={state} />

      <FormSection title={t('services.content')}>
        <LocalizedField name="title" label={t('services.name')} value={service?.title} state={state} required />
        <LocalizedField name="excerpt" label={t('services.excerpt')} value={service?.excerpt} state={state} multiline rows={2} />
        <LocalizedField name="body" label={t('services.body')} value={service?.body} state={state} multiline rows={14} />
        <LocalizedField
          name="steps"
          label={t('services.steps')}
          value={service ? { tr: formatSteps(service.process_steps, 'tr'), en: formatSteps(service.process_steps, 'en') } : null}
          state={state}
          multiline
          rows={5}
          hint={t('services.stepsHint')}
        />
        <LocalizedField name="highlights" label={t('services.highlights')} value={service?.highlights} state={state} multiline rows={4} />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1">
            <Label htmlFor="f-groupKey">{t('services.group')}</Label>
            <select id="f-groupKey" name="groupKey" defaultValue={service?.group_key ?? 'steel'} className="h-9 rounded-md border bg-background px-2 text-sm">
              {GROUPS.map((g) => <option key={g} value={g}>{t(`services.groups.${g}`)}</option>)}
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="f-drawingKey">{t('services.drawing')}</Label>
            <select id="f-drawingKey" name="drawingKey" defaultValue={service?.drawing_key ?? ''} className="h-9 rounded-md border bg-background px-2 text-sm">
              <option value="">{t('common.none')}</option>
              {DRAWINGS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="f-projectCategoryId">{t('services.projectCategory')}</Label>
            <select id="f-projectCategoryId" name="projectCategoryId" defaultValue={service?.project_category_id ?? ''} className="h-9 rounded-md border bg-background px-2 text-sm">
              <option value="">{t('common.none')}</option>
              {projectCategories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
      </FormSection>

      <FormSection title={t('services.media')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="f-icon">{t('services.icon')}</Label>
            <select id="f-icon" name="icon" defaultValue={service?.icon ?? ''} className="h-9 rounded-md border bg-background px-2 text-sm">
              <option value="">{t('common.none')}</option>
              {ICON_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <MediaPicker name="coverImageId" label={t('services.cover')} options={images} value={service?.cover_image_id} folder="services" />
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="f-gallery">{t('services.gallery')}</Label>
            <select id="f-gallery" name="gallery" multiple size={8} defaultValue={service?.gallery ? [...service.gallery] : []} className="rounded-md border bg-background px-2 py-1 text-sm">
              {images.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.path}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{t('services.galleryHint')}</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isFeatured" defaultChecked={service?.is_featured ?? false} /> {t('form.featured')}
        </label>
      </FormSection>

      <FormSection title={t('services.seo')}>
        <LocalizedField name="seoTitle" label={t('services.seoTitle')} value={service?.seo_title} state={state} />
        <LocalizedField name="seoDescription" label={t('services.seoDescription')} value={service?.seo_description} state={state} multiline rows={2} />
        <LocalizedField name="focusKeyword" label={t('services.focusKeyword')} value={service?.focus_keyword} state={state} />
        <div className="grid gap-3 sm:grid-cols-2">
          <MediaPicker name="ogImageId" label={t('services.ogImage')} options={images} value={service?.og_image_id} folder="services" />
          <div className="grid gap-1">
            <Label htmlFor="f-canonicalUrl">{t('services.canonical')}</Label>
            <Input id="f-canonicalUrl" name="canonicalUrl" type="url" defaultValue={service?.canonical_url ?? ''} aria-invalid={state.fieldErrors?.['canonicalUrl'] ? 'true' : undefined} />
            <FieldError state={state} name="canonicalUrl" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="noindex" defaultChecked={service?.noindex ?? false} /> {t('services.noindex')}
        </label>
      </FormSection>

      <PublishFields state={state} value={service ? { status: service.status, published_locales: service.published_locales, reviewedEn: service.reviewedEn, slug: service.slug } : null} />

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
