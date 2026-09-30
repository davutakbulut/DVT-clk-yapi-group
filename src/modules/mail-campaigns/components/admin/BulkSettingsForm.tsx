'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BulkMailSettings } from '@/core/mail/bulkSettings';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection, LocalizedField } from '@/modules/admin-shell';
import { saveBulkSettings } from '../../actions';

/** Gönderim ayarları (site_settings 'mail.bulk'): hız sınırı · yanıt adresi · hitap · alt bilgi · "listeden çık" etiketi. */
export function BulkSettingsForm({ settings }: { readonly settings: BulkMailSettings }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveBulkSettings, IDLE);
  const number = (name: 'hourlyLimit' | 'batchSize', value: number, max: number) => (
    <div className="grid gap-1">
      <Label htmlFor={`bs-${name}`}>{t(`campaigns.settings.${name}`)}</Label>
      <Input id={`bs-${name}`} name={name} type="number" min={1} max={max} defaultValue={value} required className="w-32" aria-invalid={state.fieldErrors?.[name] ? 'true' : undefined} />
      <FieldError state={state} name={name} />
      <p className="text-xs text-muted-foreground">{t(`campaigns.settings.${name}Hint`)}</p>
    </div>
  );
  return (
    <form action={action} className="grid max-w-4xl gap-6">
      <FormSection title={t('campaigns.settings.speed')}>
        <div className="grid gap-4 sm:grid-cols-2">
          {number('hourlyLimit', settings.hourly_limit, 5000)}
          {number('batchSize', settings.batch_size, 50)}
        </div>
      </FormSection>
      <FormSection title={t('campaigns.settings.identity')}>
        <div className="grid gap-1 sm:max-w-sm">
          <Label htmlFor="bs-replyTo">{t('campaigns.settings.replyTo')}</Label>
          <Input id="bs-replyTo" name="replyTo" type="email" defaultValue={settings.reply_to} maxLength={254} aria-invalid={state.fieldErrors?.['replyTo'] ? 'true' : undefined} />
          <FieldError state={state} name="replyTo" />
          <p className="text-xs text-muted-foreground">{t('campaigns.settings.replyToHint')}</p>
        </div>
        <LocalizedField name="nameFallback" label={t('campaigns.settings.nameFallback')} value={settings.name_fallback} state={state} hint={t('campaigns.settings.nameFallbackHint')} />
        <LocalizedField name="footer" label={t('campaigns.settings.footer')} value={settings.footer} state={state} multiline rows={4} hint={t('campaigns.settings.footerHint')} />
        <LocalizedField name="unsubscribeLabel" label={t('campaigns.settings.unsubscribeLabel')} value={settings.unsubscribe_label} state={state} required />
      </FormSection>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>{t('common.save')}</Button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}
