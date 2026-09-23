import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { SocialLinksForm } from '@/modules/site-settings';
import { loadSettingsForAdmin } from '@/modules/site-settings/server';

/** Sosyal medya bağlantıları: footer'daki yuvarlak ikon düğmeleri buradan yönetilir (site_settings.social.links). */
export default async function SocialLinksPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const data = await loadSettingsForAdmin();
  if (!data.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid max-w-3xl gap-6">
      <AdminPageHeader title={t('social.title')} lead={t('social.lead')} />
      <SocialLinksForm initial={data.data.settings.socialLinks} />
    </div>
  );
}
