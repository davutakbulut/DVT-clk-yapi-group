import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { ErrorPageForm } from '@/modules/static-pages';
import { listSystemPagesForAdmin } from '@/modules/static-pages/server';

export default async function AdminErrorPagesPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const pages = await listSystemPagesForAdmin();
  if (!pages.ok) return <p role="alert">{t('errors.unexpected')}</p>;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('errorPages.title')}</h1>
        <p className="text-muted-foreground">{t('errorPages.lead')}</p>
      </div>
      <div className="grid gap-4">
        {pages.data.map((page) => (
          <ErrorPageForm key={page.page_key} page={page} />
        ))}
      </div>
    </div>
  );
}
