import { describe, expect, it } from 'vitest';
import { extractHeadings, renderMarkdown } from '../markdown';

describe('markdown başlık kimlikleri', () => {
  it("h2–h4 için Türkçe-güvenli id üretir; çakışanlara sayı ekler; render aynı id'yi yazar", () => {
    const md = '# Giriş\n\n## Çelik Karkas\n\ntext\n\n## Çelik Karkas\n\n### İmalat & Montaj';
    expect(extractHeadings(md)).toEqual([
      { level: 2, text: 'Giriş', id: 'giris' },
      { level: 3, text: 'Çelik Karkas', id: 'celik-karkas' },
      { level: 3, text: 'Çelik Karkas', id: 'celik-karkas-2' },
      { level: 4, text: 'İmalat & Montaj', id: 'imalat-montaj' },
    ]);
    const html = renderMarkdown(md);
    expect(html).toContain('<h2 id="giris">Giriş</h2>');
    expect(html).toContain('<h3 id="celik-karkas-2">');
    expect(html).toContain('<h4 id="imalat-montaj">İmalat &amp; Montaj</h4>');
  });
});
