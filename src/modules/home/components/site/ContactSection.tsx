import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { pickLocale } from '@/lib/localized';
import { getPublicSettings, isModuleEnabled } from '@/modules/site-settings';
import { Container } from '@/ui/Container';

/**
 * İletişim bandı (K-111): ızgaralı lacivert zemin (K-106 CTA bandıyla aynı dil), altın birincil düğme; sağda telefon /
 * e-posta / değerlendirmeler kartları. İletişim bilgisi site_settings; değeri olmayan kart çizilmez (yer tutucu yok).
 */
export async function ContactSection({ locale }: { readonly locale: string }) {
  const [settings, t] = await Promise.all([getPublicSettings(), getTranslations('Home')]);
  const L = (v: Readonly<Partial<Record<string, string>>> | null | undefined) => pickLocale(v, locale, { fallback: 'tr' });
  const copy = settings.homePage.contact;
  const { phone, email } = settings.contact;
  const title = L(copy.title) || t('contactTitle');
  const reviews = isModuleEnabled(settings.modules, 'testimonials');
  const leads = isModuleEnabled(settings.modules, 'leads');

  return (
    <section id="iletisim" className="home-contact" data-on-dark="" aria-labelledby="home-contact-title">
      <Container className="home-contact-grid">
        <div className="grid gap-5">
          <p className="label-mono text-[var(--color-accent-on-dark)]">{t('contactKicker')}</p>
          <h2 id="home-contact-title" className="home-contact-title">{title}</h2>
          {L(copy.lede) ? <p className="home-contact-lede">{L(copy.lede)}</p> : null}
          {leads ? (
            <div className="cta-band-acts">
              <Link href="/get-quote" className="btn btn-mark">{t('quote')}</Link>
              <Link href="/contact" className="btn btn-outline-light">{t('contactPage')}</Link>
            </div>
          ) : null}
        </div>
        {phone || email || reviews ? (
          <ul className="home-ccards">
            {phone ? (
              <li><a className="home-ccard" href={`tel:${phone.replace(/[^+\d]/g, '')}`}><span><small>{t('phone')}</small><b>{phone}</b></span><span aria-hidden="true">→</span></a></li>
            ) : null}
            {email ? (
              <li><a className="home-ccard" href={`mailto:${email}`}><span><small>{t('email')}</small><b>{email}</b></span><span aria-hidden="true">→</span></a></li>
            ) : null}
            {reviews ? (
              <li><Link className="home-ccard" href="/reviews"><span><small>{t('google')}</small><b>{t('reviews')}</b></span><span aria-hidden="true">→</span></Link></li>
            ) : null}
          </ul>
        ) : null}
      </Container>
    </section>
  );
}
