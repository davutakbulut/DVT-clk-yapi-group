/**
 * Harita gömme adresi (K-112). CSP `frame-src` yalnız Google Haritalar'a izin verir (next.config.ts) → başka kaynak kabul edilmez.
 * Panelde Google'ın "Harita yerleştir" çıktısı (<iframe src="…">) olduğu gibi yapıştırılabilir; `src` ayıklanır.
 */
const HOSTS = new Set(['www.google.com', 'maps.google.com', 'google.com']);

/** Yapıştırılan metinden (adres ya da <iframe …> parçası) geçerli gömme adresi; geçersizse null. */
export function extractMapEmbedUrl(input: string | null | undefined): string | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;
  const fromIframe = /src\s*=\s*["']([^"']+)["']/i.exec(raw)?.[1];
  const candidate = (fromIframe ?? raw).replace(/&amp;/g, '&');
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !HOSTS.has(url.hostname) || !url.pathname.startsWith('/maps')) return null;
  return url.toString();
}

/** Gösterilecek gömme adresi: panelde girilen (geçerliyse), yoksa adres metninden arama gömmesi; adres de yoksa null (harita çizilmez). */
export function mapEmbedSrc(embedUrl: string | null | undefined, address: string | null | undefined, locale: string): string | null {
  const explicit = extractMapEmbedUrl(embedUrl);
  if (explicit) {
    // Sorgu biçimli gömme (…/maps?q=…&output=embed) arayüz dilini sayfa diline uydurur; "pb" biçimli Google çıktısına dokunulmaz
    const url = new URL(explicit);
    if (url.pathname === '/maps' && url.searchParams.has('q')) url.searchParams.set('hl', locale);
    return url.toString();
  }
  const q = (address ?? '').trim();
  if (!q) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(q)}&hl=${encodeURIComponent(locale)}&z=16&output=embed`;
}

/** "Yol tarifi al" bağlantısı: panelde girilen harita bağlantısı, yoksa adresle Google Haritalar araması. */
export function mapLinkHref(mapUrl: string | null | undefined, address: string | null | undefined): string | null {
  if (mapUrl) return mapUrl;
  const q = (address ?? '').trim();
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}
