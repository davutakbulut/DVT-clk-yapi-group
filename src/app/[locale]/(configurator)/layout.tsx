import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { ConfiguratorBackLink } from '@/modules/configurator';
import { BasketProvider } from '@/modules/quote-basket';
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
        <ConfiguratorBackLink />
        <span className="label-mono text-[var(--color-text-inverse-subtle)]">{t('title')}</span>
      </header>
      {/* K-100: basit konfigüratörler metrajı teklif sepetine ekler → sağlayıcı bu grupta da var (localStorage, sunucu isteği yok) */}
      <BasketProvider>
        <main id="main-content" tabIndex={-1} className="configurator-main">
          {children}
        </main>
      </BasketProvider>
    </div>
  );
}
