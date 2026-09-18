'use client';

import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { signOut } from '../../actions';

type State = { readonly status: 'loading' } | { readonly status: 'guest' } | { readonly status: 'user'; readonly isStaff: boolean; readonly name: string };

/**
 * Header'daki hesap düğmesi. İstemci bileşeni: sunucuda render edilseydi ya layout dinamikleşir (ISR ölür) ya da bir
 * kullanıcının durumu herkese önbelleklenirdi (01-PUBLIC-PAGES). Oturum özeti /api/me'den gelir; tarayıcıda Supabase
 * istemcisi çalışmaz (K-52). Sabit genişlikli iskelet → düzen kayması yok.
 */
export function AccountMenu() {
  const t = useTranslations('Auth');
  const pathname = usePathname();
  const [state, setState] = useState<State>({ status: 'loading' });

  // Yol değişince yeniden okunur: giriş/çıkış sonrası RSC yönlendirmesi layout'u (ve bu bileşeni) mount bırakır;
  // yalnız mount'ta okunsaydı header eski durumu gösterirdi (E2E yakaladı).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Zaman damgası: Chromium, no-store'a rağmen önceki belgenin yanıtını bellek önbelleğinden verebiliyor (E2E yakaladı)
        const res = await fetch(`/api/me?t=${Date.now()}`, { credentials: 'same-origin', cache: 'no-store' });
        const data = (await res.json()) as { user: { name: string; isStaff: boolean } | null };
        if (!cancelled) setState(data.user ? { status: 'user', isStaff: data.user.isStaff, name: data.user.name } : { status: 'guest' });
      } catch {
        if (!cancelled) setState({ status: 'guest' });
      }
    }
    void load();
    const onShow = () => void load();
    window.addEventListener('pageshow', onShow);
    return () => {
      cancelled = true;
      window.removeEventListener('pageshow', onShow);
    };
  }, [pathname]);

  if (state.status === 'loading') return <span aria-hidden="true" className="inline-block h-11 w-11" />;
  if (state.status === 'guest') {
    return (
      <Link href="/login" className="site-nav-link" aria-label={t('login')}>
        <UserIcon />
        <span className="ml-1 hidden md:inline">{t('login')}</span>
      </Link>
    );
  }

  return (
    <details className="relative">
      <summary className="site-nav-link cursor-pointer list-none" aria-label={t('accountMenu')} aria-haspopup="menu">
        <UserIcon />
        <span className="ml-1 hidden max-w-[12ch] truncate md:inline">{state.name}</span>
      </summary>
      <div role="menu" className="absolute right-0 z-50 mt-2 grid min-w-48 gap-1 border border-[var(--color-border-dark)] bg-[var(--color-surface-dark)] p-2 text-[length:var(--fs-sm)]">
        <Link href="/account" role="menuitem" className="site-nav-link">
          {t('accountTitle')}
        </Link>
        {state.isStaff ? (
          // /admin locale dışı (K-12): next-intl Link değil next/link
          <NextLink href="/admin" role="menuitem" className="site-nav-link">
            {t('adminPanel')}
          </NextLink>
        ) : null}
        <form action={signOut}>
          <button type="submit" role="menuitem" className="site-nav-link w-full text-left">
            {t('logout')}
          </button>
        </form>
      </div>
    </details>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
