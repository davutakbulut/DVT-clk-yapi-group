'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection, LocalizedField, MediaSelect, PublishFields, type MediaOption } from '@/modules/admin-shell';
import { saveSolution } from '../../actions';
import type { AdminSolution, Choice } from '../../data/adminSolutionsRepository';
import { formatAdvantages, formatComparisonRows } from '../../domain/solutionLines';

interface Props {
  readonly solution: AdminSolution | null;
  readonly images: readonly MediaOption[];
  readonly services: readonly Choice[];
}

/** Çözüm formu: K-26'nın 8 bölümü bölüm bölüm; karşılaştırma ve avantajlar satır biçiminde; SEO; yayın (K-08/K-09). */
export function SolutionForm({ solution, images, services }: Props) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveSolution, IDLE);
  const s = solution;

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="id" value={s?.id ?? ''} />
      <ActionMessage state={state} />

      <FormSection title={t('solutions.hero')}>
        <LocalizedField name="title" label={t('solutions.name')} value={s?.title} state={state} required />
        <LocalizedField name="heroSummary" label={t('solutions.heroSummary')} value={s?.hero_summary} state={state} multiline rows={2} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="f-serviceId">{t('solutions.service')}</Label>
            <select id="f-serviceId" name="serviceId" defaultValue={s?.service_id ?? ''} className="h-9 rounded-md border bg-background px-2 text-sm">
              <option value="">{t('common.none')}</option>
              {services.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">{t('solutions.serviceHint')}</p>
          </div>
          <MediaSelect name="coverImageId" label={t('solutions.cover')} options={images} value={s?.cover_image_id} />
        </div>
      </FormSection>

      <FormSection title={t('solutions.problem')}>
        <LocalizedField name="problem" label={t('solutions.problemBody')} value={s?.problem} state={state} multiline rows={8} />
      </FormSection>

      <FormSection title={t('solutions.comparison')}>
        <LocalizedField name="comparisonAlt" label={t('solutions.comparisonAlt')} value={s?.comparison.alternative} state={state} />
        <LocalizedField name="comparison" label={t('solutions.comparisonRows')} value={s ? { tr: formatComparisonRows(s.comparison.rows, 'tr'), en: formatComparisonRows(s.comparison.rows, 'en') } : null} state={state} multiline rows={6} hint={t('solutions.comparisonHint')} />
      </FormSection>

      <FormSection title={t('solutions.advantages')}>
        <LocalizedField name="advantages" label={t('solutions.advantages')} value={s ? { tr: formatAdvantages(s.advantages, 'tr'), en: formatAdvantages(s.advantages, 'en') } : null} state={state} multiline rows={5} hint={t('solutions.advantagesHint')} />
      </FormSection>

      <FormSection title={t('solutions.technicalBasis')}>
        <LocalizedField name="technicalBasis" label={t('solutions.technicalBasisBody')} value={s?.technical_basis} state={state} multiline rows={6} />
      </FormSection>

      <FormSection title={t('solutions.cta')}>
        <LocalizedField name="ctaTitle" label={t('solutions.ctaTitle')} value={s?.cta.title} state={state} />
        <LocalizedField name="ctaLead" label={t('solutions.ctaLead')} value={s?.cta.lead} state={state} multiline rows={2} />
        <LocalizedField name="ctaButton" label={t('solutions.ctaButton')} value={s?.cta.button} state={state} />
      </FormSection>

      <FormSection title={t('services.seo')}>
        <LocalizedField name="seoTitle" label={t('services.seoTitle')} value={s?.seo_title} state={state} />
        <LocalizedField name="seoDescription" label={t('services.seoDescription')} value={s?.seo_description} state={state} multiline rows={2} />
        <LocalizedField name="focusKeyword" label={t('services.focusKeyword')} value={s?.focus_keyword} state={state} />
        <div className="grid gap-3 sm:grid-cols-2">
          <MediaSelect name="ogImageId" label={t('services.ogImage')} options={images} value={s?.og_image_id} />
          <div className="grid gap-1">
            <Label htmlFor="f-canonicalUrl">{t('services.canonical')}</Label>
            <Input id="f-canonicalUrl" name="canonicalUrl" type="url" defaultValue={s?.canonical_url ?? ''} aria-invalid={state.fieldErrors?.['canonicalUrl'] ? 'true' : undefined} />
            <FieldError state={state} name="canonicalUrl" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="noindex" defaultChecked={s?.noindex ?? false} /> {t('services.noindex')}
        </label>
      </FormSection>

      <PublishFields state={state} value={s ? { status: s.status, published_locales: s.published_locales, reviewedEn: s.reviewedEn, slug: s.slug } : null} />

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
