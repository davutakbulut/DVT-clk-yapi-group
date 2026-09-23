import { getFormatter, getTranslations } from 'next-intl/server';
import type { CurrentUser } from '@/core/auth';
import { Link } from '@/i18n/navigation';
import { claimMyLeads, getMySavedBasket, listMyConfigurations, listMyLeads, listMyNotifications } from '../../data/accountRepository';
import { TAB_HREF } from '../../domain/types';
import { StatusBadge } from './StatusBadge';

/** Özet: sayaç kartları + son talepler + son konfigürasyonlar. Eski anonim talepler ilk ziyarette devralınır (idempotent RPC). */
export async function AccountOverview({ user }: { readonly user: CurrentUser }) {
  const claimed = await claimMyLeads();
  const [t, format, leads, configs, basket, notifications] = await Promise.all([getTranslations('Account'), getFormatter(), listMyLeads(), listMyConfigurations(), getMySavedBasket(user.id), listMyNotifications(user.id)]);
  const leadRows = leads.ok ? leads.data : [];
  const configRows = configs.ok ? configs.data.filter((c) => c.status !== 'archived') : [];
  const unread = notifications.ok ? notifications.data.filter((n) => !n.read).length : 0;
  const stats = [
    { key: 'quotes', n: leadRows.length, href: TAB_HREF.quotes },
    { key: 'configurations', n: configRows.length, href: TAB_HREF.configurations },
    { key: 'basket', n: basket.ok ? basket.data.length : 0, href: TAB_HREF.basket },
    { key: 'unread', n: unread, href: TAB_HREF.notifications },
  ] as const;
  return (
    <>
      {claimed > 0 ? <p role="status" className="border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[length:var(--fs-sm)]">{t('overview.claimed', { count: claimed })}</p> : null}
      <div className="stat-grid account-stats" role="list">
        {stats.map((s) => (
          <Link key={s.key} href={s.href} role="listitem" className="stat account-stat">
            <span className="stat-num">{s.n}</span>
            <span className="stat-label">{t(`overview.${s.key}`)}</span>
          </Link>
        ))}
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        <section className="grid gap-3" aria-labelledby="ov-quotes">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="ov-quotes" className="text-[length:var(--fs-h4)]">{t('overview.recentQuotes')}</h2>
            <Link href={TAB_HREF.quotes} className="text-[length:var(--fs-sm)] underline underline-offset-4">{t('overview.all')}</Link>
          </div>
          {leadRows.length === 0 ? <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{t('quotes.empty')}</p> : (
            <ul className="account-list">
              {leadRows.slice(0, 3).map((l) => (
                <li key={l.id}>
                  <Link href={{ pathname: '/account/quotes/[id]', params: { id: l.id } }} className="account-row">
                    <span className="label-mono">{l.refNo}</span>
                    <span className="account-row-main">{l.subject ?? t('quotes.detail')}</span>
                    <StatusBadge status={l.status} />
                    <span className="account-row-meta">{format.dateTime(new Date(l.createdAt), { dateStyle: 'medium' })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="grid gap-3" aria-labelledby="ov-configs">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="ov-configs" className="text-[length:var(--fs-h4)]">{t('overview.recentConfigs')}</h2>
            <Link href={TAB_HREF.configurations} className="text-[length:var(--fs-sm)] underline underline-offset-4">{t('overview.all')}</Link>
          </div>
          {configRows.length === 0 ? <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{t('configurations.empty')}</p> : (
            <ul className="account-list">
              {configRows.slice(0, 3).map((c) => (
                <li key={c.id}>
                  <Link href={{ pathname: '/configurator/k/[token]', params: { token: c.publicToken } }} className="account-row">
                    <span className="label-mono">{c.refCode}</span>
                    <span className="account-row-main">{c.name || c.refCode}</span>
                    {c.tonnageKg !== null ? <span className="tabular-nums">{format.number(c.tonnageKg / 1000, { maximumFractionDigits: 2 })} t</span> : null}
                    <span className="account-row-meta">{format.dateTime(new Date(c.updatedAt), { dateStyle: 'medium' })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
