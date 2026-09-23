import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { ModuleBoundary } from '@/core/errors';
import { absoluteUrl, breadcrumbList, JsonLd, organizationId } from '@/core/seo';
import { publicStorageUrl } from '@/core/storage';
import { buildAlternates } from '@/i18n/alternates';
import { getPathname, type AppHref } from '@/i18n/navigation';
import { RouteAlternates } from '@/i18n/RouteAlternates';
import { routing, type Locale } from '@/i18n/routing';
import { getCachedTestimonialsFor, reviewJsonLd, TestimonialsFor } from '@/modules/testimonials';
import { getCachedProductBySlug, getCachedProductList, getCachedProductSlugs, ProductDetail, resolveOldProductSlug, type ProductDetailData } from '@/modules/products';
import { moduleEnabled } from '@/modules/site-settings';

interface Props {
  readonly params: Promise<{ locale: string; slug: string }>;
}

export const dynamicParams = true;
export async function generateStaticParams() {
  const all = await Promise.all(routing.locales.map(async (locale) => (await getCachedProductSlugs(locale)).map((slug) => ({ locale, slug }))));
  return all.flat();
}

function hrefs(product: ProductDetailData): Readonly<Record<Locale, AppHref | null>> {
  const to = (slug: string | null): AppHref | null => (slug ? ({ pathname: '/products/[slug]', params: { slug } } as AppHref) : null);
  return { tr: to(product.alternates.tr), en: to(product.alternates.en) };
}

async function load(locale: string, slug: string): Promise<ProductDetailData | null> {
  const r = await getCachedProductBySlug(locale, slug);
  return r.ok ? r.data : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await load(locale, slug);
  if (!product) return {};
  const env = readSupabasePublicEnv();
  const og = product.seo.ogImage ?? product.cover;
  return {
    title: product.seo.title || product.name,
    description: product.seo.description || product.shortDescription || undefined,
    robots: product.seo.noindex ? { index: false, follow: true } : undefined,
    alternates: { ...buildAlternates(locale as Locale, hrefs(product)), ...(product.seo.canonicalUrl ? { canonical: product.seo.canonicalUrl } : {}) },
    openGraph: og && env.ok ? { images: [{ url: publicStorageUrl(env.data.url, og), width: og.width ?? undefined, height: og.height ?? undefined }] } : undefined,
  };
}

/** Ürün detayı: Product JSON-LD — fiyat yayınlanmadığı için Offer YAZILMAZ (02-SEO, K-27). */
export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);
  if (!(await moduleEnabled('products'))) notFound(); // K-43 kill switch
  const product = await load(locale, slug);
  if (!product) {
    const fresh = await resolveOldProductSlug(locale, slug);
    if (fresh) permanentRedirect(getPathname({ href: { pathname: '/products/[slug]', params: { slug: fresh } }, locale: locale as Locale }));
    notFound();
  }
  const [t, list, env, reviews] = await Promise.all([getTranslations('Products'), getCachedProductList(locale), readSupabasePublicEnv(), getCachedTestimonialsFor(locale, { productId: product.id })]);
  // Aynı kategorideki yayındaki ürünler: aile çubuğu (K-90) tümünü, "ilgili ürünler" ilk dördünü gösterir
  const families = (list.ok ? list.data : []).filter((p) => product.category && p.category?.id === product.category.id);
  const related = families.filter((p) => p.id !== product.id).slice(0, 4);
  const self: AppHref = { pathname: '/products/[slug]', params: { slug: product.slug } };
  const jsonLd = [
    {
      '@type': 'Product',
      '@id': `${absoluteUrl(self, locale as Locale)}#product`,
      name: product.name,
      description: product.seo.description || product.shortDescription || undefined,
      url: absoluteUrl(self, locale as Locale),
      inLanguage: locale,
      image: product.cover && env.ok ? publicStorageUrl(env.data.url, product.cover) : undefined,
      brand: { '@id': organizationId() },
      manufacturer: { '@id': organizationId() },
      category: product.category?.name,
      ...(product.variants.some((v) => v.stockCode) ? { sku: product.variants.find((v) => v.stockCode)?.stockCode } : {}),
    },
    breadcrumbList([{ name: t('home'), href: '/' }, { name: t('title'), href: '/products' }, ...(product.category ? [{ name: product.category.name, href: { pathname: '/products/category/[slug]', params: { slug: product.category.slug } } as AppHref }] : []), { name: product.name, href: self }], locale as Locale),
    // 02-SEO: Review/AggregateRating yalnız bu ürüne bağlı yorumlarla (Offer yine yok, K-27)
    ...reviewJsonLd(reviews, { id: `${absoluteUrl(self, locale as Locale)}#product`, type: 'Product' }),
  ];
  return (
    <RouteAlternates value={{ hrefs: hrefs(product), fallback: '/products' }}>
      <JsonLd data={jsonLd} />
      <ModuleBoundary module="products/detail">
        <ProductDetail
          product={product}
          locale={locale}
          related={related}
          families={families}
          extra={
            <ModuleBoundary module="testimonials/for-product">
              <TestimonialsFor items={reviews} headingId="product-reviews" />
            </ModuleBoundary>
          }
        />
      </ModuleBoundary>
    </RouteAlternates>
  );
}
