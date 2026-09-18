import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { CertificateForm } from '@/modules/corporate';
import { listMediaChoices } from '@/modules/corporate/server';

export default async function NewPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [images, documents] = await Promise.all([listMediaChoices('image'), listMediaChoices('document')]);
  if (!images.ok || !documents.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={t('corporate.certificates.new')} action={{ href: '/admin/certificates', label: t('form.back') }} />
      <CertificateForm certificate={null} images={images.data} documents={documents.data} />
    </div>
  );
}
