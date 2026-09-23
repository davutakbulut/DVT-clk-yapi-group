import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, ContentTable, thumbSrc } from '@/modules/admin-shell';
import { deleteCertificate, moveCertificate } from '@/modules/corporate/actions';
import { listCertificatesForAdmin } from '@/modules/corporate/server';

export default async function Page() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const rows = await listCertificatesForAdmin();
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('corporate.certificates.title')} lead={t('corporate.certificates.lead')} action={{ href: '/admin/certificates/new', label: t('corporate.certificates.new') }} />
      <ContentTable rows={rows.data.map((c) => ({ id: c.id, title: c.title, slug: null, status: c.status, published_locales: c.published_locales, extra: [c.issuer, c.valid_until].filter(Boolean).join(' · '), thumb: thumbSrc(c.thumb) }))} basePath="/admin/certificates" extraLabel={t('corporate.certificates.issuer')} move={moveCertificate} remove={deleteCertificate} />
    </div>
  );
}
