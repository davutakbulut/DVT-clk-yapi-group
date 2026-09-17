'use client';

import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useTransition, type MouseEvent } from 'react';
import { Link, usePathname, useRouter, type AppHref } from '@/i18n/navigation';
import { useRouteAlternates } from '@/i18n/RouteAlternates';
import { routing, type Locale } from '@/i18n/routing';

// Dil değişimi [locale] layout'unu yeniden bağlar; bileşen durumu yaşamaz, hash bu yüzden buradan taşınır.
const PENDING_HASH_KEY = 'clk:pending-hash';

function withQuery(href: AppHref, search: string): AppHref {
  const query = Object.fromEntries(new URLSearchParams(search));
  if (Object.keys(query).length === 0) return href;
  return { ...(typeof href === 'string' ? { pathname: href } : href), query } as AppHref;
}

export function LanguageSwitcher() {
  const t = useTranslations('LanguageSwitcher');
  const activeLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const alternates = useRouteAlternates();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const hash = sessionStorage.getItem(PENDING_HASH_KEY);
    if (!hash) return;
    sessionStorage.removeItem(PENDING_HASH_KEY);
    history.replaceState(history.state, '', `${location.pathname}${location.search}${hash}`);
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();
  }, []);

  function targetFor(locale: Locale): AppHref | null {
    if (alternates) return alternates.hrefs[locale] ?? alternates.fallback;
    // Sabit segmentli sayfa: şablon + mevcut parametreler yeterli, next-intl segmentleri çevirir.
    return { pathname, params } as AppHref;
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>, locale: Locale, target: AppHref) {
    // Yeni sekme / indirme gibi tarayıcı davranışlarına karışma
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (location.hash) sessionStorage.setItem(PENDING_HASH_KEY, location.hash);
    // Tam bir RSC gezinmesidir; soğuk ISR ıskasında 300–800 ms sürebilir → bekleme durumu gösterilir.
    startTransition(() => router.replace(withQuery(target, location.search), { locale, scroll: false }));
  }

  return (
    <div role="group" aria-label={t('label')} aria-busy={isPending} className="flex items-center gap-1 text-sm">
      {routing.locales.map((locale) => {
        const language = t(locale);
        const base = 'px-2 py-1 uppercase tracking-wide';

        if (locale === activeLocale) {
          return (
            <span key={locale} aria-current="true" aria-label={t('current', { language })} lang={locale} className={`${base} font-semibold underline underline-offset-4`}>
              {locale}
            </span>
          );
        }

        const target = targetFor(locale);
        // Gizlenmez, devre dışı gösterilir: gizlemek header genişliğini oynatır.
        if (target === null) {
          const hint = t('unavailable', { language });
          return (
            <span key={locale} role="link" aria-disabled="true" aria-label={hint} title={hint} lang={locale} className={`${base} cursor-not-allowed text-[var(--color-text-subtle)]`}>
              {locale}
            </span>
          );
        }

        return (
          // Elle <a> değil next-intl Link: NEXT_LOCALE çerezi yalnız böyle yazılır; JS'siz de çalışır.
          <Link
            key={locale}
            href={target}
            locale={locale}
            hrefLang={locale}
            lang={locale}
            aria-label={language}
            onClick={(event) => handleClick(event, locale, target)}
            className={`${base} text-[var(--color-text-muted)] hover:text-[var(--color-text)] ${isPending ? 'opacity-60' : ''}`}
          >
            {locale}
          </Link>
        );
      })}
      <span role="status" className="sr-only">
        {isPending ? t('switching') : ''}
      </span>
    </div>
  );
}
