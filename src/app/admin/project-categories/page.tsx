import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { CategoryForm } from '@/modules/projects';
import { deleteCategory, moveCategory } from '@/modules/projects/actions';
import { listCategoriesForAdmin } from '@/modules/projects/server';

export default async function AdminProjectCategoriesPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const cats = await listCategoriesForAdmin();
  if (!cats.ok) return <p role="alert">{t('errors.unexpected')}</p>;

  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={t('projectCategories.title')} lead={t('projectCategories.lead')} />
      <ol className="grid gap-4">
        {cats.data.map((category, i) => (
          <li key={category.id} className="grid gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{category.slug['tr']}</span>
              <span className="ml-auto flex gap-1">
                <form action={moveCategory}>
                  <input type="hidden" name="id" value={category.id} />
                  <input type="hidden" name="direction" value="up" />
                  <Button type="submit" variant="outline" size="sm" disabled={i === 0} aria-label={`${t('common.up')}: ${category.name['tr'] ?? ''}`}>
                    ↑
                  </Button>
                </form>
                <form action={moveCategory}>
                  <input type="hidden" name="id" value={category.id} />
                  <input type="hidden" name="direction" value="down" />
                  <Button type="submit" variant="outline" size="sm" disabled={i === cats.data.length - 1} aria-label={`${t('common.down')}: ${category.name['tr'] ?? ''}`}>
                    ↓
                  </Button>
                </form>
                <form action={deleteCategory}>
                  <input type="hidden" name="id" value={category.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                    {t('common.delete')}
                  </Button>
                </form>
              </span>
            </div>
            <CategoryForm category={category} />
          </li>
        ))}
      </ol>
      <section className="grid gap-2">
        <h2 className="text-base font-semibold">{t('projectCategories.new')}</h2>
        <CategoryForm category={null} />
      </section>
    </div>
  );
}
