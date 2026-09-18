// Saf yardımcılar (server-only DEĞİL): birim testte ve panelde de kullanılır.

export const INDEXNOW_JOB_KEY = 'indexnow';
export const INDEXNOW_MAX_URLS = 10000;

/** Anahtar yalnız ortam değişkeninden (Vercel): 8–128 alfasayısal/tire. Yoksa özellik kapalı. */
export function readIndexNowKey(): string {
  const k = (process.env['INDEXNOW_KEY'] ?? '').trim();
  return /^[A-Za-z0-9-]{8,128}$/.test(k) ? k : '';
}

/** sitemap.xml → {loc, lastmod}[] (basit regex; kendi çıktımız, XML kütüphanesi gerekmez). */
export function parseSitemap(xml: string): { url: string; lastmod: string | null }[] {
  const out: { url: string; lastmod: string | null }[] = [];
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const block = m[1] ?? '';
    const loc = /<loc>([^<]+)<\/loc>/.exec(block)?.[1]?.trim();
    if (!loc) continue;
    const lastmod = /<lastmod>([^<]+)<\/lastmod>/.exec(block)?.[1]?.trim() ?? null;
    out.push({ url: loc, lastmod });
  }
  return out;
}

/** Son koşudan beri değişen (lastmod) URL'ler; ilk koşuda (since yok) tümü. lastmod'suz URL'ler yalnız ilk koşuda gider. */
export function selectChanged(entries: readonly { url: string; lastmod: string | null }[], since: string | null): string[] {
  if (!since) return entries.map((e) => e.url).slice(0, INDEXNOW_MAX_URLS);
  const t = Date.parse(since);
  return entries.filter((e) => e.lastmod && Date.parse(e.lastmod) > t).map((e) => e.url).slice(0, INDEXNOW_MAX_URLS);
}
