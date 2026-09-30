'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError } from '@/modules/admin-shell';
import { addSuppression } from '../../actions';

/** Engel listesine elle ekleme: geri dönen adres, şikâyet ya da telefonla gelen "göndermeyin" isteği. */
export function SuppressionForm() {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(addSuppression, IDLE);
  return (
    <form action={action} className="grid gap-3 rounded-md border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <Label htmlFor="sp-email">{t('settings.email')}</Label>
          <Input id="sp-email" name="email" type="email" required maxLength={254} className="w-72" aria-invalid={state.fieldErrors?.['email'] ? 'true' : undefined} />
          <FieldError state={state} name="email" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="sp-reason">{t('campaigns.suppression.reason')}</Label>
          <select id="sp-reason" name="reason" defaultValue="manual" className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="manual">{t('campaigns.suppression.reasons.manual')}</option>
            <option value="bounced">{t('campaigns.suppression.reasons.bounced')}</option>
            <option value="complaint">{t('campaigns.suppression.reasons.complaint')}</option>
          </select>
        </div>
        <div className="grid min-w-48 flex-1 gap-1">
          <Label htmlFor="sp-note">{t('campaigns.suppression.note')}</Label>
          <Input id="sp-note" name="note" maxLength={300} />
        </div>
        <Button type="submit" size="sm" disabled={pending}>{t('common.add')}</Button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}
