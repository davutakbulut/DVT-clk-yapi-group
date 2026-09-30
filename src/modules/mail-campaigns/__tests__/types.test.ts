import { describe, expect, it } from 'vitest';
import { estimateMinutes, findPlaceholders, formatManualList, parseAudience, parseManualList, progressPercent, templateContent, type CampaignTemplate } from '../domain/types';

describe('toplu e-posta alan yardımcıları (K-108)', () => {
  it('elle liste: dört biçim, tekrar ve bozuk satır ayrılır; büyük I ASCII küçülür (ı olmaz)', () => {
    const r = parseManualList(['INFO@Firma.com', 'Ayşe Yılmaz <ayse@firma.com>', 'ali@firma.com; Ali Veli', 'Veli Can\tveli@firma.com', 'info@firma.com', 'adres-degil', '', 'a@b'].join('\n'));
    expect(r.recipients).toEqual([{ email: 'info@firma.com' }, { email: 'ayse@firma.com', name: 'Ayşe Yılmaz' }, { email: 'ali@firma.com', name: 'Ali Veli' }, { email: 'veli@firma.com', name: 'Veli Can' }]);
    expect(r.duplicates).toBe(1);
    expect(r.invalid).toEqual(['adres-degil', 'a@b']);
    expect(formatManualList(r.recipients).split('\n')[1]).toBe('Ayşe Yılmaz <ayse@firma.com>');
  });

  it('bozuk audience boş kitleye düşer; bilinmeyen segment atılır', () => {
    expect(parseAudience(null)).toEqual({ segments: [], manual: [], manual_attested: false });
    expect(parseAudience({ segments: ['leads'], city: 'İzmir', manual: [{ email: 'a@b.co' }], manual_attested: true })).toEqual({ segments: ['leads'], city: 'İzmir', manual: [{ email: 'a@b.co' }], manual_attested: true });
    expect(parseAudience({ segments: ['herkes'] }).segments).toEqual([]);
  });

  it('ilerleme ve kalan süre', () => {
    expect(progressPercent({ total: 0, pending: 0 })).toBe(0);
    expect(progressPercent({ total: 200, pending: 50 })).toBe(75);
    expect(estimateMinutes(0, 100, 10)).toBe(0);
    expect(estimateMinutes(3, 100, 10)).toBe(1); // sınırın içinde: tek koşu
    expect(estimateMinutes(250, 100, 10)).toBe(150); // saatlik sınır belirleyici
    expect(estimateMinutes(30, 5000, 1)).toBe(30); // koşu başına adet belirleyici
  });

  it('doldurulmamış şablon alanları bulunur; bağlantı biçimi alan sayılmaz; tekrar bir kez döner', () => {
    expect(findPlaceholders('Yeni ürünümüz: [ürün adı]', 'Sayın {{full_name}}, [ürün adı] için [tarih] … [katalog](https://site.test/x)')).toEqual(['[ürün adı]', '[tarih]']);
    expect(findPlaceholders('Düz metin', '- madde\n**kalın**')).toEqual([]);
  });

  it('şablon içeriği: seçilen dil; o dilde metin yoksa tüm alanlar Türkçe', () => {
    const t: CampaignTemplate = { id: 'x', name: 'Ş', category: 'announcement', description: '', sort_order: 0, is_active: true, subject: { tr: 'Konu', en: 'Subject' }, preheader: { tr: 'Ön', en: '' }, body: { tr: 'Metin', en: '' }, cta_label: { tr: 'İncele', en: 'View' }, cta_url: { tr: 'https://site.test/tr', en: 'https://site.test/en' } };
    expect(templateContent(t, 'tr')).toEqual({ subject: 'Konu', preheader: 'Ön', body: 'Metin', ctaLabel: 'İncele', ctaUrl: 'https://site.test/tr' });
    expect(templateContent(t, 'en')).toEqual({ subject: 'Konu', preheader: 'Ön', body: 'Metin', ctaLabel: 'İncele', ctaUrl: 'https://site.test/tr' });
    expect(templateContent({ ...t, body: { tr: 'Metin', en: 'Text' } }, 'en')).toMatchObject({ body: 'Text', ctaLabel: 'View', ctaUrl: 'https://site.test/en' });
  });
});
