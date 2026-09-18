import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { moduleEnabled } from '@/modules/site-settings';
import { notFound } from 'next/navigation';

/**
 * Konfigüratör route grubu (K-23): pazarlama layout'undan ayrı — Lenis/kaydırma efektleri ve ağır header yok, Three.js
 * yalnız bu grupta yüklenir (K-24). İnce üst çubuk: logo/geri bağlantısı. Hata sınırı error.tsx'te (statik galeri + iletişim).
 */
export default async function ConfiguratorLayout({ children }: { readonly children: ReactNode }) {
  if (!(await moduleEnabled('configurator'))) notFound();
  const t = await getTranslations('Configurator');
  return (
    <div className="configurator-shell">
      <a href="#main-content" className="skip-link">
        {t('skip')}
      </a>
      <header className="configurator-bar">
        <Link href="/" className="font-[family-name:var(--font-heading)] font-bold tracking-tight">
          ← {t('backHome')}
        </Link>
        <Link href="/configurator" className="label-mono text-[var(--color-text-inverse-subtle)] underline-offset-4 hover:underline">
          {t('allTypes')}
        </Link>
      </header>
      <main id="main-content" tabIndex={-1} className="configurator-main">
        {children}
      </main>
    </div>
  );
}
