import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { LanguageSwitcher } from '@/ui/LanguageSwitcher';

interface Props {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}

// İskelet çatı. Gerçek Header/Footer (menü veritabanından, üç kademeli düşüşle) Faz 4'te gelir.
export default async function MarketingLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [a11y, meta] = await Promise.all([getTranslations('A11y'), getTranslations('Meta')]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        {a11y('skipToContent')}
      </a>
      <header className="border-b border-[var(--color-border)]">
        <div className="mx-auto flex max-w-[var(--content-max)] items-center justify-between px-[var(--gutter)] py-4">
          <Link href="/" className="font-semibold tracking-tight">
            {meta('siteName')}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </main>
    </>
  );
}
