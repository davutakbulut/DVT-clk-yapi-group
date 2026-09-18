'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { IDLE } from '@/lib/formState';
import { Button } from '@/ui/Button';
import { submitApplication } from '../../actions';

export function ApplicationForm({ jobPostingId, locale }: { readonly jobPostingId: string; readonly locale: string }) {
  const t = useTranslations('Corporate');
  const [state, action, pending] = useActionState(submitApplication, IDLE);
  const invalid = (name: string) => (state.fieldErrors?.[name] ? 'true' : undefined);
  if (state.done) {
    return (
      <p role="status" className="border-l-4 border-[var(--color-accent)] pl-4">
        {t('applied')}
      </p>
    );
  }
  const errorKey = state.error === 'fileSize' || state.error === 'fileType' || state.error === 'rateLimited' || state.error === 'notConfigured' || state.error === 'validation' ? state.error : state.error ? 'unexpected' : null;
  return (
    <form action={action} className="grid gap-4" encType="multipart/form-data">
      <input type="hidden" name="jobPostingId" value={jobPostingId} />
      <input type="hidden" name="locale" value={locale} />
      <div className="hidden" aria-hidden="true">
        <label>
          Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {errorKey ? (
        <p role="alert" className="text-[var(--color-danger)]">
          {t(`errors.${errorKey}`)}
        </p>
      ) : null}
      <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
        {t('fullName')}
        <input name="fullName" required minLength={2} maxLength={120} autoComplete="name" aria-invalid={invalid('fullName')} className="field" />
      </label>
      <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
        {t('email')}
        <input name="email" type="email" required maxLength={200} autoComplete="email" aria-invalid={invalid('email')} className="field" />
      </label>
      <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
        {t('phone')}
        <input name="phone" type="tel" maxLength={24} autoComplete="tel" className="field" />
      </label>
      <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
        {t('coverLetter')}
        <textarea name="coverLetter" rows={5} maxLength={6000} className="field" />
      </label>
      <label className="grid gap-1 text-[length:var(--fs-sm)] font-medium">
        {t('cv')}
        <input name="cv" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-invalid={invalid('cv')} className="field" />
      </label>
      <label className="flex items-start gap-3 text-[length:var(--fs-sm)]">
        <input type="checkbox" name="consentKvkk" required className="mt-1" /> <span>{t('consent')}</span>
      </label>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? t('sending') : t('submit')}
        </Button>
      </div>
    </form>
  );
}
