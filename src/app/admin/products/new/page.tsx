import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { ProductForm } from '@/modules/products';
import { listProductChoices } from '@/modules/products/server';

export default async function NewProductPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const choices = await listProductChoices();
  if (!choices.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const c = choices.data;
  return (
    <div className="grid max-w-5xl gap-6">
      <AdminPageHeader title={t('products.new')} action={{ href: '/admin/products', label: t('form.back') }} />
      <ProductForm product={null} images={c.images} documents={c.documents} categories={c.categories} services={c.services} />
    </div>
  );
}
