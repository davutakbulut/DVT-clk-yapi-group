import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ModuleBoundary } from '@/core/errors';
import { buildAlternates } from '@/i18n/alternates';
import type { Locale } from '@/i18n/routing';
import { BasketSync } from '@/modules/account';
import { AccountShell, getMySavedBasket, requireMember } from '@/modules/account/server';
import { parseBasket } from '@/modules/quote-basket';

interface Props { readonly params: Promise<{ locale: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'Account' });
  return { title: t('tabs.basket'), robots: { index: false }, alternates: buildAlternates(locale as Locale, { tr: '/account/basket', en: '/account/basket' }) };
}
/** Hesabım · sepet (K-103): cihaz sepeti (istemci) ↔ hesaba kaydedilen sepet. */
export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const user = await requireMember(locale as Locale, '/account/basket');
  const [t, saved] = await Promise.all([getTranslations('Account'), getMySavedBasket(user.id)]);
  return (
    <AccountShell active="basket" lead={t('basket.lead')}>
      <ModuleBoundary module="account/basket"><BasketSync saved={parseBasket(JSON.stringify(saved.ok ? saved.data : []))} /></ModuleBoundary>
    </AccountShell>
  );
}
