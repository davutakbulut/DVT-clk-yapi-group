/** Site içi arama (K-102): sonuç türleri ve bağlantı çözümü. */
export const SEARCH_KINDS = ['product', 'post', 'service', 'solution', 'project', 'page', 'faq'] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];
export type SearchField = 'title' | 'excerpt' | 'body' | 'variants';

export interface SearchHit {
  readonly kind: SearchKind;
  readonly slug: string;
  readonly title: string;
  readonly field: SearchField;
  readonly snippet: string;
  readonly rank: number;
}

export const SEARCH_MIN = 2;
export const SEARCH_MAX = 60;

/** Sorguyu temizle: boşlukları sıkıştır, uzunluk sınırı; kısa/boş → null (istek atılmaz). */
export function normalizeQuery(raw: string | null | undefined): string | null {
  const q = (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, SEARCH_MAX);
  return q.length >= SEARCH_MIN ? q : null;
}

/** Sonuç → tipli sayfa yolu (next-intl pathnames). Yasal sayfalar page_key ile sabit rotalara gider. */
export type SearchHref =
  | { readonly pathname: '/products/[slug]' | '/blog/[slug]' | '/services/[slug]' | '/solutions/[slug]' | '/projects/[slug]'; readonly params: { readonly slug: string } }
  | { readonly pathname: '/faq' | '/privacy-policy' | '/cookie-policy' | '/data-protection' | '/terms-of-use' };
const PAGE_ROUTES: Readonly<Record<string, SearchHref['pathname']>> = { 'privacy-policy': '/privacy-policy', privacy_policy: '/privacy-policy', 'cookie-policy': '/cookie-policy', cookie_policy: '/cookie-policy', 'data-protection': '/data-protection', data_protection: '/data-protection', kvkk: '/data-protection', 'terms-of-use': '/terms-of-use', terms_of_use: '/terms-of-use', terms: '/terms-of-use' };
export function hrefFor(hit: Pick<SearchHit, 'kind' | 'slug'>): SearchHref | null {
  switch (hit.kind) {
    case 'product': return { pathname: '/products/[slug]', params: { slug: hit.slug } };
    case 'post': return { pathname: '/blog/[slug]', params: { slug: hit.slug } };
    case 'service': return { pathname: '/services/[slug]', params: { slug: hit.slug } };
    case 'solution': return { pathname: '/solutions/[slug]', params: { slug: hit.slug } };
    case 'project': return { pathname: '/projects/[slug]', params: { slug: hit.slug } };
    case 'faq': return { pathname: '/faq' };
    case 'page': { const p = PAGE_ROUTES[hit.slug]; return p && p !== '/faq' ? { pathname: p as Exclude<SearchHref['pathname'], '/faq'> } as SearchHref : null; }
    default: return null;
  }
}
/** Parçada eşleşen bölümü <mark> için ayır (büyük/küçük ve Türkçe harf duyarsız). */
export function splitHighlight(text: string, q: string): readonly { readonly text: string; readonly hit: boolean }[] {
  const TR = 'ÇĞİÖŞÜçğıöşüÂÎÛâîû'; // static-ok: karakter eşleme tablosu (search_norm ile aynı), metin değil
  const norm = (s: string) => s.replace(/[ÇĞİÖŞÜçğıöşüÂÎÛâîû]/g, (c) => 'CGIOSUcgiosuAIUaiu'[TR.indexOf(c)] ?? c).toLocaleLowerCase('en-US'); // static-ok: eşleme
  const n = norm(text);
  const nq = norm(q);
  if (!nq) return [{ text, hit: false }];
  const out: { text: string; hit: boolean }[] = [];
  let i = 0;
  for (;;) {
    const j = n.indexOf(nq, i);
    if (j < 0) break;
    if (j > i) out.push({ text: text.slice(i, j), hit: false });
    out.push({ text: text.slice(j, j + nq.length), hit: true });
    i = j + nq.length;
  }
  if (i < text.length) out.push({ text: text.slice(i), hit: false });
  return out;
}
