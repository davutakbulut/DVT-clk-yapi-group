import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { QuoteFormOptionsForm } from '@/modules/leads';
import { getQuoteFormOptionsText } from '@/modules/leads/server';

export default async function QuoteFormSettingsPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const value = await getQuoteFormOptionsText();
  if (!value.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid max-w-3xl gap-6">
      <AdminPageHeader title={t('formSettings.title')} lead={t('formSettings.lead')} />
      <QuoteFormOptionsForm value={value.data} />
    </div>
  );
}
