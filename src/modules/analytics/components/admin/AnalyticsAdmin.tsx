'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection } from '@/modules/admin-shell';
import { saveAnalyticsConfig } from '../../actions';

interface Props {
  readonly config: { readonly enabled: boolean; readonly sampleRate: number; readonly ga4Id: string; readonly adsId: string; readonly metaPixelId: string };
}

export function AnalyticsSettingsForm({ config }: Props) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveAnalyticsConfig, IDLE);
  const field = (name: keyof Props['config'], label: string, placeholder: string) => (
    <div className="grid gap-1">
      <Label htmlFor={`a-${name}`}>{label}</Label>
      <Input id={`a-${name}`} name={name} defaultValue={String(config[name] ?? '')} placeholder={placeholder} aria-invalid={state.fieldErrors?.[name] ? 'true' : undefined} />
      <FieldError state={state} name={name} />
    </div>
  );
  return (
    <form action={action} className="grid gap-6">
      <ActionMessage state={state} />
      <FormSection title={t('analyticsSettings.tracker')}>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={config.enabled} /> {t('analyticsSettings.enabled')}
        </label>
        <div className="grid gap-1 sm:max-w-xs">
          <Label htmlFor="a-sampleRate">{t('analyticsSettings.sampleRate')}</Label>
          <Input id="a-sampleRate" name="sampleRate" defaultValue={String(config.sampleRate)} inputMode="decimal" />
          <p className="text-xs text-muted-foreground">{t('analyticsSettings.sampleRateHint')}</p>
        </div>
      </FormSection>
      <FormSection title={t('analyticsSettings.thirdParty')}>
        <p className="text-xs text-muted-foreground">{t('analyticsSettings.thirdPartyHint')}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {field('ga4Id', 'GA4', 'G-XXXXXXX')}
          {field('adsId', 'Google Ads', 'AW-000000000')}
          {field('metaPixelId', 'Meta Pixel', '000000000000000')}
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
