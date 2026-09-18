import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, ContentTable } from '@/modules/admin-shell';
import { deletePriceGuide, movePriceGuide } from '@/modules/pricing/actions';
import { listPriceGuidesForAdmin } from '@/modules/pricing/server';

export default async function AdminPricingPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const rows = await listPriceGuidesForAdmin();
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const stale = rows.data.filter((r) => r.isStale && r.status === 'published');
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('pricing.title')} lead={t('pricing.lead')} action={{ href: '/admin/pricing/new', label: t('pricing.new') }} />
      {stale.length > 0 ? (
        <p role="alert" className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm">
          {t('pricing.staleWarning', { count: stale.length })}: {stale.map((r) => r.title['tr']).join(', ')}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        {t('pricing.count', { count: rows.data.length })} ·{' '}
        <NextLink href="/admin/pricing/materials" className="underline underline-offset-4">
          {t('materials.title')}
        </NextLink>
      </p>
      <ContentTable rows={rows.data.map((r) => ({ id: r.id, title: r.title, slug: r.slug, status: r.status, published_locales: r.published_locales, extra: `${r.rowCount} · ${r.prices_updated_at ? r.prices_updated_at.slice(0, 10) : '—'}${r.isStale ? ' ⚠' : ''}` }))} basePath="/admin/pricing" extraLabel={t('pricing.rowsCol')} move={movePriceGuide} remove={deletePriceGuide} />
    </div>
  );
}
