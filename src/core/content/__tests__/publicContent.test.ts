import { describe, expect, it } from 'vitest';
import { alternatesFromRow, isVisibleIn, slugFor } from '../publicContent';

const row = { status: 'published', published_locales: ['tr'], published_at: null, slug: { tr: 'celik', en: 'steel' } };

describe('core/content', () => {
  it('K-07: yayında + dilde yayında + zamanı gelmiş', () => {
    expect(isVisibleIn(row, 'tr')).toBe(true);
    expect(isVisibleIn(row, 'en')).toBe(false);
    expect(isVisibleIn({ ...row, status: 'draft' }, 'tr')).toBe(false);
    expect(isVisibleIn({ ...row, published_at: '2999-01-01T00:00:00Z' }, 'tr')).toBe(false);
  });

  it('hreflang: çevrilmemiş dil null, yayınlanan dil tipli href', () => {
    expect(alternatesFromRow(row, '/services/[slug]')).toEqual({ tr: { pathname: '/services/[slug]', params: { slug: 'celik' } }, en: null });
    expect(slugFor(row.slug, 'en')).toBe('steel');
    expect(slugFor('bozuk', 'tr')).toBeNull();
  });
});
