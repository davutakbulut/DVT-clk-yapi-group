import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { listMenusForAdmin } from '@/modules/navigation/server';

export default async function AdminMenusPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const menus = await listMenusForAdmin();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('menus.title')}</h1>
        <p className="text-muted-foreground">{t('menus.lead')}</p>
      </div>
      {menus.ok ? (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {menus.data.map((m) => (
            <li key={m.id}>
              <NextLink href={`/admin/menus/${m.key}`} className="block rounded-md border bg-card p-4 hover:bg-muted">
                <span className="block font-medium">{m.title['tr'] ?? m.key}</span>
                <span className="text-sm text-muted-foreground">{t('menus.items', { count: m.itemCount })}</span>
              </NextLink>
            </li>
          ))}
        </ul>
      ) : (
        <p role="alert">{t('errors.unexpected')}</p>
      )}
    </div>
  );
}
