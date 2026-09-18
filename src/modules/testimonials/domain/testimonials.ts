export interface TestimonialSummary {
  readonly average: number;
  readonly count: number;
}

/** Toplu rozet ("4.9 / 5.0 · 127 Değerlendirme") yalnız yayındaki yorumlardan; boşsa null → rozet ve bölüm hiç render edilmez. */
export function summarize(ratings: readonly number[]): TestimonialSummary | null {
  const valid = ratings.filter((r) => Number.isFinite(r) && r >= 1 && r <= 5);
  if (valid.length === 0) return null;
  const average = Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
  return { average, count: valid.length };
}

/**
 * Review + AggregateRating JSON-LD — **yalnız ait olduğu varlık üzerinde** (02-SEO): ana sayfa carousel'i şema yaymaz.
 * `itemReviewed` sayfadaki varlığın @id'sidir; ana sayfa genel puanı ürün sayfasına taşınmaz.
 */
export function reviewJsonLd(
  items: readonly { readonly authorName: string; readonly rating: number; readonly body: string; readonly reviewedOn: string | null }[],
  entity: { readonly id: string; readonly type: 'Service' | 'Product' | 'Project' },
): Record<string, unknown>[] {
  const summary = summarize(items.map((i) => i.rating));
  if (!summary) return [];
  const out: Record<string, unknown>[] = [
    { '@type': 'AggregateRating', itemReviewed: { '@id': entity.id }, ratingValue: summary.average, bestRating: 5, worstRating: 1, ratingCount: summary.count },
  ];
  for (const i of items.slice(0, 10)) {
    out.push({
      '@type': 'Review',
      itemReviewed: { '@id': entity.id },
      author: { '@type': 'Person', name: i.authorName },
      reviewRating: { '@type': 'Rating', ratingValue: i.rating, bestRating: 5, worstRating: 1 },
      reviewBody: i.body,
      ...(i.reviewedOn ? { datePublished: i.reviewedOn } : {}),
    });
  }
  return out;
}
