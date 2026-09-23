import { getTranslations } from 'next-intl/server';
import { getPublicSettings } from '@/modules/site-settings';
import { pickLocale } from '@/lib/localized';
import { BrandMark } from '@/ui/BrandMark';
import { Container } from '@/ui/Container';
import { LanguageSwitcher } from '@/ui/LanguageSwitcher';
import { AccountMenu } from '@/modules/auth';
import { SiteSearch } from '@/modules/search';
import { BasketLink } from '@/modules/quote-basket';
import { getMenu } from '../../services/getMenu';
import { MenuLinkView } from './MenuLinkView';
import { MobileDrawer } from './MobileDrawer';

interface Props {
  readonly locale: string;
}

/**
 * Masaüstü: logo EN BAŞTA, menü hemen yanında (veritabanı sırasıyla tek nav), sağda dil + sepet + hesap + CTA.
 * Yer daralınca (< 1280 px) dil değiştirici ve sepet header'ın ÜSTÜNDE ince bir bara çıkar; ana satırda logo, menü
 * (≥ 1024) ya da çekmece düğmesi (< 1024), hesap ve CTA kalır. Tek DOM: taşıma CSS grid alanlarıyla (çift render yok →
 * çift landmark/odak durağı yok). Menü veritabanından (önbellekli), yedeği modülde.
 */
export async function Header({ locale }: Props) {
  const [items, settings, a11y] = await Promise.all([getMenu('header', locale), getPublicSettings(), getTranslations('A11y')]);
  const siteName = pickLocale(settings.siteName, locale, { fallback: 'tr' });
  const cta = items.find((n) => n.isCta) ?? null;
  const links = items.filter((n) => !n.isCta);

  return (
    <header className="site-header" data-on-dark="">
      <Container className="site-header-grid">
        <div className="site-header-brand">
          <MobileDrawer items={links} cta={cta} brand={<BrandMark siteName={siteName} size="sm" />} tagline={pickLocale(settings.tagline, locale) || null} contact={settings.contact} socialLinks={settings.socialLinks} />
          <BrandMark siteName={siteName} iconHiddenBelowLg />
        </div>
        {links.length > 0 ? (
          <nav aria-label={a11y('mainNavigation')} className="site-header-nav">
            <ul className="flex items-center">
              {links.map((node) => (
                <li key={node.id}>
                  <MenuLinkView node={node} className="site-nav-link" />
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        {/* < 1280: üst bar · ≥ 1280: ana satırın sağı. Her kırılımda erişilebilir (K-50: çekmece olmayabilir). */}
        <div className="site-header-utils">
          <LanguageSwitcher />
          <BasketLink />
        </div>
        <div className="site-header-actions">
          {/* K-102: site içi arama — hesap menüsünün solunda; ≥1024 header altında panel, mobilde tam ekran */}
          <SiteSearch />
          <AccountMenu />
          {cta ? <MenuLinkView node={cta} className="btn btn-primary hidden sm:inline-flex" /> : null}
        </div>
      </Container>
    </header>
  );
}
