import { describe, expect, it } from 'vitest';
import { mapGoogleReviews } from '../googleReviews';

describe('mapGoogleReviews', () => {
  it('Places API (New) yanıtını satırlara çevirir; bozuk/boş yorumlar düşer; dil kodu gövde anahtarı olur', () => {
    const out = mapGoogleReviews({
      rating: 4.7,
      userRatingCount: 23,
      reviews: [
        { name: 'places/P/reviews/a', rating: 5, text: { text: 'Harika iş.', languageCode: 'tr' }, authorAttribution: { displayName: 'Ali', photoUri: 'https://lh3.googleusercontent.com/a' }, publishTime: '2026-05-01T10:00:00Z' },
        { name: 'places/P/reviews/b', rating: 4, originalText: { text: 'Great work.', languageCode: 'en-US' }, text: { text: 'Harika çalışma.', languageCode: 'tr' }, authorAttribution: { displayName: ' ', photoUri: 'http://insecure' } },
        { name: 'places/P/reviews/c', rating: 5, text: { text: '   ' } },
        { name: '', rating: 5, text: { text: 'kimliksiz' } },
        { name: 'places/P/reviews/d', rating: 9, text: { text: 'puan dışı' } },
        { name: 'places/P/reviews/e', rating: 3, text: { text: 'Fena değil.', languageCode: 'de' } },
      ],
    });
    expect(out.rating).toBe(4.7);
    expect(out.userRatingCount).toBe(23);
    expect(out.reviews.map((r) => r.externalId)).toEqual(['places/P/reviews/a', 'places/P/reviews/b', 'places/P/reviews/e']);
    expect(out.reviews[0]).toMatchObject({ authorName: 'Ali', avatarUrl: 'https://lh3.googleusercontent.com/a', rating: 5, body: { tr: 'Harika iş.' }, originalLocale: 'tr', reviewedOn: '2026-05-01' });
    // Orijinal metin tercih edilir (çeviri değil), boş ad → "Google", http avatar reddedilir
    expect(out.reviews[1]).toMatchObject({ authorName: 'Google', avatarUrl: null, body: { en: 'Great work.' }, originalLocale: 'en', reviewedOn: null });
    // Desteklenmeyen dil: gövde TR anahtarına düşer, original_locale null
    expect(out.reviews[2]).toMatchObject({ body: { tr: 'Fena değil.' }, originalLocale: null });
  });

  it('boş/yanlış yanıt güvenli', () => {
    expect(mapGoogleReviews(null)).toEqual({ rating: null, userRatingCount: null, reviews: [] });
    expect(mapGoogleReviews({ reviews: 'x' }).reviews).toEqual([]);
  });
});
