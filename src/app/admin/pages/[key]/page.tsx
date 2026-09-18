import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { LEGAL_PAGE_KEYS, LegalPageForm } from '@/modules/static-pages';
import { listLegalPagesForAdmin } from '@/modules/static-pages/server';

export default async function EditLegalPage({ params }: { readonly params: Promise<{ key: string }> }) {
  const [t, gate, { key }] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor']), params]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  if (!(LEGAL_PAGE_KEYS as readonly string[]).includes(key)) notFound();
  const pages = await listLegalPagesForAdmin();
  if (!pages.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const page = pages.data.find((p) => p.page_key === key);
  if (!page) notFound();
  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={page.title['tr'] || key} action={{ href: '/admin/pages', label: t('form.back') }} />
      <LegalPageForm page={page} />
    </div>
  );
}
