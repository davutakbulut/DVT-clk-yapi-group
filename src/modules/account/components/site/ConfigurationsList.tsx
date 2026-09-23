import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { listMyConfigurations } from '../../data/accountRepository';
import { ConfigurationRow } from './ConfigurationRow';

export async function ConfigurationsList() {
  const [t, format, rows] = await Promise.all([getTranslations('Account.configurations'), getFormatter(), listMyConfigurations()]);
  if (!rows.ok) return null;
  if (rows.data.length === 0) {
    return <p className="text-[var(--color-text-muted)]">{t('empty')} <Link href="/configurator" className="underline underline-offset-4">{t('start')}</Link></p>;
  }
  return (
    <ul className="account-list">
      {rows.data.map((c) => (
        <li key={c.id} className="account-config" data-archived={c.status === 'archived' || undefined}>
          <div className="account-row">
            <span className="label-mono">{c.refCode} · v{c.currentVersion}</span>
            <span className="account-row-main">{c.name || c.refCode}{c.status === 'archived' ? <span className="account-status ml-2" data-status="archived">{t('archived')}</span> : null}</span>
            {c.tonnageKg !== null ? <span className="tabular-nums">{format.number(c.tonnageKg / 1000, { maximumFractionDigits: 2 })} t</span> : null}
            <span className="account-row-meta">{format.dateTime(new Date(c.updatedAt), { dateStyle: 'medium' })}</span>
          </div>
          <div className="account-row-links">
            <Link href={{ pathname: '/configurator/k/[token]', params: { token: c.publicToken } }} className="underline underline-offset-4">{t('open')}</Link>
            <Link href={{ pathname: '/configurator/k/[token]/print', params: { token: c.publicToken } }} className="underline underline-offset-4">{t('print')}</Link>
            <ConfigurationRow id={c.id} name={c.name} status={c.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}
