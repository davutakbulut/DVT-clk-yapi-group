'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/ui/Button';
import { readConsentFromDocument, writeConsentToDocument } from '../../domain/consent';

export interface CookieBannerTexts {
  readonly title: string;
  readonly body: string;
  readonly accept: string;
  readonly reject: string;
  readonly settings: string;
}

/**
 * Çerez bandı (03-SECURITY-KVKK): onay yoksa açılır; "tümünü kabul" / "yalnız zorunlu" / ayrıntılı tercih.
 * Metinler panelden (site_settings.cookie_banner). Footer'daki "Çerez ayarları" bağlantısı `clk:consent-open` olayıyla yeniden açar.
 */
export function CookieBanner({ texts, policyAvailable }: { readonly texts: CookieBannerTexts; readonly policyAvailable: boolean }) {
  const t = useTranslations('Consent');
  const [open, setOpen] = useState(false);
  const [detailed, setDetailed] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsentFromDocument();
    if (!existing) setOpen(true);
    else {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
    const reopen = () => {
      setDetailed(true);
      setOpen(true);
    };
    window.addEventListener('clk:consent-open', reopen);
    return () => window.removeEventListener('clk:consent-open', reopen);
  }, []);

  if (!open) return null;
  const save = (a: boolean, m: boolean) => {
    writeConsentToDocument({ analytics: a, marketing: m });
    setOpen(false);
  };

  return (
    <section role="dialog" aria-modal="false" aria-labelledby="consent-title" aria-label={t('ariaLabel')} className="consent-banner" data-on-dark="">
      <div className="container-x grid gap-4 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="grid gap-1">
          <p id="consent-title" className="font-[family-name:var(--font-heading)] text-lg font-bold">
            {texts.title}
          </p>
          <p className="max-w-[70ch] text-[length:var(--fs-sm)] text-[var(--color-text-inverse-muted)]">
            {texts.body}{' '}
            {policyAvailable ? (
              <Link href="/cookie-policy" className="underline underline-offset-4">
                {t('policy')}
              </Link>
            ) : null}
          </p>
          {detailed ? (
            <div className="mt-2 flex flex-wrap gap-4 text-[length:var(--fs-sm)]">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked disabled /> {t('necessary')}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} /> {t('analytics')}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} /> {t('marketing')}
              </label>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {detailed ? (
            <Button onClick={() => save(analytics, marketing)}>{t('save')}</Button>
          ) : (
            <>
              <Button onClick={() => save(true, true)}>{texts.accept}</Button>
              <Button variant="ghost" onClick={() => save(false, false)}>
                {texts.reject}
              </Button>
              <Button variant="ghost" onClick={() => setDetailed(true)}>
                {texts.settings}
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/** Footer'da: bandı yeniden açar (KVKK: tercih her zaman değiştirilebilir). */
export function CookieSettingsButton({ label }: { readonly label: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('clk:consent-open'))} className="underline-offset-4 hover:underline">
      {label}
    </button>
  );
}
