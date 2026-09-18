'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection } from '@/modules/admin-shell';
import { addLeadNote, replyLead, updateLead } from '../../actions';
import type { LeadDetail, StaffChoice } from '../../data/adminLeadsRepository';

const STATUSES = ['new', 'in_review', 'quoted', 'won', 'lost'] as const;

export function LeadStatusForm({ lead, staff }: { readonly lead: LeadDetail; readonly staff: readonly StaffChoice[] }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(updateLead, IDLE);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={lead.id} />
      <ActionMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="l-status">{t('leads.status')}</Label>
          <select id="l-status" name="status" defaultValue={lead.status} className="h-9 rounded-md border bg-background px-2 text-sm">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`leads.statuses.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="l-assignedTo">{t('leads.assigned')}</Label>
          <select id="l-assignedTo" name="assignedTo" defaultValue={lead.assigned_to ?? ''} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="">{t('leads.unassigned')}</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="l-quotedAmount">{t('leads.quoted')}</Label>
          <div className="flex gap-2">
            <Input id="l-quotedAmount" name="quotedAmount" type="number" min={0} step="0.01" defaultValue={lead.quoted_amount ?? ''} />
            <select name="quotedCurrency" defaultValue={lead.quoted_currency ?? 'TRY'} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="currency">
              {['TRY', 'USD', 'EUR'].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="l-lostReason">{t('leads.lostReason')}</Label>
          <Input id="l-lostReason" name="lostReason" defaultValue={lead.lost_reason ?? ''} />
          <FieldError state={state} name="lostReason" />
        </div>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t('leads.update')}
        </Button>
      </div>
    </form>
  );
}

export function LeadNoteForm({ leadId }: { readonly leadId: string }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(addLeadNote, IDLE);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={leadId} />
      <ActionMessage state={state} />
      <div className="grid gap-1">
        <Label htmlFor="l-note">{t('leads.noteBody')}</Label>
        <Textarea id="l-note" name="body" rows={3} required />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="pinned" /> {t('form.featured')}
      </label>
      <div>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {t('leads.addNote')}
        </Button>
      </div>
    </form>
  );
}

export function LeadReplyForm({ lead }: { readonly lead: LeadDetail }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(replyLead, IDLE);
  if (!lead.email) return <p className="text-sm text-muted-foreground">{t('leads.noEmail')}</p>;
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={lead.id} />
      <ActionMessage state={state} />
      <div className="grid gap-1">
        <Label htmlFor="l-replySubject">{t('leads.replySubject')}</Label>
        <Input id="l-replySubject" name="subject" required minLength={2} maxLength={200} defaultValue={lead.subject ? `Re: ${lead.subject}` : ''} />
        <FieldError state={state} name="subject" />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="l-replyBody">{t('leads.replyBody')}</Label>
        <Textarea id="l-replyBody" name="body" rows={8} required minLength={2} />
        <FieldError state={state} name="body" />
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t('leads.sendReply')}
        </Button>
      </div>
    </form>
  );
}

export function QuoteFormOptionsForm({ value }: { readonly value: { readonly projectTypes: string; readonly budgets: string; readonly timelines: string } }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveQuoteFormOptionsAction, IDLE);
  return (
    <form action={action} className="grid gap-6">
      <ActionMessage state={state} />
      <FormSection title={t('formSettings.title')}>
        {(['projectTypes', 'budgets', 'timelines'] as const).map((key) => (
          <div key={key} className="grid gap-1">
            <Label htmlFor={`f-${key}`}>{t(`formSettings.${key}`)}</Label>
            <Textarea id={`f-${key}`} name={key} rows={5} defaultValue={value[key]} className="font-mono text-xs" />
          </div>
        ))}
      </FormSection>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}

import { saveQuoteFormOptions as saveQuoteFormOptionsAction } from '../../actions';
