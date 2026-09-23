import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { listMyLeads } from '../../data/accountRepository';
import { StatusBadge } from './StatusBadge';

export async function QuotesList() {
  const [t, format, leads] = await Promise.all([getTranslations('Account.quotes'), getFormatter(), listMyLeads()]);
  if (!leads.ok) return null;
  if (leads.data.length === 0) {
    return (
      <p className="text-[var(--color-text-muted)]">
        {t('empty')} <Link href="/products" className="underline underline-offset-4">{t('start')}</Link>
      </p>
    );
  }
  return (
    <div className="account-table-wrap">
      <table className="account-table">
        <thead>
          <tr><th scope="col">{t('ref')}</th><th scope="col">{t('date')}</th><th scope="col">{t('status')}</th><th scope="col" className="num">{t('items')}</th><th scope="col" className="num">{t('amount')}</th></tr>
        </thead>
        <tbody>
          {leads.data.map((l) => (
            <tr key={l.id}>
              <td><Link href={{ pathname: '/account/quotes/[id]', params: { id: l.id } }} className="label-mono underline-offset-4 hover:underline">{l.refNo}</Link>{l.subject ? <span className="block text-[length:var(--fs-xs)] text-[var(--color-text-muted)]">{l.subject}</span> : null}</td>
              <td>{format.dateTime(new Date(l.createdAt), { dateStyle: 'medium' })}</td>
              <td><StatusBadge status={l.status} /></td>
              <td className="num">{l.itemCount}</td>
              <td className="num">{l.quotedAmount !== null ? format.number(l.quotedAmount, { style: 'currency', currency: l.quotedCurrency ?? 'TRY', maximumFractionDigits: 0 }) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
