import { describe, expect, it } from 'vitest';
import { analyzeSeo } from '../domain/seoAnalysis';

const good = {
  title: 'Çelik konstrüksiyon maliyeti 2026: ton fiyatı ve etkenler',
  slug: 'celik-konstruksiyon-maliyeti-2026',
  metaDescription: 'Çelik konstrüksiyon maliyeti neye göre değişir? Ton fiyatı, açıklık, kat sayısı ve kaplama seçimlerinin 2026 maliyetine etkisini adım adım anlatıyoruz.',
  body: `Çelik konstrüksiyon maliyeti üç ana kalemden oluşur. ${'Kısa bir cümle daha. '.repeat(150)}
# Neyi etkiler
Açıklık büyüdükçe profil ağırlığı artar. [Hizmetlerimize](/hizmetler) bakın ve [projelerimizi](/projeler) inceleyin. Kaynak: [TBDY 2018](https://www.resmigazete.gov.tr).
## Alt başlık
Metin. Çelik konstrüksiyon maliyeti burada tekrar geçer.
# SSS
Soru ve yanıt.`,
  focusKeyword: 'çelik konstrüksiyon maliyeti',
  hasCover: true,
  hasOgImage: true,
  hasAuthor: true,
  otherKeywords: ['kentsel dönüşüm süresi'],
  otherIntros: ['tamamen farklı bir yazının giriş paragrafı burada yer alıyor'],
  locale: 'tr' as const,
};

describe('analyzeSeo', () => {
  it('iyi bir yazı yeşil skor alır; 17 madde üretilir', () => {
    const r = analyzeSeo(good);
    expect(r.checks).toHaveLength(17);
    const by = Object.fromEntries(r.checks.map((c) => [c.key, c.light]));
    expect(by['titleLength']).toBe('green');
    expect(by['keywordInTitle']).toBe('green');
    expect(by['metaLength']).toBe('green');
    expect(by['keywordInSlug']).toBe('green');
    expect(by['keywordInIntro']).toBe('green');
    expect(by['headingHierarchy']).toBe('green');
    expect(by['internalLinks']).toBe('green');
    expect(by['externalLinks']).toBe('green');
    expect(by['faqBlock']).toBe('green');
    expect(by['keywordUnique']).toBe('green');
    expect(by['contentOverlap']).toBe('green');
    expect(r.light).toBe('green');
    expect(r.score).toBeGreaterThanOrEqual(80);
  });

  it('İ/ı: büyük İ ile yazılmış odak kelime tr küçültmesiyle eşleşir', () => {
    const r = analyzeSeo({ ...good, title: 'İSTANBUL ÇELİK: ' + good.title, focusKeyword: 'İSTANBUL ÇELİK' });
    expect(r.checks.find((c) => c.key === 'keywordInTitle')?.light).toBe('green');
  });

  it('başlık atlaması (h2→h4), yinelenen odak kelime ve yüksek örtüşme kırmızı', () => {
    const r = analyzeSeo({ ...good, body: '## A\n\n#### B\n\nmetin', otherKeywords: ['Çelik Konstrüksiyon Maliyeti'], otherIntros: [good.body] });
    const by = Object.fromEntries(r.checks.map((c) => [c.key, c.light]));
    expect(by['headingHierarchy']).toBe('red');
    expect(by['keywordUnique']).toBe('red');
    expect(by['contentLength']).toBe('red');
  });

  it('odak kelime yoksa ilgili maddeler gri ve skora girmez', () => {
    const r = analyzeSeo({ ...good, focusKeyword: '' });
    expect(r.checks.filter((c) => c.light === 'gray').map((c) => c.key)).toEqual(expect.arrayContaining(['keywordInTitle', 'keywordInSlug', 'keywordInIntro', 'keywordDensity', 'keywordUnique']));
  });
});
