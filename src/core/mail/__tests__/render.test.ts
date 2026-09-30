import { describe, expect, it } from 'vitest';
import { interpolate, renderCampaignMail, renderMail } from '../render';

describe('mail render', () => {
  it('yer tutucuları doldurur, bilinmeyeni boş bırakır', () => {
    expect(interpolate('Sayın {{ full_name }}, {{ref_no}} {{yok}}!', { full_name: 'Ali', ref_no: 'TLP-1' })).toBe('Sayın Ali, TLP-1 !');
  });

  it('HTML kaçırılır; paragraflar ayrılır; düz metin korunur', () => {
    const r = renderMail({ subject: 'Konu {{ref_no}}', body: 'Merhaba {{name}},\n\nMesaj: {{message}}', variables: { ref_no: 'TLP-2', name: 'Ayşe', message: '<script>alert(1)</script>' }, siteName: 'CLK' });
    expect(r.subject).toBe('Konu TLP-2');
    expect(r.text).toContain('<script>');
    expect(r.html).not.toContain('<script>');
    expect(r.html).toContain('&lt;script&gt;');
    expect(r.html.match(/<p /g)?.length).toBe(2);
  });
});

describe('toplu e-posta render (K-108)', () => {
  const base = { siteName: 'CLK', siteUrl: 'https://site.test', footer: '{{site_name}} gönderdi.', unsubscribeLabel: 'Listeden çık', unsubscribeUrl: 'https://site.test/tr/abonelik-iptal?t=abc' };

  it('başlık, liste, kalın, bağlantı ve düğme üretir; alt bilgide listeden çık bağlantısı var', () => {
    const r = renderCampaignMail({ ...base, subject: 'Merhaba {{full_name}}', preheader: 'Kısa özet', body: '## Yenilikler\n\nSayın {{full_name}},\n**Önemli** duyuru: [katalog](https://site.test/tr/urunler?a=1&b=2)\n\n- Bir\n- İki', ctaLabel: 'İncele', ctaUrl: 'https://site.test/tr/urunler', variables: { full_name: 'Ayşe' } });
    expect(r.subject).toBe('Merhaba Ayşe');
    expect(r.html).toContain('<h2');
    expect(r.html).toContain('<strong>Önemli</strong>');
    expect(r.html).toContain('<a href="https://site.test/tr/urunler?a=1&amp;b=2"');
    expect(r.html.match(/<li>/g)?.length).toBe(2);
    expect(r.html).toContain('>İncele</a>');
    expect(r.html).toContain('Kısa özet');
    expect(r.html).toContain('CLK gönderdi.');
    expect(r.html).toContain('href="https://site.test/tr/abonelik-iptal?t=abc"');
    expect(r.text).toContain('katalog (https://site.test/tr/urunler?a=1&b=2)');
    expect(r.text).toContain('Listeden çık: https://site.test/tr/abonelik-iptal?t=abc');
    expect(r.text).not.toContain('**');
  });

  it('ham HTML ve javascript: bağlantısı çalışmaz; alıcı adındaki biçimlendirme bağlantıya dönüşmez', () => {
    const r = renderCampaignMail({ ...base, subject: 'K', body: '<img src=x onerror=alert(1)> [tık](javascript:alert(1))\n\nSayın {{full_name}}', variables: { full_name: '[kazan](https://kotu.test) <b>x</b>' } });
    expect(r.html).not.toContain('<img');
    expect(r.html).not.toContain('href="javascript');
    expect(r.html).not.toContain('href="https://kotu.test"');
    expect(r.html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });

  it('düğme yalnız etiket ve adres birlikte doluysa çıkar', () => {
    const r = renderCampaignMail({ ...base, subject: 'K', body: 'Metin', ctaLabel: 'İncele', ctaUrl: '', variables: {} });
    expect(r.html).not.toContain('>İncele</a>');
  });
});
