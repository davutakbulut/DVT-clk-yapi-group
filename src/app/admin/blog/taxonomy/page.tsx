import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { TaxonomyForm } from '@/modules/blog';
import { deleteTaxonomy } from '@/modules/blog/actions';
import { listTaxonomyForAdmin } from '@/modules/blog/server';

export default async function BlogTaxonomyPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [categories, tags] = await Promise.all([listTaxonomyForAdmin('blog_categories'), listTaxonomyForAdmin('blog_tags')]);
  if (!categories.ok || !tags.ok) return <p role="alert">{t('errors.unexpected')}</p>;

  const block = (table: 'blog_categories' | 'blog_tags', items: typeof categories.data, title: string, newLabel: string) => (
    <section className="grid gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ol className="grid gap-4">
        {items.map((item) => (
          <li key={item.id} className="grid gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{item.slug['tr']}</span>
              <form action={deleteTaxonomy} className="ml-auto">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="table" value={table} />
                <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                  {t('common.delete')}
                </Button>
              </form>
            </div>
            <TaxonomyForm table={table} item={item} />
          </li>
        ))}
      </ol>
      <h3 className="text-base font-semibold">{newLabel}</h3>
      <TaxonomyForm table={table} item={null} />
    </section>
  );

  return (
    <div className="grid max-w-4xl gap-10">
      <AdminPageHeader title={t('blogTaxonomy.title')} lead={t('blogTaxonomy.lead')} />
      {block('blog_categories', categories.data, t('blogTaxonomy.categories'), t('blogTaxonomy.newCategory'))}
      {block('blog_tags', tags.data, t('blogTaxonomy.tags'), t('blogTaxonomy.newTag'))}
    </div>
  );
}
