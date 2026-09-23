import { getTranslations } from 'next-intl/server';
import { CookieSettingsButton } from '@/modules/consent';
import { getCachedServiceList } from '@/modules/services';
import { getPublicSettings } from '@/modules/site-settings';
import { pickLocale } from '@/lib/localized';
import { Link } from '@/i18n/navigation';
import { BrandMark } from '@/ui/BrandMark';
import { Container } from '@/ui/Container';
import { getMenu } from '../../services/getMenu';
import { MenuLinkView } from './MenuLinkView';
import { SocialLinks } from './SocialLinks';

interface Props {
  readonly locale: string;
}

/** 4 sütun (menü + iletişim) + yasal alt bar. Değeri olmayan iletişim satırı hiç render edilmez — yer tutucu YOK. */
export async function Footer({ locale }: Props) {
  const [columns, legal, settings, t, services] = await Promise.all([getMenu('footer_primary', locale), getMenu('footer_legal', locale), getPublicSettings(), getTranslations('Footer'), getCachedServiceList(locale)]);
  // 01-PUBLIC-PAGES › Footer: hizmet listesi tam olarak burada (uzun kuyruk iç bağlantı). "Tüm Hizmetler" bağlantısını taşıyan sütuna eklenir.
  const serviceLinks = services.ok ? services.data : [];
  const siteName = pickLocale(settings.siteName, locale, { fallback: 'tr' });
  const tagline = pickLocale(settings.tagline, locale);
  const { contact } = settings;
  const address = pickLocale(contact.address, locale);
  const hours = pickLocale(contact.workingHours, locale);
  const hasContact = Boolean(contact.phone || contact.email || address || hours);
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" data-on-dark="">
      <Container className="grid gap-10 py-[var(--space-16)]">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="grid content-start gap-4">
            <BrandMark siteName={siteName} />
            {tagline ? <p className="max-w-[36ch] text-[length:var(--fs-sm)]">{tagline}</p> : null}
            <SocialLinks links={settings.socialLinks} label={t('followUs')} />
          </div>
          {columns.map((column) => (
            <nav key={column.id} aria-label={column.label} className="grid content-start gap-3">
              <h2 className="site-footer-heading">
                <FooterIcon kind={columnIcon(column)} />
                {column.label}
              </h2>
              <ul className="grid gap-2 text-[length:var(--fs-sm)]">
                {column.children.some((c) => c.link.kind === 'internal' && c.link.pathname === '/services')
                  ? serviceLinks.map((service) => (
                      <li key={service.id}>
                        <Link href={{ pathname: '/services/[slug]', params: { slug: service.slug } }}>{service.title}</Link>
                      </li>
                    ))
                  : null}
                {column.children.map((child) => (
                  <li key={child.id}>
                    <MenuLinkView node={child} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          {hasContact ? (
            <address className="grid content-start gap-3 not-italic">
              <h2 className="site-footer-heading">
                <FooterIcon kind="chat" />
                {t('contactHeading')}
              </h2>
              <ul className="grid gap-2 text-[length:var(--fs-sm)]">
                {/* K-98: satır başı ikonlar (dekoratif, aria-hidden) */}
                {contact.phone ? (
                  <li className="site-footer-row">
                    <FooterIcon kind="phone" />
                    <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                  </li>
                ) : null}
                {contact.email ? (
                  <li className="site-footer-row">
                    <FooterIcon kind="mail" />
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  </li>
                ) : null}
                {address ? (
                  <li className="site-footer-row">
                    <FooterIcon kind="pin" />
                    <span>{contact.mapUrl ? <a href={contact.mapUrl} rel="noopener noreferrer" target="_blank">{address}</a> : address}</span>
                  </li>
                ) : null}
                {hours ? (
                  <li className="site-footer-row">
                    <FooterIcon kind="clock" />
                    <span>{hours}</span>
                  </li>
                ) : null}
              </ul>
            </address>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border-dark)] pt-6 text-[length:var(--fs-xs)]">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {legal.map((node) => (
              <li key={node.id}>
                <MenuLinkView node={node} />
              </li>
            ))}
            {settings.cookieBanner ? (
              <li>
                <CookieSettingsButton label={pickLocale(settings.cookieBanner[locale]?.settings ? { [locale]: settings.cookieBanner[locale]!.settings } : { tr: settings.cookieBanner['tr']?.settings ?? '' }, locale, { fallback: 'tr' })} />
              </li>
            ) : null}
          </ul>
          <p className="label-mono site-footer-copy text-[var(--color-text-inverse-subtle)]">{t('copyright', { year, siteName })}</p>
        </div>
      </Container>
    </footer>
  );
}

type FooterIconKind = 'phone' | 'mail' | 'pin' | 'clock' | 'chat' | 'building' | 'wrench' | 'box' | 'dot';
/** Sütun ikonu: sütunun ilk bağlantısına göre (kurumsal → bina, hizmetler → anahtar, ürün/proje → kutu); bilinmeyen → nokta. */
function columnIcon(column: { readonly children: readonly { readonly link: { readonly kind: string; readonly pathname?: string } }[] }): FooterIconKind {
  const paths = column.children.map((c) => (c.link.kind === 'internal' ? (c.link.pathname ?? '') : ''));
  if (paths.some((p) => p.startsWith('/services'))) return 'wrench';
  if (paths.some((p) => p.startsWith('/products') || p.startsWith('/projects') || p.startsWith('/configurator'))) return 'box';
  if (paths.some((p) => p.startsWith('/about') || p.startsWith('/team') || p.startsWith('/careers') || p.startsWith('/references'))) return 'building';
  return 'dot';
}
const PATHS: Record<FooterIconKind, string> = {
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  pin: 'M12 22s7-7.4 7-12a7 7 0 1 0-14 0c0 4.6 7 12 7 12zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z',
  building: 'M3 21h18M5 21V5l7-3 7 3v16M9 9h2M13 9h2M9 13h2M13 13h2M9 17h2M13 17h2',
  wrench: 'M14.7 6.3a4 4 0 0 0 5.2 5.2l-1.6 1.6-6.4 6.4a2.1 2.1 0 0 1-3-3l6.4-6.4 1.6-1.6a4 4 0 0 0-5.2-5.2z',
  box: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  dot: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
};
function FooterIcon({ kind }: { readonly kind: FooterIconKind }) {
  return (
    <svg className="site-footer-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[kind]} />
    </svg>
  );
}
