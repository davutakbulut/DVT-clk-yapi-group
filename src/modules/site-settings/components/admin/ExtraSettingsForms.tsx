'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FormSection, MediaSelect, type MediaOption } from '@/modules/admin-shell';
import { saveCookieBanner, saveMaintenance, saveSeoSettings } from '../../actions';
import type { CookieBannerText, PublicSettings } from '../../domain/settings';

export function SeoSettingsForm({ settings, images, indexable }: { readonly settings: PublicSettings; readonly images: readonly MediaOption[]; readonly indexable: boolean }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveSeoSettings, IDLE);
  const v = settings.seoVerification;
  return (
    <form action={action} className="grid gap-6">
      <ActionMessage state={state} />
      <FormSection title={t('seoSettings.indexable')}>
        <p className={`text-sm ${indexable ? 'text-green-700' : 'text-amber-700'}`}>{indexable ? t('seoSettings.indexableOn') : t('seoSettings.indexableOff')}</p>
        <p className="text-xs text-muted-foreground">
          {t('seoSettings.sitemap')}: <code>/sitemap.xml</code> · <code>/robots.txt</code> · {t('seoSettings.llms')}: <code>/llms.txt</code> {/* static-ok: teknik yol adları */}
        </p>
      </FormSection>
      <FormSection title={t('seoSettings.title')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <MediaSelect name="ogMediaId" label={t('seoSettings.ogImage')} options={images} value={settings.seoOgMediaId} />
          {(['google', 'bing', 'yandex'] as const).map((k) => (
            <div key={k} className="grid gap-1">
              <Label htmlFor={`f-${k}`}>{t(`seoSettings.${k}`)}</Label>
              <Input id={`f-${k}`} name={k} defaultValue={v[k] ?? ''} />
            </div>
          ))}
        </div>
      </FormSection>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

export function CookieBannerForm({ value }: { readonly value: Readonly<Record<string, CookieBannerText>> | null }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveCookieBanner, IDLE);
  const field = (key: keyof CookieBannerText, label: string, locale: 'tr' | 'en', multiline = false) => {
    const name = `${key}${locale === 'tr' ? 'Tr' : 'En'}`;
    const current = value?.[locale]?.[key] ?? '';
    return (
      <div className="grid gap-1" key={name}>
        <Label htmlFor={`f-${name}`}>
          {label} ({t(`common.${locale}`)})
        </Label>
        {multiline ? <Textarea id={`f-${name}`} name={name} rows={3} defaultValue={current} required={locale === 'tr'} /> : <Input id={`f-${name}`} name={name} defaultValue={current} required={locale === 'tr'} />}
      </div>
    );
  };
  return (
    <form action={action} className="grid gap-6">
      <ActionMessage state={state} />
      <FormSection title={t('cookieSettings.title')}>
        <div className="grid gap-3 sm:grid-cols-2">
          {field('title', t('cookieSettings.title_'), 'tr')}
          {field('title', t('cookieSettings.title_'), 'en')}
          {field('body', t('cookieSettings.body'), 'tr', true)}
          {field('body', t('cookieSettings.body'), 'en', true)}
          {field('accept', t('cookieSettings.accept'), 'tr')}
          {field('accept', t('cookieSettings.accept'), 'en')}
          {field('reject', t('cookieSettings.reject'), 'tr')}
          {field('reject', t('cookieSettings.reject'), 'en')}
          {field('settings', t('cookieSettings.settings'), 'tr')}
          {field('settings', t('cookieSettings.settings'), 'en')}
        </div>
      </FormSection>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

export function MaintenanceForm({ settings }: { readonly settings: PublicSettings }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveMaintenance, IDLE);
  return (
    <form action={action} className="grid gap-6">
      <ActionMessage state={state} />
      <FormSection title={t('maintenanceSettings.title')}>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={settings.maintenance.enabled} /> {t('maintenanceSettings.enabled')}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor="f-messageTr">{t('maintenanceSettings.message')} (TR)</Label>
            <Textarea id="f-messageTr" name="messageTr" rows={3} defaultValue={settings.maintenance.message['tr'] ?? ''} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="f-messageEn">{t('maintenanceSettings.message')} (EN)</Label>
            <Textarea id="f-messageEn" name="messageEn" rows={3} defaultValue={settings.maintenance.message['en'] ?? ''} />
          </div>
        </div>
      </FormSection>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
