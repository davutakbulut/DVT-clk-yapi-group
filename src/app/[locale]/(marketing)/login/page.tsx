import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCurrentUser, safeReturnUrl } from '@/core/auth';
import { buildAlternates } from '@/i18n/alternates';
import { Link, getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { AuthForm, signIn } from '@/modules/auth';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';

interface Props {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<{ next?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Auth' });
  return { title: t('loginTitle'), robots: { index: false }, alternates: buildAlternates(locale as Locale, { tr: '/login', en: '/login' }) };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [{ next }, t, user] = await Promise.all([searchParams, getTranslations('Auth'), getCurrentUser()]);
  const fallback = getPathname({ locale: locale as Locale, href: '/account' });
  const target = safeReturnUrl(next, fallback);
  if (user) redirect(user.isStaff && !next ? '/admin' : target);

  return (
    <Container as="section" className="grid max-w-md gap-8 py-[var(--section-y)]">
      <SectionHeading as="h1" title={t('loginTitle')} lead={t('loginLead')} />
      <AuthForm
        action={signIn}
        hidden={{ next: target }}
        submitLabel={t('submitLogin')}
        fields={[
          { name: 'email', label: t('email'), type: 'email', autoComplete: 'email' },
          { name: 'password', label: t('password'), type: 'password', autoComplete: 'current-password' },
        ]}
      >
        <p className="flex flex-wrap justify-between gap-2 text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">
          <Link href="/forgot-password" className="underline underline-offset-4">
            {t('forgot')}
          </Link>
          <span>
            {t('noAccount')}{' '}
            <Link href="/register" className="underline underline-offset-4">
              {t('register')}
            </Link>
          </span>
        </p>
      </AuthForm>
    </Container>
  );
}
