'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState, useEffect, useRef, useState } from 'react';
import { IDLE } from '@/lib/formState';
import { pickLocale } from '@/lib/localized';
import { Button } from '@/ui/Button';
import { submitLead } from '../../actions';
import type { QuoteFormOptions } from '../../domain/leadSchema';

interface Props {
  readonly variant: 'contact_form' | 'quote_form' | 'quote_basket' | 'configurator';
  readonly services: readonly { readonly id: string; readonly title: string }[];
  readonly options: QuoteFormOptions;
  /** Ek gizli alanlar (ör. sepet kalemleri JSON). */
  readonly hiddenFields?: Readonly<Record<string, string>>;
  readonly onSuccess?: (data: Readonly<Record<string, string>>) => void;
}

/** İletişim / teklif formu: görünür etiketler, alanın yanında hata, bal küpü, KVKK onayı; JS'siz de gönderilir. */
export function LeadForm({ variant, services, options, hiddenFields, onSuccess }: Props) {
  const t = useTranslations('LeadForm');
  const locale = useLocale();
  const [state, action, pending] = useActionState(submitLead, IDLE);
  const [pageUrl, setPageUrl] = useState('');
  const [utm, setUtm] = useState({ source: '', medium: '', campaign: '' });
  const doneRef = useRef(false);
  useEffect(() => {
    if (state.done && !doneRef.current) {
      doneRef.current = true;
      onSuccess?.(state.data ?? {});
    }
  }, [state.done, state.data, onSuccess]);
  useEffect(() => {
    setPageUrl(window.location.href);
    const q = new URLSearchParams(window.location.search);
    setUtm({ source: q.get('utm_source') ?? '', medium: q.get('utm_medium') ?? '', campaign: q.get('utm_campaign') ?? '' });
  }, []);
  const invalid = (name: string) => (state.fieldErrors?.[name] ? 'true' : undefined);
  const err = (name: string) => (state.fieldErrors?.[name] ? <span className="text-[length:var(--fs-xs)] text-[var(--color-danger)]">{t('errors.validation')}</span> : null);

  if (state.done) {
    return (
      <div role="status" className="grid gap-2 border-l-4 border-[var(--color-accent)] bg-[var(--color-surface)] p-6">
        <p className="font-[family-name:var(--font-heading)] text-xl font-bold">{t('successTitle')}</p>
        <p className="text-[var(--color-text-muted)]">{t('successBody', { ref: state.data?.['ref'] ?? '' })}</p>
      </div>
    );
  }

  const select = (name: string, label: string, items: readonly { key: string; label: Readonly<Record<string, string>> }[]) =>
    items.length === 0 ? null : (
      <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
        {label}
        <select name={name} className="field" defaultValue="">
          <option value="">{t('none')}</option>
          {items.map((o) => (
            <option key={o.key} value={o.key}>
              {pickLocale(o.label, locale, { fallback: 'tr' })}
            </option>
          ))}
        </select>
      </label>
    );

  return (
    <form action={action} className="grid gap-5" noValidate={false}>
      <input type="hidden" name="source" value={variant} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="pageUrl" value={pageUrl} />
      <input type="hidden" name="utmSource" value={utm.source} />
      <input type="hidden" name="utmMedium" value={utm.medium} />
      <input type="hidden" name="utmCampaign" value={utm.campaign} />
      {Object.entries(hiddenFields ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="hidden" aria-hidden="true">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.error ? (
        <p role="alert" className="border-l-4 border-[var(--color-danger)] pl-4 text-[var(--color-danger)]">
          {t(`errors.${state.error === 'rateLimited' ? 'rateLimited' : state.error === 'notConfigured' ? 'notConfigured' : state.error === 'validation' ? 'validation' : state.error === 'forbidden' ? 'forbidden' : 'unexpected'}`)}
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
          {t('fullName')}
          <input name="fullName" required minLength={2} maxLength={120} autoComplete="name" aria-invalid={invalid('fullName')} className="field" />
          {err('fullName')}
        </label>
        <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
          {t('company')}
          <input name="company" maxLength={120} autoComplete="organization" className="field" />
        </label>
        <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
          {t('email')}
          <input name="email" type="email" maxLength={200} autoComplete="email" aria-invalid={invalid('email')} aria-describedby="lead-contact-hint" className="field" />
          {err('email')}
        </label>
        <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
          {t('phone')}
          <input name="phone" type="tel" maxLength={24} autoComplete="tel" aria-invalid={invalid('phone')} aria-describedby="lead-contact-hint" className="field" />
          {err('phone')}
        </label>
        <p id="lead-contact-hint" className="text-[length:var(--fs-xs)] text-[var(--color-text-subtle)] sm:col-span-2">
          {t('contactHint')}
        </p>
        {variant !== 'contact_form' ? (
          <>
            <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
              {t('city')}
              <input name="city" maxLength={120} autoComplete="address-level2" className="field" />
            </label>
            {variant === 'quote_form' && services.length > 0 ? (
              <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
                {t('service')}
                <select name="serviceId" className="field" defaultValue="">
                  <option value="">{t('none')}</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {select('projectType', t('projectType'), options.projectTypes)}
            {select('budget', t('budget'), options.budgets)}
            {select('timeline', t('timeline'), options.timelines)}
          </>
        ) : (
          <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium sm:col-span-2">
            {t('subject')}
            <input name="subject" maxLength={200} className="field" />
          </label>
        )}
        <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium sm:col-span-2">
          {t('message')}
          <textarea name="message" rows={6} maxLength={4000} aria-invalid={invalid('message')} className="field" />
        </label>
      </div>
      <label className="flex items-start gap-3 text-[length:var(--fs-sm)]">
        <input type="checkbox" name="consentKvkk" required className="mt-1" aria-invalid={invalid('consentKvkk')} /> <span>{t('consentKvkk')}</span>
      </label>
      <label className="flex items-start gap-3 text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">
        <input type="checkbox" name="consentMarketing" className="mt-1" /> <span>{t('consentMarketing')}</span>
      </label>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? t('sending') : t('submit')}
        </Button>
      </div>
    </form>
  );
}
