import { describe, expect, it } from 'vitest';
import { parseSitemap, selectChanged } from '../indexNowParse';

const xml = `<?xml version="1.0"?><urlset><url><loc>https://x.test/tr</loc><lastmod>2026-09-18T10:00:00.000Z</lastmod></url><url><loc>https://x.test/en</loc></url><url><loc>https://x.test/tr/blog/a</loc><lastmod>2026-09-10T00:00:00.000Z</lastmod></url></urlset>`;

describe('indexNow', () => {
  it('sitemap ayrıştırma: loc + lastmod (yoksa null)', () => {
    expect(parseSitemap(xml)).toEqual([
      { url: 'https://x.test/tr', lastmod: '2026-09-18T10:00:00.000Z' },
      { url: 'https://x.test/en', lastmod: null },
      { url: 'https://x.test/tr/blog/a', lastmod: '2026-09-10T00:00:00.000Z' },
    ]);
  });
  it('ilk koşuda tümü; sonra yalnız since sonrası lastmod', () => {
    const entries = parseSitemap(xml);
    expect(selectChanged(entries, null)).toHaveLength(3);
    expect(selectChanged(entries, '2026-09-15T00:00:00.000Z')).toEqual(['https://x.test/tr']);
    expect(selectChanged(entries, '2026-09-19T00:00:00.000Z')).toEqual([]);
  });
});
