import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCurrentUser } from '@/core/auth';
import { buildAlternates } from '@/i18n/alternates';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { AuthForm } from '@/modules/auth';
import { updatePassword } from '@/modules/auth/actions';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Auth' });
  return { title: t('resetTitle'), robots: { index: false }, alternates: buildAlternates(locale as Locale, { tr: '/reset-password', en: '/reset-password' }) };
}

// Bağlantıdan gelen (auth/callback) oturum gerekir; yoksa bağlantı geçersiz/eski demektir.
export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [t, user] = await Promise.all([getTranslations('Auth'), getCurrentUser()]);

  return (
    <Container as="section" className="grid max-w-md gap-8 py-[var(--section-y)]">
      <SectionHeading as="h1" title={t('resetTitle')} lead={t('resetLead')} />
      {user ? (
        <AuthForm
          action={updatePassword}
          submitLabel={t('submitReset')}
          doneMessage={t('resetDone')}
          fields={[
            { name: 'password', label: t('password'), type: 'password', autoComplete: 'new-password' },
            { name: 'confirm', label: t('passwordConfirm'), type: 'password', autoComplete: 'new-password' },
          ]}
        />
      ) : (
        <p role="alert" className="border border-[var(--color-danger)] px-4 py-3 text-[var(--color-danger)]">
          {t('errors.sessionExpired')}{' '}
          <Link href="/forgot-password" className="underline underline-offset-4">
            {t('forgot')}
          </Link>
        </p>
      )}
    </Container>
  );
}
