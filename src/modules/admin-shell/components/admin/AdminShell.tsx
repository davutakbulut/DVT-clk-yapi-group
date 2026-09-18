'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import type { CurrentUser } from '@/core/auth';
import { Button } from '@/components/ui/button';
import { signOut } from '@/modules/auth';
import type { AdminNavItem } from '../../nav';

interface Props {
  readonly user: CurrentUser;
  readonly nav: readonly AdminNavItem[];
  readonly children: ReactNode;
}

/** Panel çatısı: sol menü (mobilde açılır), üst şerit, içerik. Tüm metin Admin.* mesajlarından. */
export function AdminShell({ user, nav, children }: Props) {
  const t = useTranslations('Admin');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = nav.filter((item) => !item.roles || item.roles.includes(user.role));

  const menu = (
    <nav aria-label={t('title')} className="grid gap-1 p-3">
      {items.map((item) => {
        const current = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return (
          <NextLink
            key={item.key}
            href={item.href}
            aria-current={current ? 'page' : undefined}
            onClick={() => setOpen(false)}
            className={`rounded-md px-3 py-2 text-sm ${current ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : 'text-sidebar-foreground hover:bg-sidebar-accent'}`}
          >
            {t(`nav.${item.key}`)}
          </NextLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <a href="#admin-content" className="skip-link">
        {t('skip')}
      </a>
      <aside className="hidden border-r bg-sidebar lg:block">
        <div className="border-b px-4 py-4 text-sm font-semibold">{t('title')}</div>
        {menu}
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3">
          <Button variant="outline" size="sm" className="lg:hidden" aria-expanded={open} aria-controls="admin-mobile-nav" onClick={() => setOpen((v) => !v)}>
            {open ? t('closeNav') : t('openNav')}
          </Button>
          <span className="truncate text-sm text-muted-foreground">
            {t('signedInAs')}: {user.fullName || user.email} · {user.role}
          </span>
          <span className="ml-auto flex items-center gap-2">
            <NextLink href="/tr" className="text-sm underline underline-offset-4">
              {t('viewSite')}
            </NextLink>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                {t('logout')}
              </Button>
            </form>
          </span>
        </header>
        {open ? (
          <div id="admin-mobile-nav" className="border-b bg-sidebar lg:hidden">
            {menu}
          </div>
        ) : null}
        <main id="admin-content" tabIndex={-1} className="flex-1 p-4 outline-none lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
