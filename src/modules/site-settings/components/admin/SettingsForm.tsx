'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IDLE } from '@/lib/formState';
import { saveSettings } from '../../actions';
import type { LogoOption } from '../../data/adminSettingsRepository';
import type { PublicSettings } from '../../domain/settings';

interface Props {
  readonly settings: PublicSettings;
  readonly logos: readonly LogoOption[];
}

export function SettingsForm({ settings, logos }: Props) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveSettings, IDLE);
  const bad = (name: string) => (state.fieldErrors?.[name] ? 'true' : undefined);
  const field = (name: string, label: string, defaultValue: string, type = 'text') => (
    <div className="grid gap-1">
      <Label htmlFor={`s-${name}`}>{label}</Label>
      <Input id={`s-${name}`} name={name} type={type} defaultValue={defaultValue} aria-invalid={bad(name)} />
      {bad(name) ? <span className="text-xs text-destructive">{t('errors.validation')}</span> : null}
    </div>
  );
  const logoSelect = (name: string, label: string, value: string | null) => (
    <div className="grid gap-1">
      <Label htmlFor={`s-${name}`}>{label}</Label>
      <select id={`s-${name}`} name={name} defaultValue={value ?? ''} className="h-9 rounded-md border bg-background px-2">
        <option value="">{t('settings.noLogo')}</option>
        {logos.map((l) => (
          <option key={l.id} value={l.id}>
            {l.path}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form action={action} className="grid max-w-3xl gap-6">
      {state.error && state.error !== 'validation' ? <p role="alert" className="text-sm text-destructive">{t(`errors.${state.error}`)}</p> : null}
      {state.done ? <p role="status" className="text-sm text-green-700">{t('common.saved')}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {field('siteNameTr', `${t('settings.siteName')} (TR)`, settings.siteName['tr'] ?? '')}
        {field('siteNameEn', `${t('settings.siteName')} (EN)`, settings.siteName['en'] ?? '')}
        {field('taglineTr', `${t('settings.tagline')} (TR)`, settings.tagline?.['tr'] ?? '')}
        {field('taglineEn', `${t('settings.tagline')} (EN)`, settings.tagline?.['en'] ?? '')}
        {logoSelect('logoMediaId', t('settings.logo'), settings.logoMediaId)}
        {logoSelect('logoDarkMediaId', t('settings.logoDark'), settings.logoDarkMediaId)}
        {field('phone', t('settings.phone'), settings.contact.phone ?? '', 'tel')}
        {field('email', t('settings.email'), settings.contact.email ?? '', 'email')}
        {field('addressTr', `${t('settings.address')} (TR)`, settings.contact.address?.['tr'] ?? '')}
        {field('addressEn', `${t('settings.address')} (EN)`, settings.contact.address?.['en'] ?? '')}
        {field('mapUrl', t('settings.mapUrl'), settings.contact.mapUrl ?? '', 'url')}
        {field('hoursTr', `${t('settings.workingHours')} (TR)`, settings.contact.workingHours?.['tr'] ?? '')}
        {field('hoursEn', `${t('settings.workingHours')} (EN)`, settings.contact.workingHours?.['en'] ?? '')}
        {field('seoTr', `${t('settings.seoDescription')} (TR)`, settings.seoDescription?.['tr'] ?? '')}
        {field('seoEn', `${t('settings.seoDescription')} (EN)`, settings.seoDescription?.['en'] ?? '')}
      </div>
      <div className="grid gap-1">
        <Label htmlFor="s-social">{t('settings.social')}</Label>
        <Textarea id="s-social" name="social" rows={4} defaultValue={settings.socialLinks.map((l) => `${l.platform} | ${l.url}`).join('\n')} />
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
