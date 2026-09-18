import { describe, expect, it } from 'vitest';
import { buildMenuTree } from '../domain/buildMenuTree';
import type { MenuItemRow } from '../domain/types';

const row = (over: Partial<MenuItemRow> & Pick<MenuItemRow, 'id'>): MenuItemRow => ({
  parent_id: null,
  label: { tr: `Etiket ${over.id}`, en: `Label ${over.id}` }, // static-ok: test verisi
  link_type: 'internal',
  internal_path: '/',
  external_url: null,
  anchor: null,
  header_slot: null,
  locales: ['tr', 'en'],
  visibility: 'all',
  is_cta: false,
  open_in_new_tab: false,
  sort_order: 0,
  ...over,
});

const known = new Set(['/', '/contact']);

describe('navigation › buildMenuTree', () => {
  it('route\'u olmayan iç bağlantı düşer, olan sıralı gelir (K-50)', () => {
    const tree = buildMenuTree([row({ id: 'b', internal_path: '/contact', sort_order: 2 }), row({ id: 'a', sort_order: 1 }), row({ id: 'x', internal_path: '/services' })], { locale: 'tr', knownPathnames: known });
    expect(tree.map((n) => n.id)).toEqual(['a', 'b']);
    expect(tree[0]?.link).toEqual({ kind: 'internal', pathname: '/' });
  });

  it('dil listesinde olmayan ve etiketi o dilde boş olan öğe İngilizce menüde görünmez', () => {
    const tree = buildMenuTree([row({ id: 'tr-only', locales: ['tr'] }), row({ id: 'no-en-label', label: { tr: 'Yalnız TR' } }), row({ id: 'ok' })], { locale: 'en', knownPathnames: known }); // static-ok: test verisi
    expect(tree.map((n) => n.id)).toEqual(['ok']);
    expect(tree[0]?.label).toBe('Label ok');
  });

  it('boş kalan footer sütunu (none + çocuksuz) düşer; dolu olan çocuklarıyla gelir', () => {
    const tree = buildMenuTree(
      [
        row({ id: 'col-empty', link_type: 'none', internal_path: null }),
        row({ id: 'col-empty-child', parent_id: 'col-empty', internal_path: '/services' }),
        row({ id: 'col', link_type: 'none', internal_path: null, sort_order: 1 }),
        row({ id: 'child', parent_id: 'col', internal_path: '/contact' }),
      ],
      { locale: 'tr', knownPathnames: known },
    );
    expect(tree.map((n) => n.id)).toEqual(['col']);
    expect(tree[0]?.children.map((n) => n.id)).toEqual(['child']);
  });

  it('görünürlük: member/staff öğeleri misafire kapalı; dış bağlantı ve çapa çözülür', () => {
    const tree = buildMenuTree(
      [row({ id: 'm', visibility: 'member' }), row({ id: 'ext', link_type: 'external', external_url: 'https://example.com', open_in_new_tab: true }), row({ id: 'anc', link_type: 'anchor', anchor: 'iletisim' })],
      { locale: 'tr', knownPathnames: known },
    );
    expect(tree.map((n) => n.id)).toEqual(['ext', 'anc']);
    expect(tree[0]?.link).toEqual({ kind: 'external', url: 'https://example.com', newTab: true });
  });
});
