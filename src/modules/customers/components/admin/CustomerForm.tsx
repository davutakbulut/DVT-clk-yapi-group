'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection } from '@/modules/admin-shell';
import { saveCustomer } from '../../actions';
import type { CustomerDetail, MemberChoice } from '../../data/adminCustomersRepository';

interface Props {
  readonly customer: CustomerDetail | null;
  readonly members: readonly MemberChoice[];
  readonly canEdit: boolean;
}

/** Müşteri kartı (05-SALES-FINANCE › CRM): tip · kimlik · vergi · adres · iletişim · yetkili · notlar · kaynak · üye bağlantısı. */
export function CustomerForm({ customer, members, canEdit }: Props) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveCustomer, IDLE);
  const c = customer;
  const [type, setType] = useState<'individual' | 'corporate'>((c?.type as 'individual' | 'corporate') ?? 'corporate');
  const locked = !canEdit || Boolean(c?.anonymized_at);
  const field = (name: string, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="grid gap-1">
      <Label htmlFor={`c-${name}`}>{label}</Label>
      <Input id={`c-${name}`} name={name} readOnly={locked} aria-invalid={state.fieldErrors?.[name] ? 'true' : undefined} {...props} />
      <FieldError state={state} name={name} />
    </div>
  );

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="id" value={c?.id ?? ''} />
      <ActionMessage state={state} />
      {c?.anonymized_at ? <p className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm">{t('customers.anonymizedNote', { date: c.anonymized_at.slice(0, 10) })}</p> : null}

      <FormSection title={t('customers.identity')}>
        <fieldset className="flex flex-wrap gap-4 text-sm">
          <legend className="mb-1 text-sm font-medium">{t('customers.type')}</legend>
          {(['corporate', 'individual'] as const).map((v) => (
            <label key={v} className="flex items-center gap-2">
              <input type="radio" name="type" value={v} checked={type === v} onChange={() => setType(v)} disabled={locked} /> {t(`customers.types.${v}`)}
            </label>
          ))}
        </fieldset>
        <div className="grid gap-3 sm:grid-cols-2">
          {type === 'corporate' ? field('companyTitle', t('customers.companyTitle'), { defaultValue: c?.company_title ?? '', required: true }) : null}
          {field('fullName', type === 'corporate' ? t('customers.contactName') : t('customers.fullName'), { defaultValue: c?.full_name ?? '', required: type === 'individual' })}
          {field('taxOffice', t('customers.taxOffice'), { defaultValue: c?.tax_office ?? '' })}
          {field('taxId', t('customers.taxId'), { defaultValue: c?.tax_id ?? '', inputMode: 'numeric', placeholder: '1234567890' })}
        </div>
      </FormSection>

      <FormSection title={t('customers.contact')}>
        <div className="grid gap-3 sm:grid-cols-2">
          {field('email', t('settings.email'), { defaultValue: c?.email ?? '', type: 'email', autoComplete: 'off' })}
          {field('phone', t('settings.phone'), { defaultValue: c?.phone ?? '', type: 'tel' })}
          {field('contactPerson', t('customers.contactPerson'), { defaultValue: c?.contact_person ?? '' })}
          {field('contactPhone', t('customers.contactPhone'), { defaultValue: c?.contact_phone ?? '', type: 'tel' })}
          {field('city', t('customers.city'), { defaultValue: c?.city ?? '' })}
          {field('district', t('customers.district'), { defaultValue: c?.district ?? '' })}
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor="c-address">{t('settings.address')}</Label>
            <Textarea id="c-address" name="address" rows={2} defaultValue={c?.address ?? ''} readOnly={locked} />
          </div>
        </div>
      </FormSection>

      <FormSection title={t('customers.other')}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1">
            <Label htmlFor="c-source">{t('customers.source')}</Label>
            <select id="c-source" name="source" defaultValue={c?.source ?? 'manual'} disabled={locked} className="h-9 rounded-md border bg-background px-2 text-sm">
              {(['manual', 'lead', 'configurator'] as const).map((s) => (
                <option key={s} value={s}>
                  {t(`customers.sources.${s}`)}
                </option>
              ))}
            </select>
            {locked ? <input type="hidden" name="source" value={c?.source ?? 'manual'} /> : null}
          </div>
          <div className="grid gap-1">
            <Label htmlFor="c-profileId">{t('customers.member')}</Label>
            <select id="c-profileId" name="profileId" defaultValue={c?.profile_id ?? ''} disabled={locked} className="h-9 rounded-md border bg-background px-2 text-sm">
              <option value="">{t('common.none')}</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={c?.is_active ?? true} disabled={locked} /> {t('common.active')}
          </label>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="c-notes">{t('customers.notes')}</Label>
          <Textarea id="c-notes" name="notes" rows={4} defaultValue={c?.notes ?? ''} readOnly={locked} />
        </div>
      </FormSection>

      {locked ? null : (
        <div>
          <Button type="submit" size="sm" disabled={pending}>
            {t('common.save')}
          </Button>
        </div>
      )}
    </form>
  );
}
