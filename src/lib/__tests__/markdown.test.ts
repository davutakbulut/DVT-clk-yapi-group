import { describe, expect, it } from 'vitest';
import { markdownToText, readingMinutes, renderMarkdown } from '../markdown';

describe('markdown › güvenli render', () => {
  it('başlık, paragraf, liste, vurgu ve bağlantı', () => {
    expect(renderMarkdown('# Başlık\n\nMetin **kalın** ve *italik*.\n\n- a\n- b\n\n1. bir\n2. iki')).toBe(
      '<h2>Başlık</h2>\n<p>Metin <strong>kalın</strong> ve <em>italik</em>.</p>\n<ul><li>a</li><li>b</li></ul>\n<ol><li>bir</li><li>iki</li></ol>', // static-ok: test verisi
    );
    expect(renderMarkdown('[site](/tr/hizmetler) ve [dış](https://example.com)')).toBe('<p><a href="/tr/hizmetler">site</a> ve <a href="https://example.com" rel="noopener noreferrer" target="_blank">dış</a></p>'); // static-ok: test verisi
  });

  it('HTML ve javascript: bağlantıları etkisizleştirir (XSS)', () => {
    expect(renderMarkdown('<script>alert(1)</script> [x](javascript:alert(1))')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt; x</p>');
    expect(renderMarkdown('"quoted" & <b>')).toBe('<p>&quot;quoted&quot; &amp; &lt;b&gt;</p>');
  });

  it('özet ve okuma süresi', () => {
    expect(markdownToText('# Başlık\n\n**Kalın** metin [link](/x)', 20)).toBe('Başlık Kalın metin…'); // static-ok: test verisi
    expect(readingMinutes('kelime '.repeat(450))).toBe(2);
    expect(readingMinutes('')).toBe(1);
  });
});
