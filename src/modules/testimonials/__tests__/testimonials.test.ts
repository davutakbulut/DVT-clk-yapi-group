import { describe, expect, it } from 'vitest';
import { realRatings, reviewJsonLd, summarize } from '../domain/testimonials';

describe('testimonials domain', () => {
  it('özet: ortalama 1 ondalık, geçersiz puanlar düşer, boşsa null', () => {
    expect(summarize([5, 4, 5])).toEqual({ average: 4.7, count: 3 });
    expect(summarize([5, 0, 9])).toEqual({ average: 5, count: 1 });
    expect(summarize([])).toBeNull();
  });

  it('JSON-LD yalnız varlık üzerinde: AggregateRating + en çok 10 Review; boşsa hiç', () => {
    const items = Array.from({ length: 12 }, (_, i) => ({ authorName: `A${i}`, rating: 4, body: 'iyi', reviewedOn: i === 0 ? '2026-01-02' : null }));
    const ld = reviewJsonLd(items, { id: 'https://x/#service', type: 'Service' });
    expect(ld.length).toBe(11);
    expect(ld[0]).toMatchObject({ '@type': 'AggregateRating', itemReviewed: { '@id': 'https://x/#service' }, ratingValue: 4, ratingCount: 12 });
    expect(ld[1]).toMatchObject({ '@type': 'Review', datePublished: '2026-01-02' });
    expect(reviewJsonLd([], { id: 'x', type: 'Product' })).toEqual([]);
  });
});

// K-78: örnek kayıtlar gerçek yorum değildir → ortalamaya ve yapılandırılmış veriye girmez
describe('örnek yorumlar', () => {
  const real = { authorName: 'A', rating: 4, body: 'x', reviewedOn: null, isSample: false };
  const sample = { authorName: 'Örnek Müşteri', rating: 5, body: 'örnek', reviewedOn: null, isSample: true };
  it('realRatings örnekleri dışlar', () => {
    expect(realRatings([real, sample])).toEqual([4]);
    expect(summarize(realRatings([sample]))).toBeNull();
  });
  it('reviewJsonLd: yalnız örnek varsa hiç şema yok; karışıkta örnek sayılmaz', () => {
    expect(reviewJsonLd([sample], { id: 'x#service', type: 'Service' })).toEqual([]);
    const out = reviewJsonLd([real, sample], { id: 'x#service', type: 'Service' });
    expect(out[0]).toMatchObject({ ratingCount: 1, ratingValue: 4 });
    expect(JSON.stringify(out)).not.toContain('Örnek');
  });
});
