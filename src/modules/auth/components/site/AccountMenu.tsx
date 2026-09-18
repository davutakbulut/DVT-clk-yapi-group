'use client';

import { useTranslations } from 'next-intl';
import NextLink from 'next/link';
import { useEffect, useState } from 'react';
import { isAppRole, isStaffRole } from '@/core/auth/roles';
import { getBrowserClient } from '@/core/db/createBrowserClient';
import { Link } from '@/i18n/navigation';
import { signOut } from '../../actions';

type State = { readonly status: 'loading' } | { readonly status: 'guest' } | { readonly status: 'user'; readonly isStaff: boolean; readonly name: string };

/**
 * Header'daki hesap düğmesi. İstemci bileşeni: sunucuda render edilseydi ya layout dinamikleşir (ISR ölür) ya da bir
 * kullanıcının durumu herkese önbelleklenirdi (01-PUBLIC-PAGES). Sabit genişlikli iskelet → düzen kayması yok.
 */
export function AccountMenu() {
  const t = useTranslations('Auth');
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const client = getBrowserClient();
    if (!client) {
      setState({ status: 'guest' });
      return;
    }
    let cancelled = false;
    async function load() {
      const { data } = await client!.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        setState({ status: 'guest' });
        return;
      }
      const { data: profile } = await client!.from('profiles').select('role, full_name').eq('id', data.user.id).maybeSingle();
      if (cancelled) return;
      const role = profile?.role;
      setState({ status: 'user', isStaff: isAppRole(role) ? isStaffRole(role) : false, name: profile?.full_name ?? data.user.email ?? '' });
    }
    void load();
    const { data: sub } = client.auth.onAuthStateChange(() => void load());
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

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
