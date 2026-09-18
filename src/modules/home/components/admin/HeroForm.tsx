'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection, LocalizedField, MediaSelect } from '@/modules/admin-shell';
import { saveHero } from '../../actions';
import type { AdminHero, MediaChoice } from '../../data/adminHomeRepository';

interface Props {
  readonly hero: AdminHero | null;
  readonly images: readonly MediaChoice[];
  readonly videos: readonly MediaChoice[];
}

/** Hero: video/poster seçimi medya kütüphanesinden (ffmpeg yok → poster ayrı yüklenir), metinler TR/EN. */
export function HeroForm({ hero, images, videos }: Props) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveHero, IDLE);

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="id" value={hero?.id ?? ''} />
      <ActionMessage state={state} />
      <FormSection title={t('pages.hero')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="f-label">{t('pages.heroLabel')}</Label>
            <Input id="f-label" name="label" defaultValue={hero?.label ?? 'main'} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="f-durationSeconds">{t('pages.duration')}</Label>
            <Input id="f-durationSeconds" name="durationSeconds" type="number" min={0} max={60} step="0.1" defaultValue={hero?.duration_seconds ?? ''} />
            <FieldError state={state} name="durationSeconds" />
          </div>
          <MediaSelect name="desktopVideoId" label={t('pages.desktopVideo')} options={videos} value={hero?.desktop_video_id} />
          <MediaSelect name="mobileVideoId" label={t('pages.mobileVideo')} options={videos} value={hero?.mobile_video_id} />
          <MediaSelect name="desktopPosterId" label={t('pages.desktopPoster')} options={images} value={hero?.desktop_poster_id} />
          <MediaSelect name="mobilePosterId" label={t('pages.mobilePoster')} options={images} value={hero?.mobile_poster_id} />
        </div>
        <LocalizedField name="headline" label={t('pages.headline')} value={hero?.headline} state={state} />
        <LocalizedField name="subheadline" label={t('pages.subheadline')} value={hero?.subheadline} state={state} multiline rows={3} />
        <LocalizedField name="ctaLabel" label={t('pages.ctaLabel')} value={hero?.cta_label} state={state} />
        <div className="grid gap-1 sm:max-w-sm">
          <Label htmlFor="f-ctaPath">{t('pages.ctaPath')}</Label>
          <Input id="f-ctaPath" name="ctaPath" defaultValue={hero?.cta_path ?? ''} aria-invalid={state.fieldErrors?.['ctaPath'] ? 'true' : undefined} />
          <FieldError state={state} name="ctaPath" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={hero?.is_active ?? true} /> {t('pages.heroActive')}
        </label>
      </FormSection>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
