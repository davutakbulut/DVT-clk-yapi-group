import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { buildAlternates } from '@/i18n/alternates';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { AuthForm, requestPasswordReset } from '@/modules/auth';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Auth' });
  return { title: t('forgotTitle'), robots: { index: false }, alternates: buildAlternates(locale as Locale, { tr: '/forgot-password', en: '/forgot-password' }) };
}

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('Auth');

  return (
    <Container as="section" className="grid max-w-md gap-8 py-[var(--section-y)]">
      <SectionHeading as="h1" title={t('forgotTitle')} lead={t('forgotLead')} />
      <AuthForm action={requestPasswordReset} submitLabel={t('submitForgot')} doneMessage={t('forgotSent')} fields={[{ name: 'email', label: t('email'), type: 'email', autoComplete: 'email' }]}>
        <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">
          <Link href="/login" className="underline underline-offset-4">
            {t('login')}
          </Link>
        </p>
      </AuthForm>
    </Container>
  );
}
