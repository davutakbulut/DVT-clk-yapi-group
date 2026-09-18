import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getCurrentUser } from '@/core/auth';
import { buildAlternates } from '@/i18n/alternates';
import { getPathname } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { AuthForm } from '@/modules/auth';
import { signOut, updateProfile } from '@/modules/auth/actions';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';

interface Props {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Auth' });
  return { title: t('accountTitle'), robots: { index: false }, alternates: buildAlternates(locale as Locale, { tr: '/account', en: '/account' }) };
}

// Kapı (K-14): middleware yalnız yönlendirdi; asıl kontrol burada. Teklifler/konfigürasyonlar Faz 14 ve 26'da gelir.
export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const [t, user] = await Promise.all([getTranslations('Auth'), getCurrentUser()]);
  const loc = locale as Locale;
  if (!user) redirect(`${getPathname({ locale: loc, href: '/login' })}?next=${encodeURIComponent(getPathname({ locale: loc, href: '/account' }))}`);

  return (
    <Container as="section" className="grid max-w-md gap-8 py-[var(--section-y)]">
      <SectionHeading as="h1" title={t('accountTitle')} lead={t('accountLead')} />
      <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{user.email}</p>
      <AuthForm
        action={updateProfile}
        submitLabel={t('save')}
        fields={[
          { name: 'fullName', label: t('fullName'), autoComplete: 'name', defaultValue: user.fullName },
          { name: 'phone', label: t('phone'), type: 'tel', autoComplete: 'tel', required: false },
        ]}
        select={{
          name: 'preferredLocale',
          label: t('preferredLocale'),
          defaultValue: user.preferredLocale,
          options: [
            { value: 'tr', label: 'Türkçe' }, // static-ok: dil adı kendi dilinde
            { value: 'en', label: 'English' },
          ],
        }}
      />
      <form action={signOut}>
        <button type="submit" className="btn btn-ghost">
          {t('logout')}
        </button>
      </form>
    </Container>
  );
}
