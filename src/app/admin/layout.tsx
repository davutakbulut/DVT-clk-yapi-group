import type { Metadata } from 'next';
import NextLink from 'next/link';
import { redirect } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/core/auth';
import { fontClassNames } from '@/ui/fonts';
import { ADMIN_NAV, AdminShell } from '@/modules/admin-shell';
import { NotificationBell } from '@/modules/notifications';
import '@/styles/globals.css';

// K-36: dört katmanın üçüncüsü (başlık next.config'de, robots.txt'de Disallow, sitemap'te yok).
export const metadata: Metadata = { robots: { index: false, follow: false }, title: { default: 'Yönetim Paneli', template: '%s · Yönetim' } }; // static-ok: yalnız sekme başlığı, admin TR

// Dinamik: her istekte oturum okunur (çerez). Panel ISR'a girmez.
export const dynamic = 'force-dynamic';

/**
 * /admin locale dışı (K-12), arayüz Türkçe. KAPI (K-14): oturum yoksa giriş sayfasına, personel değilse 403 içeriği.
 * Gerçek sınır RLS: buradan geçse bile veri gelmez.
 */
export default async function AdminLayout({ children }: { readonly children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/tr/giris?next=%2Fadmin');
  const [messages, t] = await Promise.all([getMessages({ locale: 'tr' }), getTranslations({ locale: 'tr', namespace: 'Admin' })]);

  return (
    <html lang="tr" data-surface="admin" className={fontClassNames}>
      <body>
        <NextIntlClientProvider locale="tr" messages={messages}>
          {user.isStaff ? (
            <AdminShell user={user} nav={ADMIN_NAV} headerExtra={<NotificationBell key="notification-bell" initialUnread={0} />}>
              {children}
            </AdminShell>
          ) : (
            <main className="mx-auto grid max-w-md gap-4 p-8 text-center">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">403</p>
              <h1 className="text-2xl font-semibold">{t('forbidden.title')}</h1>
              <p className="text-muted-foreground">{t('forbidden.body')}</p>
              <NextLink href="/tr" className="underline underline-offset-4">
                {t('forbidden.home')}
              </NextLink>
            </main>
          )}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
