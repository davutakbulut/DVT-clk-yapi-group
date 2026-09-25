'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection, LocalizedField, PublishFields, type MediaOption } from '@/modules/admin-shell';
import { MediaPicker } from '@/modules/media';
import { saveGuide } from '../../actions';
import type { AdminGuide } from '../../data/adminConfiguratorPagesRepository';
import { CONFIGURATOR_KEYS, formatFaqs, formatPairs, type TitledItem } from '../../domain/types';

interface Props { readonly guide: AdminGuide | null; readonly images: readonly MediaOption[] }

/** Konfigüratör rehber sayfası formu (K-107): hero · gövde (Markdown) · faydalar · adımlar · SSS · band · SEO · yayın. */
export function GuideForm({ guide, images }: Props) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveGuide, IDLE);
  const g = guide;
  const lines = (items: readonly TitledItem[]) => ({ tr: formatPairs(items, 'tr'), en: formatPairs(items, 'en') });
  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="id" value={g?.id ?? ''} />
      <ActionMessage state={state} />
      <FormSection title={t('configuratorPages.hero')}>
        <div className="grid gap-1 sm:max-w-xs">
          <Label htmlFor="f-configuratorKey">{t('configuratorPages.key')}</Label>
          <select id="f-configuratorKey" name="configuratorKey" defaultValue={g?.configurator_key ?? 'hall'} className="h-9 rounded-md border bg-background px-2 text-sm" aria-invalid={state.fieldErrors?.['configuratorKey'] ? 'true' : undefined}>
            {CONFIGURATOR_KEYS.map((k) => <option key={k} value={k}>{t(`configuratorPages.keys.${k}`)}</option>)}
          </select>
          <FieldError state={state} name="configuratorKey" />
          <p className="text-xs text-muted-foreground">{t('configuratorPages.keyHint')}</p>
        </div>
        <LocalizedField name="title" label={t('configuratorPages.name')} value={g?.title} state={state} required />
        <LocalizedField name="heroSummary" label={t('configuratorPages.summary')} value={g?.hero_summary} state={state} multiline rows={2} />
        <MediaPicker name="coverImageId" label={t('services.cover')} options={images} value={g?.cover_image_id} folder="configurator" />
      </FormSection>
      <FormSection title={t('configuratorPages.body')}>
        <LocalizedField name="body" label={t('configuratorPages.bodyMd')} value={g?.body} state={state} multiline rows={14} hint={t('configuratorPages.bodyHint')} />
      </FormSection>
      <FormSection title={t('configuratorPages.lists')}>
        <LocalizedField name="benefits" label={t('configuratorPages.benefits')} value={g ? lines(g.benefits) : null} state={state} multiline rows={4} hint={t('configuratorPages.pairHint')} />
        <LocalizedField name="steps" label={t('configuratorPages.steps')} value={g ? lines(g.steps) : null} state={state} multiline rows={4} hint={t('configuratorPages.pairHint')} />
        <LocalizedField name="faqs" label={t('configuratorPages.faqs')} value={g ? { tr: formatFaqs(g.faqs, 'tr'), en: formatFaqs(g.faqs, 'en') } : null} state={state} multiline rows={6} hint={t('configuratorPages.faqHint')} />
      </FormSection>
      <FormSection title={t('configuratorPages.banner')}>
        <LocalizedField name="ctaTitle" label={t('solutions.ctaTitle')} value={g?.cta.title} state={state} />
        <LocalizedField name="ctaLead" label={t('solutions.ctaLead')} value={g?.cta.lead} state={state} multiline rows={2} />
        <LocalizedField name="ctaButton" label={t('solutions.ctaButton')} value={g?.cta.button} state={state} />
      </FormSection>
      <FormSection title={t('services.seo')}>
        <LocalizedField name="seoTitle" label={t('services.seoTitle')} value={g?.seo_title} state={state} />
        <LocalizedField name="seoDescription" label={t('services.seoDescription')} value={g?.seo_description} state={state} multiline rows={2} />
        <LocalizedField name="focusKeyword" label={t('services.focusKeyword')} value={g?.focus_keyword} state={state} />
        <div className="grid gap-3 sm:grid-cols-2">
          <MediaPicker name="ogImageId" label={t('services.ogImage')} options={images} value={g?.og_image_id} folder="configurator" />
          <div className="grid gap-1">
            <Label htmlFor="f-canonicalUrl">{t('services.canonical')}</Label>
            <Input id="f-canonicalUrl" name="canonicalUrl" type="url" defaultValue={g?.canonical_url ?? ''} aria-invalid={state.fieldErrors?.['canonicalUrl'] ? 'true' : undefined} />
            <FieldError state={state} name="canonicalUrl" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="noindex" defaultChecked={g?.noindex ?? false} /> {t('services.noindex')}</label>
      </FormSection>
      <PublishFields state={state} value={g ? { status: g.status, published_locales: g.published_locales, reviewedEn: g.reviewedEn, slug: g.slug } : null} />
      <div><Button type="submit" size="sm" disabled={pending}>{t('common.save')}</Button></div>
    </form>
  );
}
