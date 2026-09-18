/**
 * Google Places API (New) yanıtı → testimonials satırları. Saf eşleme; ağ yok (testlenebilir).
 * Alan maskesi: reviews,rating,userRatingCount. API en çok 5 yorum döndürür; senkron "salt-okunur" (02-ADMIN-PANEL).
 */
export interface GoogleReviewRow {
  readonly externalId: string;
  readonly authorName: string;
  readonly avatarUrl: string | null;
  readonly rating: number;
  readonly body: Record<string, string>;
  readonly originalLocale: 'tr' | 'en' | null;
  readonly reviewedOn: string | null;
}

export interface GooglePlaceSummary {
  readonly rating: number | null;
  readonly userRatingCount: number | null;
  readonly reviews: readonly GoogleReviewRow[];
}

interface RawReview {
  name?: unknown;
  rating?: unknown;
  text?: { text?: unknown; languageCode?: unknown } | null;
  originalText?: { text?: unknown; languageCode?: unknown } | null;
  authorAttribution?: { displayName?: unknown; photoUri?: unknown } | null;
  publishTime?: unknown;
}

function locale(code: unknown): 'tr' | 'en' | null {
  if (typeof code !== 'string') return null;
  const l = code.slice(0, 2).toLocaleLowerCase('en');
  return l === 'tr' || l === 'en' ? l : null;
}

export function mapGoogleReviews(json: unknown): GooglePlaceSummary {
  const d = (typeof json === 'object' && json !== null ? json : {}) as { rating?: unknown; userRatingCount?: unknown; reviews?: unknown };
  const reviews = Array.isArray(d.reviews) ? (d.reviews as RawReview[]) : [];
  const rows: GoogleReviewRow[] = [];
  for (const r of reviews) {
    const externalId = typeof r.name === 'string' ? r.name : '';
    const rating = Number(r.rating);
    const text = typeof r.originalText?.text === 'string' ? r.originalText.text : typeof r.text?.text === 'string' ? r.text.text : '';
    const lang = locale(r.originalText?.languageCode ?? r.text?.languageCode);
    if (!externalId || !Number.isInteger(rating) || rating < 1 || rating > 5 || !text.trim()) continue;
    const author = typeof r.authorAttribution?.displayName === 'string' && r.authorAttribution.displayName.trim() ? r.authorAttribution.displayName.trim() : 'Google';
    const photo = typeof r.authorAttribution?.photoUri === 'string' && /^https:\/\//.test(r.authorAttribution.photoUri) ? r.authorAttribution.photoUri : null;
    const published = typeof r.publishTime === 'string' && /^\d{4}-\d{2}-\d{2}/.test(r.publishTime) ? r.publishTime.slice(0, 10) : null;
    rows.push({ externalId, authorName: author.slice(0, 120), avatarUrl: photo, rating, body: { [lang ?? 'tr']: text.trim().slice(0, 4000) }, originalLocale: lang, reviewedOn: published });
  }
  return { rating: Number.isFinite(Number(d.rating)) ? Number(d.rating) : null, userRatingCount: Number.isInteger(Number(d.userRatingCount)) ? Number(d.userRatingCount) : null, reviews: rows };
}
