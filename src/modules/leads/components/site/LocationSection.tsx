import { getTranslations } from 'next-intl/server';
import { pickLocale } from '@/lib/localized';
import { getPublicSettings, mapEmbedSrc, mapLinkHref } from '@/modules/site-settings';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { LocationMap } from './LocationMap';

/** İletişim sayfası · Konum (K-112): adres + tıklanınca yüklenen harita. Adres girilmemişse bölüm hiç çizilmez (yer tutucu yok). */
export async function LocationSection({ locale }: { readonly locale: string }) {
  const [settings, t] = await Promise.all([getPublicSettings(), getTranslations('Contact')]);
  const address = pickLocale(settings.contact.address, locale, { fallback: 'tr' });
  const src = mapEmbedSrc(settings.contact.mapEmbedUrl, address, locale);
  if (!address || !src) return null;
  return (
    <section id="konum" className="border-t border-[var(--color-border)]" aria-labelledby="location-title">
      <Container className="grid gap-10 py-[var(--section-y)]">
        <SectionHeading kicker={t('locationKicker')} title={<span id="location-title">{t('location')}</span>} lead={address} />
        <LocationMap src={src} address={address} directionsHref={mapLinkHref(settings.contact.mapUrl, address)} labels={{ show: t('showMap'), directions: t('directions'), note: t('mapNote'), frameTitle: t('mapTitle', { siteName: pickLocale(settings.siteName, locale, { fallback: 'tr' }) }) }} />
      </Container>
    </section>
  );
}
