import { getTranslations } from 'next-intl/server';
import { getPublicSettings } from '@/modules/site-settings';
import { pickLocale } from '@/lib/localized';
import { BrandMark } from '@/ui/BrandMark';
import { Container } from '@/ui/Container';
import { LanguageSwitcher } from '@/ui/LanguageSwitcher';
import { getMenu } from '../../services/getMenu';
import { MenuLinkView } from './MenuLinkView';
import { MobileDrawer } from './MobileDrawer';

interface Props {
  readonly locale: string;
}

/**
 * Ortalanmış logo: sol menü · marka · sağ menü + dil + CTA. Menü veritabanından (önbellekli), yedeği modülde.
 * Oturum durumu (👤) istemci bileşeni olarak Faz 5'te eklenir; sabit genişlikli yer ayrılmaz çünkü henüz öğe yok.
 */
export async function Header({ locale }: Props) {
  const [items, settings, a11y] = await Promise.all([getMenu('header', locale), getPublicSettings(), getTranslations('A11y')]);
  const siteName = pickLocale(settings.siteName, locale, { fallback: 'tr' });
  const cta = items.find((n) => n.isCta) ?? null;
  const left = items.filter((n) => !n.isCta && n.slot !== 'right');
  const right = items.filter((n) => !n.isCta && n.slot === 'right');
  const brand = <BrandMark siteName={siteName} />;

  return (
    <header className="site-header" data-on-dark="">
      <Container className="site-header-grid">
        <div className="flex items-center justify-start">
          <MobileDrawer items={items.filter((n) => !n.isCta)} cta={cta} brand={<BrandMark siteName={siteName} size="sm" />} />
          {left.length > 0 ? (
            <nav aria-label={a11y('mainNavigation')} className="hidden lg:block">
              <ul className="flex items-center">
                {left.map((node) => (
                  <li key={node.id}>
                    <MenuLinkView node={node} className="site-nav-link" />
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
        <div className="flex justify-center">{brand}</div>
        <div className="flex items-center justify-end gap-2">
          {right.length > 0 ? (
            <nav aria-label={a11y('secondaryNavigation')} className="hidden lg:block">
              <ul className="flex items-center">
                {right.map((node) => (
                  <li key={node.id}>
                    <MenuLinkView node={node} className="site-nav-link" />
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          {/* Her kırılımda header'da: mobilde çekmece olmayabilir (K-50), dil değiştirici yine erişilebilir olmalı */}
          <LanguageSwitcher />
          {cta ? <MenuLinkView node={cta} className="btn btn-primary hidden sm:inline-flex" /> : null}
        </div>
      </Container>
    </header>
  );
}
