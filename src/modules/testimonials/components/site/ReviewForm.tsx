'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { IDLE } from '@/lib/formState';
import { Button } from '@/ui/Button';
import { submitTestimonial } from '../../actions';

interface Choice {
  readonly id: string;
  readonly label: string;
}

/** Ziyaretçi yorumu: ad, firma, puan (radyo), metin, isteğe bağlı hizmet bağlantısı, KVKK, bal küpü. Yayın insan onayıyla. */
export function ReviewForm({ services }: { readonly services: readonly Choice[] }) {
  const t = useTranslations('Testimonials');
  const te = useTranslations('LeadForm');
  const locale = useLocale();
  const [state, action, pending] = useActionState(submitTestimonial, IDLE);
  const invalid = (name: string) => (state.fieldErrors?.[name] ? 'true' : undefined);

  if (state.done) {
    return (
      <div role="status" className="grid gap-2 border-l-4 border-[var(--color-accent)] bg-[var(--color-surface)] p-6">
        <p className="font-[family-name:var(--font-heading)] text-xl font-bold">{t('form.successTitle')}</p>
        <p className="text-[var(--color-text-muted)]">{t('form.successBody')}</p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-5">
      <input type="hidden" name="locale" value={locale} />
      <div className="hidden" aria-hidden="true">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.error ? (
        <p role="alert" className="border-l-4 border-[var(--color-danger)] pl-4 text-[var(--color-danger)]">
          {te(`errors.${state.error === 'rateLimited' ? 'rateLimited' : state.error === 'notConfigured' ? 'notConfigured' : state.error === 'validation' ? 'validation' : 'unexpected'}`)}
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
          {t('form.name')}
          <input name="authorName" required minLength={2} maxLength={120} autoComplete="name" aria-invalid={invalid('authorName')} className="field" />
        </label>
        <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
          {t('form.company')}
          <input name="company" maxLength={120} autoComplete="organization" className="field" />
        </label>
        <fieldset className="grid gap-2 text-[length:var(--fs-sm)] font-medium">
          <legend>{t('form.rating')}</legend>
          <div className="flex flex-wrap gap-3" role="radiogroup">
            {[5, 4, 3, 2, 1].map((r) => (
              <label key={r} className="chip cursor-pointer">
                <input type="radio" name="rating" value={r} defaultChecked={r === 5} required className="mr-1" /> {r} ★
              </label>
            ))}
          </div>
        </fieldset>
        {services.length > 0 ? (
          <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
            {t('form.service')}
            <select name="serviceId" className="field" defaultValue="">
              <option value="">{t('form.none')}</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium sm:col-span-2">
          {t('form.body')}
          <textarea name="body" rows={5} required minLength={10} maxLength={2000} aria-invalid={invalid('body')} className="field" />
        </label>
      </div>
      <label className="flex items-start gap-3 text-[length:var(--fs-sm)]">
        <input type="checkbox" name="consentKvkk" required className="mt-1" aria-invalid={invalid('consentKvkk')} /> <span>{t('form.consent')}</span>
      </label>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? te('sending') : t('form.submit')}
        </Button>
      </div>
    </form>
  );
}
