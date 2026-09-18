import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, ContentTable } from '@/modules/admin-shell';
import { deleteProduct, moveProduct } from '@/modules/products/actions';
import { listProductsForAdmin } from '@/modules/products/server';

export default async function AdminProductsPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const rows = await listProductsForAdmin();
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('products.title')} lead={t('products.lead')} action={{ href: '/admin/products/new', label: t('products.new') }} />
      <p className="text-sm text-muted-foreground">{t('products.count', { count: rows.data.length })}</p>
      <ContentTable rows={rows.data.map((r) => ({ id: r.id, title: r.name, slug: r.slug, status: r.status, published_locales: r.published_locales, is_featured: r.is_featured, extra: r.categoryName }))} basePath="/admin/products" extraLabel={t('products.categoryCol')} move={moveProduct} remove={deleteProduct} />
    </div>
  );
}
