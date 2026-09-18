import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { deleteMenuItem, reorderMenuItems } from '../../actions';
import type { AdminMenuItem } from '../../data/adminMenuRepository';
import { MenuItemForm } from './MenuItemForm';

interface Props {
  readonly menuId: string;
  readonly menuKey: string;
  readonly items: readonly AdminMenuItem[];
  readonly knownPaths: readonly string[];
}

/** Öğeler üst→alt ağaçla listelenir; her satır düzenleme formu + sil + yukarı/aşağı (tek RPC ile yeniden sıralama). */
export async function MenuItemsManager({ menuId, menuKey, items, knownPaths }: Props) {
  const t = await getTranslations('Admin');
  const showSlot = menuKey === 'header';
  const roots = items.filter((i) => i.parent_id === null);
  const parents = roots.map((r) => ({ id: r.id, label: r.label['tr'] ?? r.id }));
  const siblingsOf = (item: AdminMenuItem) => items.filter((i) => i.parent_id === item.parent_id);

  const moveForm = (item: AdminMenuItem, direction: -1 | 1) => {
    const siblings = siblingsOf(item);
    const index = siblings.findIndex((s) => s.id === item.id);
    const target = index + direction;
    if (target < 0 || target >= siblings.length) return null;
    const ids = siblings.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    return (
      <form action={reorderMenuItems}>
        <input type="hidden" name="ids" value={ids.join(',')} />
        <Button type="submit" variant="outline" size="sm" aria-label={direction === -1 ? t('common.up') : t('common.down')}>
          {direction === -1 ? '↑' : '↓'}
        </Button>
      </form>
    );
  };

  const row = (item: AdminMenuItem, depth: number) => (
    <li key={item.id} className={depth ? 'ml-6' : ''}>
      <details className="group rounded-md border bg-card">
        <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-2 text-sm">
          <span className="font-medium">{item.label['tr']}</span>
          <span className="text-muted-foreground">{item.link_type === 'internal' ? item.internal_path : item.link_type === 'external' ? item.external_url : item.link_type === 'anchor' ? `#${item.anchor}` : t('menus.noneType')}</span>
          {item.link_type === 'internal' && item.internal_path && !knownPaths.includes(item.internal_path) ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">{t('menus.routeMissing')}</span> : null}
          {item.header_slot ? <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{item.header_slot}</span> : null}
          {item.is_cta ? <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{t('menus.cta')}</span> : null}
          {!item.is_active ? <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{t('common.inactive')}</span> : null}
          <span className="ml-auto flex items-center gap-1">
            {moveForm(item, -1)}
            {moveForm(item, 1)}
            <form action={deleteMenuItem}>
              <input type="hidden" name="id" value={item.id} />
              <Button type="submit" variant="destructive" size="sm">
                {t('common.delete')}
              </Button>
            </form>
          </span>
        </summary>
        <div className="border-t p-3">
          <MenuItemForm menuId={menuId} item={item} parents={parents} knownPaths={knownPaths} showSlot={showSlot} />
        </div>
      </details>
      {items.filter((c) => c.parent_id === item.id).length > 0 ? <ul className="mt-2 grid gap-2">{items.filter((c) => c.parent_id === item.id).map((c) => row(c, depth + 1))}</ul> : null}
    </li>
  );

  return (
    <div className="grid gap-6">
      <ul className="grid gap-2">{roots.map((r) => row(r, 0))}</ul>
      <section className="grid gap-2">
        <h2 className="text-lg font-semibold">{t('menus.newItem')}</h2>
        <MenuItemForm menuId={menuId} parents={parents} knownPaths={knownPaths} showSlot={showSlot} />
      </section>
    </div>
  );
}
