import { getTranslations } from 'next-intl/server';
import { getPublicSettings } from '@/modules/site-settings';
import { pickLocale } from '@/lib/localized';
import { BrandMark } from '@/ui/BrandMark';
import { Container } from '@/ui/Container';
import { getMenu } from '../../services/getMenu';
import { MenuLinkView } from './MenuLinkView';

interface Props {
  readonly locale: string;
}

/** 4 sütun (menü + iletişim) + yasal alt bar. Değeri olmayan iletişim satırı hiç render edilmez — yer tutucu YOK. */
export async function Footer({ locale }: Props) {
  const [columns, legal, settings, t] = await Promise.all([getMenu('footer_primary', locale), getMenu('footer_legal', locale), getPublicSettings(), getTranslations('Footer')]);
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
            {settings.socialLinks.length > 0 ? (
              <ul aria-label={t('followUs')} className="flex flex-wrap gap-4 text-[length:var(--fs-sm)]">
                {settings.socialLinks.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} rel="noopener noreferrer" target="_blank">
                      {link.platform}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {columns.map((column) => (
            <nav key={column.id} aria-label={column.label} className="grid content-start gap-3">
              <h2 className="site-footer-heading">{column.label}</h2>
              <ul className="grid gap-2 text-[length:var(--fs-sm)]">
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
          {legal.length > 0 ? (
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {legal.map((node) => (
                <li key={node.id}>
                  <MenuLinkView node={node} />
                </li>
              ))}
            </ul>
          ) : null}
          <p className="label-mono text-[var(--color-text-inverse-subtle)]">{t('copyright', { year, siteName })}</p>
        </div>
      </Container>
    </footer>
  );
}
