import { getTranslations } from 'next-intl/server';
import { getSiteUrl } from '@/core/config/site';
import { getPathname } from '@/i18n/navigation';
import { pickLocale } from '@/lib/localized';
import { getCachedPostList } from '@/modules/blog';
import { getCachedProjectList } from '@/modules/projects';
import { getCachedProductList } from '@/modules/products';
import { getCachedServiceList } from '@/modules/services';
import { getCachedSolutionList } from '@/modules/solutions';
import { getPublicSettings } from '@/modules/site-settings';

export const revalidate = 3600;

/** /llms.txt (02-SEO › AI görünürlüğü): site özeti + ana sayfalar + hizmetler + son yazılar; veritabanından, iki dilde. */
export async function GET() {
  const [settings, servicesTr, servicesEn, postsTr, solutionsTr, productsTr, projectsTr, lt, le, at, ae] = await Promise.all([getPublicSettings(), getCachedServiceList('tr'), getCachedServiceList('en'), getCachedPostList('tr'), getCachedSolutionList('tr'), getCachedProductList('tr'), getCachedProjectList('tr'), getTranslations({ locale: 'tr', namespace: 'Legal' }), getTranslations({ locale: 'en', namespace: 'Legal' }), getTranslations({ locale: 'tr', namespace: 'Admin' }), getTranslations({ locale: 'en', namespace: 'Admin' })]);
  const origin = getSiteUrl().origin;
  const name = pickLocale(settings.siteName, 'tr', { fallback: 'tr' });
  const lines: string[] = [`# ${name}`, ''];
  const descTr = pickLocale(settings.seoDescription, 'tr');
  const descEn = pickLocale(settings.seoDescription, 'en');
  if (descTr) lines.push(`> ${descTr}`, '');
  if (descEn) lines.push(`> ${descEn}`, '');
  const link = (href: Parameters<typeof getPathname>[0]['href'], locale: 'tr' | 'en') => `${origin}${getPathname({ href, locale })}`;
  lines.push(`## ${lt('pages')} (TR)`, `- ${at('nav.home')}: ${link('/', 'tr')}`, `- ${at('nav.services')}: ${link('/services', 'tr')}`, `- ${at('nav.solutions')}: ${link('/solutions', 'tr')}`, `- ${at('nav.pricing')}: ${link('/pricing', 'tr')}`, `- ${at('nav.testimonials')}: ${link('/reviews', 'tr')}`, `- ${at('nav.projects')}: ${link('/projects', 'tr')}`, `- ${at('nav.blog')}: ${link('/blog', 'tr')}`, `- ${at('nav.faq')}: ${link('/faq', 'tr')}`, `- ${at('nav.leads')}: ${link('/contact', 'tr')}`, `- ${at('formSettings.title')}: ${link('/get-quote', 'tr')}`, '');
  lines.push(`## ${le('pages')} (EN)`, `- ${ae('nav.home')}: ${link('/', 'en')}`, `- ${ae('nav.services')}: ${link('/services', 'en')}`, `- ${ae('nav.solutions')}: ${link('/solutions', 'en')}`, `- ${ae('nav.pricing')}: ${link('/pricing', 'en')}`, `- ${ae('nav.testimonials')}: ${link('/reviews', 'en')}`, `- ${ae('nav.projects')}: ${link('/projects', 'en')}`, `- ${ae('nav.blog')}: ${link('/blog', 'en')}`, `- ${ae('nav.leads')}: ${link('/contact', 'en')}`, '');
  if (servicesTr.ok && servicesTr.data.length > 0) {
    lines.push(`## ${lt('services')}`);
    for (const s of servicesTr.data) lines.push(`- [${s.title}](${link({ pathname: '/services/[slug]', params: { slug: s.slug } }, 'tr')})${s.excerpt ? `: ${s.excerpt}` : ''}`);
    lines.push('');
  }
  if (servicesEn.ok && servicesEn.data.length > 0) {
    lines.push(`## ${le('services')}`);
    for (const s of servicesEn.data) lines.push(`- [${s.title}](${link({ pathname: '/services/[slug]', params: { slug: s.slug } }, 'en')})${s.excerpt ? `: ${s.excerpt}` : ''}`);
    lines.push('');
  }
  // Faz 30 · AI görünürlük: çözümler, ürünler, projeler de listelenir (yalnız yayındakiler; veritabanından)
  if (solutionsTr.ok && solutionsTr.data.length > 0) {
    lines.push(`## ${at('nav.solutions')}`);
    for (const s of solutionsTr.data) lines.push(`- [${s.title}](${link({ pathname: '/solutions/[slug]', params: { slug: s.slug } }, 'tr')})${s.summary ? `: ${s.summary}` : ''}`);
    lines.push('');
  }
  if (productsTr.ok && productsTr.data.length > 0) {
    lines.push(`## ${at('nav.products')}`);
    for (const p of productsTr.data.slice(0, 50)) lines.push(`- [${p.name}](${link({ pathname: '/products/[slug]', params: { slug: p.slug } }, 'tr')})`);
    lines.push('');
  }
  if (projectsTr.ok && projectsTr.data.length > 0) {
    lines.push(`## ${at('nav.projects')}`);
    for (const p of projectsTr.data.slice(0, 30)) lines.push(`- [${p.title}](${link({ pathname: '/projects/[slug]', params: { slug: p.slug } }, 'tr')})${p.excerpt ? `: ${p.excerpt}` : ''}`);
    lines.push('');
  }
  if (postsTr.ok && postsTr.data.length > 0) {
    lines.push(`## ${lt('blog')}`);
    for (const p of postsTr.data.slice(0, 20)) lines.push(`- [${p.title}](${link({ pathname: '/blog/[slug]', params: { slug: p.slug } }, 'tr')})`);
    lines.push('');
  }
  lines.push(`## ${le('sitemapTitle')}`, `- ${origin}/sitemap.xml`, `- ${origin}/tr/feed.xml`, `- ${origin}/en/feed.xml`);
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
