'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IDLE } from '@/lib/formState';
import { saveWhatsApp } from '../../actions';
import type { WhatsAppAdminRow } from '../../data/adminWhatsAppRepository';

export function WhatsAppForm({ row }: { readonly row: WhatsAppAdminRow }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveWhatsApp, IDLE);
  const field = (name: string, label: string, value: string, type = 'text') => (
    <div className="grid gap-1">
      <Label htmlFor={`w-${name}`}>{label}</Label>
      <Input id={`w-${name}`} name={name} type={type} defaultValue={value} aria-invalid={state.fieldErrors?.[name] ? 'true' : undefined} />
      {state.fieldErrors?.[name] ? <span className="text-xs text-destructive">{t('errors.validation')}</span> : null}
    </div>
  );

  return (
    <form action={action} className="grid max-w-3xl gap-6">
      {state.error && state.error !== 'validation' ? <p role="alert" className="text-sm text-destructive">{t(`errors.${state.error}`)}</p> : null}
      {state.done ? <p role="status" className="text-sm text-green-700">{t('common.saved')}</p> : null}
      <label className="flex items-center gap-2">
        <input type="checkbox" name="enabled" defaultChecked={row.is_enabled} /> {t('whatsapp.enabled')}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('phone', t('whatsapp.phone'), row.phone_e164 ?? '', 'tel')}
        {field('delay', t('whatsapp.delay'), String(row.show_delay_seconds), 'number')}
        {field('nameTr', `${t('whatsapp.displayName')} (TR)`, row.display_name['tr'] ?? '')}
        {field('nameEn', `${t('whatsapp.displayName')} (EN)`, row.display_name['en'] ?? '')}
        {field('greetingTr', `${t('whatsapp.greeting')} (TR)`, row.greeting['tr'] ?? '')}
        {field('greetingEn', `${t('whatsapp.greeting')} (EN)`, row.greeting['en'] ?? '')}
        {field('replyTr', `${t('whatsapp.replyTime')} (TR)`, row.reply_time['tr'] ?? '')}
        {field('replyEn', `${t('whatsapp.replyTime')} (EN)`, row.reply_time['en'] ?? '')}
        {field('templateTr', `${t('whatsapp.template')} (TR)`, row.template['tr'] ?? '')}
        {field('templateEn', `${t('whatsapp.template')} (EN)`, row.template['en'] ?? '')}
        <p className="text-xs text-muted-foreground sm:col-span-2">{t('whatsapp.templateHint')}</p>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="w-hidden">{t('whatsapp.hiddenPaths')}</Label>
        <Textarea id="w-hidden" name="hiddenPaths" rows={3} defaultValue={row.hidden_paths.join('\n')} />
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
