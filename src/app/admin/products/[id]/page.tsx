import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, StatusBadge } from '@/modules/admin-shell';
import { ProductForm } from '@/modules/products';
import { getProductForAdmin, listProductChoices } from '@/modules/products/server';

export default async function EditProductPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const [t, gate, { id }] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor']), params]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [product, choices] = await Promise.all([getProductForAdmin(id), listProductChoices()]);
  if (!product.ok || !choices.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  if (!product.data) notFound();
  const c = choices.data;
  return (
    <div className="grid max-w-5xl gap-6">
      <AdminPageHeader title={product.data.name['tr'] || t('form.untitled')} action={{ href: '/admin/products', label: t('form.back') }} />
      <StatusBadge status={product.data.status} locales={product.data.published_locales} />
      <ProductForm product={product.data} images={c.images} documents={c.documents} categories={c.categories} services={c.services} />
    </div>
  );
}
