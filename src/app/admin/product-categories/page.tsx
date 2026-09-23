import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, Thumb, thumbSrc } from '@/modules/admin-shell';
import { listMediaChoices } from '@/modules/corporate/server';
import { ProductCategoryForm } from '@/modules/products';
import { deleteProductCategory, moveProductCategory } from '@/modules/products/actions';
import { listProductCategoriesForAdmin } from '@/modules/products/server';

export default async function ProductCategoriesPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [cats, images] = await Promise.all([listProductCategoriesForAdmin(), listMediaChoices('image')]);
  if (!cats.ok || !images.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const roots = cats.data.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => cats.data.filter((c) => c.parent_id === id);
  const controls = (id: string, name: string, siblings: number, index: number) => (
    <span className="ml-auto flex gap-1">
      <form action={moveProductCategory}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="up" />
        <Button type="submit" variant="outline" size="sm" disabled={index === 0} aria-label={`${t('common.up')}: ${name}`}>
          ↑
        </Button>
      </form>
      <form action={moveProductCategory}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="down" />
        <Button type="submit" variant="outline" size="sm" disabled={index === siblings - 1} aria-label={`${t('common.down')}: ${name}`}>
          ↓
        </Button>
      </form>
      <form action={deleteProductCategory}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="ghost" size="sm" className="text-destructive">
          {t('common.delete')}
        </Button>
      </form>
    </span>
  );
  return (
    <div className="grid max-w-5xl gap-6">
      <AdminPageHeader title={t('productCategories.title')} lead={t('productCategories.lead')} />
      <ol className="grid gap-4">
        {roots.map((root, i) => (
          <li key={root.id} className="grid gap-3">
            <div className="flex items-center gap-2">
              <Thumb src={thumbSrc(root.thumb)} alt={root.name['tr'] ?? ''} />
              <span className="font-medium">{root.name['tr']}</span>
              <span className="font-mono text-xs text-muted-foreground">{root.slug['tr']}</span>
              {controls(root.id, root.name['tr'] ?? '', roots.length, i)}
            </div>
            <ProductCategoryForm category={root} categories={cats.data} images={images.data} />
            {childrenOf(root.id).length > 0 ? (
              <ol className="grid gap-3 border-l-2 pl-4">
                {childrenOf(root.id).map((child, j) => (
                  <li key={child.id} className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <Thumb src={thumbSrc(child.thumb)} alt={child.name['tr'] ?? ''} />
                      <span className="text-sm font-medium">{child.name['tr']}</span>
                      <span className="font-mono text-xs text-muted-foreground">{child.slug['tr']}</span>
                      {controls(child.id, child.name['tr'] ?? '', childrenOf(root.id).length, j)}
                    </div>
                    <ProductCategoryForm category={child} categories={cats.data} images={images.data} />
                  </li>
                ))}
              </ol>
            ) : null}
          </li>
        ))}
      </ol>
      <section className="grid gap-2">
        <h2 className="text-base font-semibold">{t('productCategories.new')}</h2>
        <ProductCategoryForm category={null} categories={cats.data} images={images.data} />
      </section>
    </div>
  );
}
