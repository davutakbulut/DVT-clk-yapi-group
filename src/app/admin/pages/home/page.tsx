import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { AboutForm, HeroForm } from '@/modules/home';
import { getAdminHome } from '@/modules/home/server';
import { HomePageSettingsForm } from '@/modules/site-settings';
import { loadSettingsForAdmin } from '@/modules/site-settings/server';

export default async function AdminHomePage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [home, settings] = await Promise.all([getAdminHome(), loadSettingsForAdmin()]);
  if (!home.ok || !settings.ok) return <p role="alert">{t('errors.unexpected')}</p>;

  return (
    <div className="grid max-w-4xl gap-8">
      <AdminPageHeader title={t('pages.home')} lead={t('pages.homeLead')} />
      <HeroForm hero={home.data.hero} images={home.data.images} videos={home.data.videos} />
      {/* K-111: bölüm metinleri (site_settings home.page) */}
      <HomePageSettingsForm copy={settings.data.settings.homePage} />
      <AboutForm about={home.data.about} images={home.data.images} />
    </div>
  );
}
