import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { ACCOUNT_TABS, TAB_HREF, type AccountTab } from '../../domain/types';

interface Props {
  readonly active: AccountTab;
  readonly title?: ReactNode;
  readonly lead?: ReactNode;
  readonly children: ReactNode;
  readonly badges?: Partial<Readonly<Record<AccountTab, number>>>;
}
/** Hesabım kabuğu (K-103): başlık + sekme çipleri (mobilde yatay kaydırma, K-92) + bölüm içeriği. */
export async function AccountShell({ active, title, lead, children, badges = {} }: Props) {
  const t = await getTranslations('Account');
  return (
    <Container as="section" className="grid gap-8 py-[var(--section-y)]">
      <SectionHeading as="h1" kicker={t('kicker')} title={title ?? t(`tabs.${active}`)} lead={lead} />
      <nav aria-label={t('nav')} className="chips account-tabs">
        {ACCOUNT_TABS.map((tab) => (
          <Link key={tab} href={TAB_HREF[tab]} className="chip" aria-current={tab === active ? 'page' : undefined}>
            {t(`tabs.${tab}`)}
            {badges[tab] ? <span className="account-badge" aria-label={String(badges[tab])}>{badges[tab]}</span> : null}
          </Link>
        ))}
      </nav>
      <div className="grid gap-8">{children}</div>
    </Container>
  );
}
