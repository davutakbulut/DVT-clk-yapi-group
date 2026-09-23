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
              <h2 className="site-footer-heading">{column.label}</h2>
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
              <h2 className="site-footer-heading">{t('contactHeading')}</h2>
              <ul className="grid gap-2 text-[length:var(--fs-sm)]">
                {contact.phone ? (
                  <li>
                    <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                  </li>
                ) : null}
                {contact.email ? (
                  <li>
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  </li>
                ) : null}
                {address ? <li>{contact.mapUrl ? <a href={contact.mapUrl} rel="noopener noreferrer" target="_blank">{address}</a> : address}</li> : null}
                {hours ? <li>{hours}</li> : null}
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
