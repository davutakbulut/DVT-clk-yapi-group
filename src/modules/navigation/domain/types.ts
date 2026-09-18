import type { LocalizedText } from '@/lib/localized';

export type MenuKey = 'header' | 'footer_primary' | 'footer_legal' | 'mobile_extra' | 'account';

/** Veritabanı satırının bu modülün ihtiyaç duyduğu kesiti (menu_items). */
export interface MenuItemRow {
  readonly id: string;
  readonly parent_id: string | null;
  readonly label: unknown;
  readonly link_type: string;
  readonly internal_path: string | null;
  readonly external_url: string | null;
  readonly anchor: string | null;
  readonly header_slot: string | null;
  readonly locales: readonly string[];
  readonly visibility: string;
  readonly is_cta: boolean;
  readonly open_in_new_tab: boolean;
  readonly sort_order: number;
}

export type MenuLink =
  | { readonly kind: 'internal'; readonly pathname: string }
  | { readonly kind: 'external'; readonly url: string; readonly newTab: boolean }
  | { readonly kind: 'anchor'; readonly anchor: string }
  | { readonly kind: 'none' };

export interface MenuNode {
  readonly id: string;
  readonly label: string;
  readonly labels: LocalizedText;
  readonly link: MenuLink;
  readonly slot: 'left' | 'right' | null;
  readonly isCta: boolean;
  readonly children: readonly MenuNode[];
}
