'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { confirmUnsubscribe, type UnsubscribeState } from '../../publicActions';

const IDLE: UnsubscribeState = { ok: false };

/** Onay düğmesi: bağlantıya yalnız tıklamak (posta tarayıcılarının ön yüklemesi) kimseyi listeden çıkarmaz. */
export function UnsubscribeForm({ token }: { readonly token: string }) {
  const t = useTranslations('Unsubscribe');
  const [state, action, pending] = useActionState(confirmUnsubscribe, IDLE);
  if (state.ok) return <p role="status" className="unsub-done">{t('done')}</p>;
  return (
    <form action={action} className="unsub-form">
      <input type="hidden" name="token" value={token} />
      <p>{t('lead')}</p>
      <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? t('working') : t('confirm')}</button>
      <div aria-live="polite">{state.error ? <p role="alert" className="unsub-error">{t(`errors.${state.error}`)}</p> : null}</div>
    </form>
  );
}
