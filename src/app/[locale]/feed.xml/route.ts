import { getTranslations } from 'next-intl/server';
import { getSiteUrl } from '@/core/config/site';
import { getPathname } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { pickLocale } from '@/lib/localized';
import { getCachedPostList } from '@/modules/blog';
import { getPublicSettings } from '@/modules/site-settings';

export const revalidate = 1800;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** RSS 2.0 (02-SEO / Faz 30): dil başına yayındaki son 50 yazı; veritabanından, önbellekli. Yazı yoksa boş kanal (200). */
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) return new Response('not found', { status: 404 });
  const loc = locale as Locale;
  const [settings, posts, t] = await Promise.all([getPublicSettings(), getCachedPostList(loc), getTranslations({ locale: loc, namespace: 'Blog' })]);
  const origin = getSiteUrl().origin;
  const name = pickLocale(settings.siteName, loc, { fallback: 'tr' });
  const blogUrl = `${origin}${getPathname({ href: '/blog', locale: loc })}`;
  const items = (posts.ok ? posts.data : [])
    .filter((p) => p.publishedAt)
    .slice(0, 50)
    .map((p) => {
      const url = `${origin}${getPathname({ href: { pathname: '/blog/[slug]', params: { slug: p.slug } }, locale: loc })}`;
      return `<item><title>${esc(p.title)}</title><link>${esc(url)}</link><guid isPermaLink="true">${esc(url)}</guid><pubDate>${new Date(p.publishedAt!).toUTCString()}</pubDate>${p.excerpt ? `<description>${esc(p.excerpt)}</description>` : ''}${p.category ? `<category>${esc(p.category.name)}</category>` : ''}</item>`;
    })
    .join('');
  const lastBuild = posts.ok && posts.data[0]?.publishedAt ? new Date(posts.data[0].publishedAt).toUTCString() : new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(`${name} · ${t('title')}`)}</title><link>${esc(blogUrl)}</link><description>${esc(t('lead'))}</description><language>${loc}</language><lastBuildDate>${lastBuild}</lastBuildDate><atom:link href="${esc(`${origin}/${loc}/feed.xml`)}" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=1800, stale-while-revalidate=3600' } });
}
