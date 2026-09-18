import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { AboutForm, HeroForm } from '@/modules/home';
import { getAdminHome } from '@/modules/home/server';

export default async function AdminHomePage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const home = await getAdminHome();
  if (!home.ok) return <p role="alert">{t('errors.unexpected')}</p>;

  return (
    <div className="grid max-w-4xl gap-8">
      <AdminPageHeader title={t('pages.home')} lead={t('pages.homeLead')} />
      <HeroForm hero={home.data.hero} images={home.data.images} videos={home.data.videos} />
      <AboutForm about={home.data.about} images={home.data.images} />
    </div>
  );
}
