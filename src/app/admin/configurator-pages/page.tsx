import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, ContentTable, thumbSrc } from '@/modules/admin-shell';
import { deleteGuide } from '@/modules/configurator-pages/actions';
import { listGuidesForAdmin } from '@/modules/configurator-pages/server';

/** Konfigüratör rehber sayfaları (K-107) */
export default async function AdminConfiguratorPagesPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const rows = await listGuidesForAdmin();
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('configuratorPages.title')} lead={t('configuratorPages.lead')} action={{ href: '/admin/configurator-pages/new', label: t('configuratorPages.new') }} />
      <ContentTable rows={rows.data.map((r) => ({ id: r.id, title: r.title, slug: r.slug, status: r.status, published_locales: r.published_locales, extra: t(`configuratorPages.keys.${r.configurator_key as 'hall'}`), thumb: thumbSrc(r.thumb) }))} basePath="/admin/configurator-pages" extraLabel={t('configuratorPages.key')} remove={deleteGuide} />
    </div>
  );
}
