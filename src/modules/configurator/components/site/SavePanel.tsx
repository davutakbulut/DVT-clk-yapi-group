'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { IDLE } from '@/lib/formState';
import { saveConfiguration } from '../../actions';
import { serializeParams, type Params } from '../../domain/params';

interface Props {
  readonly params: Params;
  readonly member: boolean;
  /** Var olan kayıt (paylaşım sayfası): yeni sürüm olarak kaydeder. */
  readonly existing?: { readonly id: string; readonly token: string; readonly refCode: string; readonly name: string; readonly version: number } | null;
}

/** Kaydet/paylaş (K-29 kaydetme üyeye; K-30 anonim e-posta + token). Sonuç: paylaşım bağlantısı, yazdır/PDF, teklif iste. */
export function SavePanel({ params, member, existing = null }: Props) {
  const t = useTranslations('Configurator.save');
  const locale = useLocale();
  const [state, action, pending] = useActionState(saveConfiguration, IDLE);
  const [copied, setCopied] = useState(false);
  const token = state.data?.['token'] ?? '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${document.querySelector<HTMLAnchorElement>('[data-share-link]')?.getAttribute('href') ?? ''}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // pano yok
    }
  };

  if (state.done && token) {
    return (
      <section className="grid gap-2 border-l-4 border-[var(--color-accent-on-dark,#7FD1C2)] pl-3" role="status" data-testid="save-done">
        <p className="font-semibold">{t('done', { ref: state.data?.['ref'] ?? '', version: state.data?.['version'] ?? '1' })}</p>
        <p className="text-[length:var(--fs-xs)] text-[var(--color-text-subtle)]">{member ? t('doneMember') : t('doneAnon')}</p>
        <div className="flex flex-wrap gap-2">
          <Link href={{ pathname: '/configurator/k/[token]', params: { token } }} className="btn btn-ghost" data-share-link>
            {t('open')}
          </Link>
          <button type="button" className="btn btn-ghost" onClick={copy}>
            {copied ? t('copied') : t('copy')}
          </button>
          <Link href={{ pathname: '/configurator/k/[token]/print', params: { token } }} className="btn btn-ghost">
            {t('print')}
          </Link>
          <Link href={{ pathname: '/configurator/k/[token]', params: { token }, hash: 'quote' }} className="btn btn-primary">
            {t('quote')}
          </Link>
        </div>
      </section>
    );
  }
  const invalid = (name: string) => (state.fieldErrors?.[name] ? 'true' : undefined);
  return (
    <form action={action} className="grid gap-2" aria-labelledby="save-title" data-testid="save-form">
      <h2 id="save-title" className="text-[length:var(--fs-h4)]">
        {existing ? t('titleVersion', { version: existing.version + 1 }) : t('title')}
      </h2>
      <input type="hidden" name="params" value={serializeParams(params)} />
      <input type="hidden" name="locale" value={locale} />
      {existing ? <input type="hidden" name="configurationId" value={existing.id} /> : null}
      {existing ? <input type="hidden" name="token" value={existing.token} /> : null}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" defaultValue="" />
      <label className="configurator-field">
        <span>{t('name')}</span>
        <input name="name" className="field" maxLength={120} defaultValue={existing?.name ?? ''} aria-invalid={invalid('name')} />
      </label>
      {!member ? (
        <>
          <label className="configurator-field">
            <span>{t('email')}</span>
            <input name="email" type="email" required className="field" autoComplete="email" aria-invalid={invalid('email')} />
          </label>
          <label className="flex items-start gap-2 text-[length:var(--fs-xs)]">
            <input type="checkbox" name="consentKvkk" required className="mt-1" aria-invalid={invalid('consentKvkk')} /> <span>{t('consent')}</span>
          </label>
        </>
      ) : null}
      {state.error ? (
        <p className="configurator-danger text-[length:var(--fs-xs)]" role="alert">
          {t(`errors.${state.error === 'rateLimited' || state.error === 'validation' || state.error === 'forbidden' ? state.error : 'unexpected'}`)}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {existing ? t('submitVersion') : t('submit')}
      </button>
    </form>
  );
}
