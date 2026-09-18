import { isLocalizedText, pickLocale } from '@/lib/localized';
import type { MenuItemRow, MenuLink, MenuNode } from './types';

export interface BuildOptions {
  readonly locale: string;
  /** src/i18n/routing.ts pathnames anahtarları. Route'u OLMAYAN iç bağlantı sessizce düşer (K-50). */
  readonly knownPathnames: ReadonlySet<string>;
  /** Faz 5'e kadar oturum yok: yalnız 'all' ve 'guest' görünür. */
  readonly audience?: 'guest' | 'member' | 'staff';
}

function resolveLink(row: MenuItemRow, known: ReadonlySet<string>): MenuLink | null {
  switch (row.link_type) {
    case 'internal':
      return row.internal_path && known.has(row.internal_path) ? { kind: 'internal', pathname: row.internal_path } : null;
    case 'external':
      return row.external_url ? { kind: 'external', url: row.external_url, newTab: row.open_in_new_tab } : null;
    case 'anchor':
      return row.anchor ? { kind: 'anchor', anchor: row.anchor } : null;
    case 'none':
      return { kind: 'none' };
    default:
      // 'entity' bağlantıları ilgili modül (hizmet, ürün…) geldiğinde çözülür; şimdilik düşer.
      return null;
  }
}

function visibleTo(visibility: string, audience: BuildOptions['audience']): boolean {
  if (visibility === 'all') return true;
  if (visibility === 'guest') return audience === 'guest' || audience === undefined;
  if (visibility === 'member') return audience === 'member' || audience === 'staff';
  if (visibility === 'staff') return audience === 'staff';
  return false;
}

/**
 * Düz satırlardan sıralı ağaç. Saf: I/O yok.
 * Düşme kuralları: dil listesinde yoksa · görünürlük uymuyorsa · etiketi yoksa · bağlantısı çözülemiyorsa.
 * Bağlantısı 'none' olan bir başlığın hiç çocuğu kalmazsa o da düşer (boş footer sütunu çıkmaz).
 */
export function buildMenuTree(rows: readonly MenuItemRow[], options: BuildOptions): MenuNode[] {
  const { locale, knownPathnames, audience = 'guest' } = options;
  const byParent = new Map<string | null, MenuItemRow[]>();
  for (const row of rows) {
    const list = byParent.get(row.parent_id) ?? [];
    list.push(row);
    byParent.set(row.parent_id, list);
  }

  function build(parentId: string | null): MenuNode[] {
    const nodes: MenuNode[] = [];
    for (const row of [...(byParent.get(parentId) ?? [])].sort((a, b) => a.sort_order - b.sort_order)) {
      if (!row.locales.includes(locale) || !visibleTo(row.visibility, audience) || !isLocalizedText(row.label)) continue;
      const label = pickLocale(row.label, locale);
      if (!label) continue;
      const link = resolveLink(row, knownPathnames);
      if (!link) continue;
      const children = build(row.id);
      if (link.kind === 'none' && children.length === 0) continue;
      nodes.push({
        id: row.id,
        label,
        labels: row.label,
        link,
        slot: row.header_slot === 'left' || row.header_slot === 'right' ? row.header_slot : null,
        isCta: row.is_cta,
        children,
      });
    }
    return nodes;
  }

  return build(null);
}
