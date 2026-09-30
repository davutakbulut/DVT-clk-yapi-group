import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { UnsubscribeForm } from '@/modules/mail-campaigns';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';

interface Props {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<{ t?: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Unsubscribe' });
  return { title: t('title'), robots: { index: false, follow: false }, alternates: buildAlternates(locale as Locale, { tr: '/unsubscribe', en: '/unsubscribe' }) };
}
/** /abonelik-iptal (K-108) — yalnız e-postadaki bağlantıdan gelinir (noindex; menüde yer almaz). Çıkış, düğmeye basılınca yapılır. */
export default async function UnsubscribePage({ params, searchParams }: Props) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale as Locale);
  const t = await getTranslations('Unsubscribe');
  const token = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(sp.t ?? '') ? sp.t! : null;
  return (
    <Container as="section" className="grid gap-8 py-[var(--section-y)]">
      <SectionHeading as="h1" kicker={t('kicker')} title={t('title')} />
      <ModuleBoundary module="mail-campaigns/unsubscribe">
        {token ? <UnsubscribeForm token={token} /> : <p role="alert" className="unsub-error">{t('errors.invalid')}</p>}
      </ModuleBoundary>
    </Container>
  );
}
