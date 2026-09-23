import { getTranslations } from 'next-intl/server';
import { isLeadStatus } from '../../domain/types';

export async function StatusBadge({ status }: { readonly status: string }) {
  const t = await getTranslations('Account.quotes.statuses');
  const key = isLeadStatus(status) ? status : 'new';
  return <span className="account-status" data-status={key}>{t(key)}</span>;
}
