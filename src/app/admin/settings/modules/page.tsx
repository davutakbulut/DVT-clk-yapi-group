import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { getPublicSettings, ModulesForm } from '@/modules/site-settings';

/** Kill switch (K-43): sorun çıkaran modül dağıtım yapmadan kapatılır. */
export default async function ModulesPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const settings = await getPublicSettings();
  return (
    <div className="grid max-w-3xl gap-6">
      <AdminPageHeader title={t('modules.title')} lead={t('modules.lead')} />
      <ModulesForm settings={settings} />
    </div>
  );
}
