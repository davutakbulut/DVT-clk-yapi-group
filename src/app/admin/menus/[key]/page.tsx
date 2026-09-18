import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { routing } from '@/i18n/routing';
import { MenuItemsManager } from '@/modules/navigation';
import { listMenuItemsForAdmin } from '@/modules/navigation/server';

export default async function AdminMenuPage({ params }: { readonly params: Promise<{ key: string }> }) {
  const [{ key }, t, gate] = await Promise.all([params, getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const result = await listMenuItemsForAdmin(key);
  if (!result.ok) {
    if (result.error.code === 'not_found') notFound();
    return <p role="alert">{t('errors.unexpected')}</p>;
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{result.data.menu.title['tr'] ?? key}</h1>
        <p className="text-muted-foreground">{t('menus.lead')}</p>
      </div>
      <MenuItemsManager menuId={result.data.menu.id} menuKey={key} items={result.data.items} knownPaths={Object.keys(routing.pathnames)} />
    </div>
  );
}
