import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCurrentUser } from '@/core/auth';
import { buildAlternates } from '@/i18n/alternates';
import { Link, getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { AuthForm } from '@/modules/auth';
import { signUp } from '@/modules/auth/actions';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Auth' });
  return { title: t('registerTitle'), robots: { index: false }, alternates: buildAlternates(locale as Locale, { tr: '/register', en: '/register' }) };
}

export default async function RegisterPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [t, user] = await Promise.all([getTranslations('Auth'), getCurrentUser()]);
  if (user) redirect(getPathname({ locale: locale as Locale, href: '/account' }));

  return (
    <Container as="section" className="grid max-w-md gap-8 py-[var(--section-y)]">
      <SectionHeading as="h1" title={t('registerTitle')} lead={t('registerLead')} />
      <AuthForm
        action={signUp}
        submitLabel={t('submitRegister')}
        doneMessage={t('registerSent')}
        fields={[
          { name: 'fullName', label: t('fullName'), autoComplete: 'name' },
          { name: 'email', label: t('email'), type: 'email', autoComplete: 'email' },
          { name: 'password', label: t('password'), type: 'password', autoComplete: 'new-password' },
        ]}
      >
        <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">
          {t('haveAccount')}{' '}
          <Link href="/login" className="underline underline-offset-4">
            {t('login')}
          </Link>
        </p>
      </AuthForm>
    </Container>
  );
}
