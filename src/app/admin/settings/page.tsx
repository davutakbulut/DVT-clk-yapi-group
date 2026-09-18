import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { SettingsForm } from '@/modules/site-settings';
import { loadSettingsForAdmin } from '@/modules/site-settings/server';

export default async function AdminSettingsPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const data = await loadSettingsForAdmin();
  if (!data.ok) return <p role="alert">{t('errors.unexpected')}</p>;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.lead')}</p>
      </div>
      <SettingsForm settings={data.data.settings} logos={data.data.logos} />
    </div>
  );
}
