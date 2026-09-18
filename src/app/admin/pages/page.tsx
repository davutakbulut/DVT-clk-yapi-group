import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, StatusBadge } from '@/modules/admin-shell';
import { listLegalPagesForAdmin } from '@/modules/static-pages/server';

export default async function AdminPagesPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const pages = await listLegalPagesForAdmin();
  if (!pages.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid max-w-3xl gap-6">
      <AdminPageHeader title={t('legalPages.title')} lead={t('legalPages.lead')} />
      <ul className="grid gap-2">
        {pages.data.map((p) => (
          <li key={p.page_key} className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-3">
            <span className="font-medium">{p.title['tr'] || p.page_key}</span>
            <span className="font-mono text-xs text-muted-foreground">{p.page_key}</span>
            <StatusBadge status={p.status} locales={p.published_locales} />
            <NextLink href={`/admin/pages/${p.page_key}`} className="ml-auto text-sm underline underline-offset-4">
              {t('legalPages.edit')}
            </NextLink>
          </li>
        ))}
        <li className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-3">
          <span className="font-medium">{t('errorPages.title')}</span>
          <NextLink href="/admin/pages/errors" className="ml-auto text-sm underline underline-offset-4">
            {t('legalPages.edit')}
          </NextLink>
        </li>
        <li className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-3">
          <span className="font-medium">{t('pages.home')}</span>
          <NextLink href="/admin/pages/home" className="ml-auto text-sm underline underline-offset-4">
            {t('legalPages.edit')}
          </NextLink>
        </li>
      </ul>
    </div>
  );
}
