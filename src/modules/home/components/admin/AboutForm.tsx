'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FormSection, LocalizedField, MediaSelect, PublishFields } from '@/modules/admin-shell';
import { saveAbout } from '../../actions';
import type { AdminAbout, MediaChoice } from '../../data/adminHomeRepository';

interface Props {
  readonly about: AdminAbout | null;
  readonly images: readonly MediaChoice[];
}

/** Hakkımızda: Markdown gövde (K-53), görsel, istatistik satırları; yayın alanları K-08 (EN insan onayı). */
export function AboutForm({ about, images }: Props) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveAbout, IDLE);

  return (
    <form action={action} className="grid gap-6">
      <ActionMessage state={state} />
      <FormSection title={t('pages.about')}>
        <LocalizedField name="eyebrow" label={t('pages.eyebrow')} value={about?.eyebrow} state={state} />
        <LocalizedField name="title" label={t('pages.title')} value={about?.title} state={state} required />
        <LocalizedField name="body" label={t('pages.body')} value={about?.body} state={state} multiline rows={12} />
        <div className="grid gap-3 sm:grid-cols-2">
          <MediaSelect name="imageId" label={t('pages.image')} options={images} value={about?.image_id} />
          <div className="grid gap-1">
            <Label htmlFor="f-stats">{t('pages.stats')}</Label>
            <Textarea id="f-stats" name="stats" rows={4} defaultValue={about?.statsText ?? ''} />
          </div>
        </div>
        <PublishFields withSlug={false} state={state} value={about ? { status: about.status, published_locales: about.published_locales, reviewedEn: about.reviewedEn } : null} />
      </FormSection>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
