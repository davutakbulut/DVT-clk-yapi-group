/** Canonical ve OG için; sondaki / olmadan. */
export function getSiteUrl(): URL {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
}

/**
 * Yayın (Faz 12) öncesi ve Vercel önizlemelerinde hiçbir şey indekslenmez; aksi hâlde önizleme
 * adresleri Google'a düşüp asıl siteyle rekabet eder. next.config.ts içindeki koşulla AYNI olmalı.
 */
export function isSiteIndexable(): boolean {
  // Vercel dışı barındırmada (cPanel/VPS) üretim ortamı SITE_ENV=production ile bildirilir
  return (process.env.VERCEL_ENV === 'production' || process.env.SITE_ENV === 'production') && process.env.SITE_INDEXABLE === 'true';
}
