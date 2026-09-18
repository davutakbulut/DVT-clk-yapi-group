'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IDLE } from '@/lib/formState';
import { ActionMessage } from '@/modules/admin-shell';
import { saveMailTemplate, sendTestMail } from '../../actions';
import type { MailTemplateRow } from '../../data/adminLeadsRepository';

export function MailTemplateForm({ template }: { readonly template: MailTemplateRow }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveMailTemplate, IDLE);
  const [testState, testAction, testPending] = useActionState(sendTestMail, IDLE);
  const k = template.key;
  return (
    <div className="grid gap-4 rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">{template.name}</h2>
          <p className="font-mono text-xs text-muted-foreground">{k}</p>
        </div>
        <form action={testAction}>
          <input type="hidden" name="key" value={k} />
          <Button type="submit" size="sm" variant="outline" disabled={testPending}>
            {t('mail.testSend')}
          </Button>
        </form>
      </div>
      {testState.done ? <p role="status" className="text-sm text-green-700">{t('mail.testQueued')}</p> : null}
      {testState.error ? <p role="alert" className="text-sm text-destructive">{t(`errors.${testState.error}`)}</p> : null}
      <p className="text-xs text-muted-foreground">
        {t('mail.variables')}: {template.variables.map((v) => `{{${v}}}`).join(' ')}
      </p>
      <form action={action} className="grid gap-3">
        <input type="hidden" name="id" value={template.id} />
        <ActionMessage state={state} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor={`${k}-subjectTr`}>{t('mail.subject')} (TR)</Label>
            <Input id={`${k}-subjectTr`} name="subjectTr" defaultValue={template.subject['tr'] ?? ''} required />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`${k}-subjectEn`}>{t('mail.subject')} (EN)</Label>
            <Input id={`${k}-subjectEn`} name="subjectEn" defaultValue={template.subject['en'] ?? ''} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`${k}-bodyTr`}>{t('mail.body')} (TR)</Label>
            <Textarea id={`${k}-bodyTr`} name="bodyTr" rows={8} defaultValue={template.body['tr'] ?? ''} required />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`${k}-bodyEn`}>{t('mail.body')} (EN)</Label>
            <Textarea id={`${k}-bodyEn`} name="bodyEn" rows={8} defaultValue={template.body['en'] ?? ''} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={template.is_active} /> {t('mail.active')}
        </label>
        <div>
          <Button type="submit" size="sm" disabled={pending}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
