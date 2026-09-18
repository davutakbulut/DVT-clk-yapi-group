import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { getFormatter, getTranslations } from 'next-intl/server';
import { getSiteUrl } from '@/core/config/site';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { mediaAlt, mediaSrcSet, publicStorageUrl } from '@/core/storage';
import { getPathname, Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { renderMarkdown } from '@/lib/markdown';
import { AddToBasket } from '@/modules/quote-basket';
import { WhatsAppInquiry } from '@/modules/whatsapp';
import { Button } from '@/ui/Button';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { getCachedProductCategories, getCachedProductList, type ProductCardData, type ProductDetailData } from '../../data/productsRepository';

export function ProductCard({ product, locale, supabaseUrl, headingLevel: Heading = 'h3' }: { readonly product: ProductCardData; readonly locale: string; readonly supabaseUrl: string | null; readonly headingLevel?: 'h2' | 'h3' }) {
  const t = useTranslations('Products');
  const featuredLabel = t('featured');
  const sizesLabel = t('sizes', { count: product.variantCount });
  const cover = product.cover && supabaseUrl ? product.cover : null;
  return (
    <article className="card">
      <Link href={{ pathname: '/products/[slug]', params: { slug: product.slug } }} className="card-link">
        <div className="card-media">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49)
            <img src={publicStorageUrl(supabaseUrl!, cover)} srcSet={mediaSrcSet(supabaseUrl!, cover)} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 90vw" alt={mediaAlt(cover, locale)} width={cover.width ?? undefined} height={cover.height ?? undefined} loading="lazy" decoding="async" />
          ) : (
            <div className="card-media-icon" aria-hidden="true" />
          )}
        </div>
        <div className="card-body">
          {product.category ? <p className="label-mono text-[var(--color-accent-text)]">{product.category.name}</p> : null}
          <Heading className="card-title">{product.name}</Heading>
          {product.shortDescription ? <p className="card-excerpt">{product.shortDescription}</p> : null}
          {product.variantCount > 0 || product.isFeatured ? (
            <p className="card-meta">
              {product.isFeatured ? <span className="card-chip card-chip-accent">{featuredLabel}</span> : null}
              {product.variantCount > 0 ? <span className="card-chip">{sizesLabel}</span> : null}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}

/** /urunler ve /urunler/kategori/[slug]: kategori çipleri (alt kategoriler dahil) + kart ızgarası. */
export async function ProductsList({ locale, categorySlug }: { readonly locale: string; readonly categorySlug?: string }) {
  const [list, cats, env, t] = await Promise.all([getCachedProductList(locale), getCachedProductCategories(locale), readSupabasePublicEnv(), getTranslations('Products')]);
  if (!list.ok) logger.warn(list.error.message, { module: 'products', code: list.error.code });
  const categories = cats.ok ? cats.data : [];
  const current = categorySlug ? categories.find((c) => c.slug === categorySlug) : undefined;
  const inScope = new Set<string>();
  if (current) {
    inScope.add(current.id);
    for (const c of categories) if (c.parentId === current.id) inScope.add(c.id);
  }
  const items = (list.ok ? list.data : []).filter((p) => !current || (p.category && inScope.has(p.category.id)));
  const roots = categories.filter((c) => !c.parentId);
  const url = env.ok ? env.data.url : null;
  return (
    <Container as="section" className="grid gap-10 py-[var(--section-y)]">
      <SectionHeading as="h1" kicker={t('kicker')} title={current ? current.name : t('title')} lead={current ? current.description || undefined : t('lead')} />
      {roots.length > 0 ? (
        <nav aria-label={t('category')} className="chips">
          <Link href="/products" className="chip" aria-current={!categorySlug ? 'page' : undefined}>
            {t('allCategories')}
          </Link>
          {roots.map((c) => (
            <Link key={c.id} href={{ pathname: '/products/category/[slug]', params: { slug: c.slug } }} className="chip" aria-current={c.slug === categorySlug || (current?.parentId === c.id ? 'page' : undefined) ? 'page' : undefined}>
              {c.name}
            </Link>
          ))}
        </nav>
      ) : null}
      {current && categories.some((c) => c.parentId === current.id) ? (
        <nav aria-label={current.name} className="chips">
          {categories
            .filter((c) => c.parentId === current.id)
            .map((c) => (
              <Link key={c.id} href={{ pathname: '/products/category/[slug]', params: { slug: c.slug } }} className="chip">
                {c.name}
              </Link>
            ))}
        </nav>
      ) : null}
      {items.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">{t('empty')}</p>
      ) : (
        <ul className="card-grid">
          {items.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} locale={locale} supabaseUrl={url} headingLevel="h2" />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

export async function ProductDetail({ product, locale, related, extra }: { readonly product: ProductDetailData; readonly locale: string; readonly related: readonly ProductCardData[]; readonly extra?: ReactNode }) {
  const [env, t, format] = await Promise.all([readSupabasePublicEnv(), getTranslations('Products'), getFormatter()]);
  const url = env.ok ? env.data.url : null;
  const cover = product.cover && url ? product.cover : null;
  const groups = new Map<string, typeof product.specs>();
  for (const s of product.specs) groups.set(s.group, [...(groups.get(s.group) ?? []), s]);
  const num = (v: number | null) => (v === null ? '—' : format.number(v));
  // WhatsApp hazır mesajında tam sayfa adresi (müşteri temsilcisi hangi üründen yazıldığını görür)
  const pageUrl = `${getSiteUrl().origin}${getPathname({ href: { pathname: '/products/[slug]', params: { slug: product.slug } }, locale: locale as Locale })}`;
  const hasDim = (k: 'widthMm' | 'heightMm' | 'thicknessMm' | 'lengthMm' | 'kgPerM' | 'stockCode') => product.variants.some((v) => v[k] !== null && v[k] !== '');

  return (
    <article className="grid">
      <header className="page-head" data-on-dark="">
        <Container className="grid gap-6 py-[var(--section-y)]">
          <nav aria-label={t('breadcrumb')} className="label-mono flex flex-wrap items-center gap-2 text-[var(--color-text-inverse-subtle)]">
            <Link href="/" className="hover:text-[var(--color-accent-on-dark)]">
              {t('home')}
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/products" className="hover:text-[var(--color-accent-on-dark)]">
              {t('title')}
            </Link>
            {product.category ? (
              <>
                <span aria-hidden="true">/</span>
                <Link href={{ pathname: '/products/category/[slug]', params: { slug: product.category.slug } }} className="hover:text-[var(--color-accent-on-dark)]">
                  {product.category.name}
                </Link>
              </>
            ) : null}
          </nav>
          <div className="grid gap-4">
            <h1 className="max-w-[20ch] text-[var(--color-text-inverse)]">{product.name}</h1>
            {product.shortDescription ? <p className="max-w-[58ch] text-[length:var(--fs-body-lg)] text-[var(--color-text-inverse-muted)]">{product.shortDescription}</p> : null}
            <p className="text-[length:var(--fs-sm)] text-[var(--color-text-inverse-subtle)]">{t('noPrice')}</p>
          </div>
        </Container>
      </header>

      <Container className="grid gap-12 py-[var(--section-y)] lg:grid-cols-[6fr_6fr]">
        <div className="grid content-start gap-6">
          {cover ? (
            <figure className="about-figure">
              {/* eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49) */}
              <img src={publicStorageUrl(url!, cover)} srcSet={mediaSrcSet(url!, cover)} sizes="(min-width: 1024px) 50vw, 100vw" alt={mediaAlt(cover, locale)} width={cover.width ?? undefined} height={cover.height ?? undefined} fetchPriority="high" decoding="async" />
            </figure>
          ) : null}
          {product.images.length > 0 && url ? (
            <ul className="gallery-grid">
              {product.images.map((image) => (
                <li key={image.path}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49) */}
                  <img src={publicStorageUrl(url, image)} srcSet={mediaSrcSet(url, image)} sizes="(min-width: 1024px) 16vw, 33vw" alt={mediaAlt(image, locale)} width={image.width ?? undefined} height={image.height ?? undefined} loading="lazy" decoding="async" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="grid content-start gap-10">
          {product.description ? <div className="prose-site" dangerouslySetInnerHTML={{ __html: renderMarkdown(product.description) }} /> : null}
          {product.usageAreas ? (
            <section className="grid gap-3">
              <h2 className="text-[length:var(--fs-h3)]">{t('usage')}</h2>
              <div className="prose-site" dangerouslySetInnerHTML={{ __html: renderMarkdown(product.usageAreas) }} />
            </section>
          ) : null}
          {product.service ? (
            <p className="text-[length:var(--fs-sm)]">
              {t('service')}:{' '}
              <Link href={{ pathname: '/services/[slug]', params: { slug: product.service.slug } }} className="font-semibold text-[var(--color-accent-text)] underline underline-offset-4">
                {product.service.title}
              </Link>
            </p>
          ) : null}
          <AddToBasket productId={product.id} slug={product.slug} name={product.name} variants={product.variants.map((v) => ({ id: v.id, label: v.sizeLabel, stockCode: v.stockCode }))} unit={t('unitDefault')} />
          {/* Stok / sipariş sorusu doğrudan WhatsApp'tan: ürün adı + sayfa adresi hazır mesajda. WhatsApp kapalıysa render edilmez. */}
          <WhatsAppInquiry message={t('waProduct', { name: product.name, url: pageUrl })} label={t('waAsk')} />
          <div className="grid justify-items-start gap-3 border-t border-[var(--color-border)] pt-6">
            <h2 className="text-[length:var(--fs-h3)]">{t('quoteTitle')}</h2>
            <p className="text-[var(--color-text-muted)]">{t('quoteLead')}</p>
            <Button href={{ pathname: '/get-quote', query: { product: product.slug } } as never}>{t('quoteButton')}</Button>
          </div>
        </div>
      </Container>

      {groups.size > 0 ? (
        <Container as="section" aria-labelledby="product-specs" className="grid gap-6 pb-[var(--section-y)]">
          <h2 id="product-specs" className="text-[length:var(--fs-h3)]">
            {t('specs')}
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {[...groups.entries()].map(([group, rows]) => (
              <table key={group || '_'} className="data-table">
                {group ? <caption>{group}</caption> : null}
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <th scope="row">{r.name}</th>
                      <td>
                        {r.value}
                        {r.unit ? ` ${r.unit}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        </Container>
      ) : null}

      {product.variants.length > 0 ? (
        <Container as="section" aria-labelledby="product-variants" className="grid gap-6 pb-[var(--section-y)]">
          <h2 id="product-variants" className="text-[length:var(--fs-h3)]">
            {t('variants')}
          </h2>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">{t('size')}</th>
                  {hasDim('widthMm') ? <th scope="col">{t('width')} (mm)</th> : null}
                  {hasDim('heightMm') ? <th scope="col">{t('height')} (mm)</th> : null}
                  {hasDim('thicknessMm') ? <th scope="col">{t('thickness')} (mm)</th> : null}
                  {hasDim('lengthMm') ? <th scope="col">{t('length')} (mm)</th> : null}
                  {hasDim('kgPerM') ? <th scope="col">{t('kgPerM')}</th> : null}
                  {hasDim('stockCode') ? <th scope="col">{t('stockCode')}</th> : null}
                  <th scope="col">
                    <span className="sr-only">{t('waAskSize')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((v) => (
                  <tr key={v.id}>
                    <th scope="row">{v.sizeLabel}</th>
                    {hasDim('widthMm') ? <td>{num(v.widthMm)}</td> : null}
                    {hasDim('heightMm') ? <td>{num(v.heightMm)}</td> : null}
                    {hasDim('thicknessMm') ? <td>{num(v.thicknessMm)}</td> : null}
                    {hasDim('lengthMm') ? <td>{num(v.lengthMm)}</td> : null}
                    {hasDim('kgPerM') ? <td>{num(v.kgPerM)}</td> : null}
                    {hasDim('stockCode') ? <td className="font-mono text-[length:var(--fs-sm)]">{v.stockCode ?? '—'}</td> : null}
                    <td className="text-right">
                      <WhatsAppInquiry variant="link" message={t('waVariant', { name: product.name, size: v.sizeLabel, url: pageUrl })} label={t('waAskSize')} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      ) : null}

      {product.documents.length > 0 && url ? (
        <Container as="section" aria-labelledby="product-docs" className="grid gap-4 pb-[var(--section-y)]">
          <h2 id="product-docs" className="text-[length:var(--fs-h3)]">
            {t('documents')}
          </h2>
          <ul className="grid gap-2">
            {product.documents.map((d) => (
              <li key={d.path}>
                <a href={publicStorageUrl(url, { bucket: d.bucket, path: d.path })} rel="noopener noreferrer" target="_blank" className="font-semibold text-[var(--color-accent-text)] underline underline-offset-4">
                  {d.title}
                </a>{' '}
                <span className="text-[length:var(--fs-sm)] text-[var(--color-text-subtle)]">
                  · {t(`docTypes.${d.docType as 'datasheet'}`)}
                  {d.sizeBytes ? ` · ${format.number(Math.round(d.sizeBytes / 1024))} KB` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Container>
      ) : null}

      {product.projects.length > 0 ? (
        <Container as="section" aria-labelledby="product-projects" className="grid gap-3 pb-[var(--section-y)]">
          <h2 id="product-projects" className="text-[length:var(--fs-h3)]">
            {t('projects')}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {product.projects.map((p) => (
              <li key={p.slug}>
                <Link href={{ pathname: '/projects/[slug]', params: { slug: p.slug } }} className="chip">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      ) : null}

      {product.faqs.length > 0 ? (
        <Container as="section" aria-labelledby="product-faq" className="grid max-w-[var(--prose-max)] gap-4 pb-[var(--section-y)]">
          <h2 id="product-faq" className="text-[length:var(--fs-h3)]">
            {t('faq')}
          </h2>
          <div className="faq-list">
            {product.faqs.map((f) => (
              <details key={f.question} className="faq-item">
                <summary>{f.question}</summary>
                <div className="prose-site" dangerouslySetInnerHTML={{ __html: renderMarkdown(f.answer) }} />
              </details>
            ))}
          </div>
        </Container>
      ) : null}

      {related.length > 0 ? (
        <Container as="section" aria-labelledby="product-related" className="grid gap-8 pb-[var(--section-y)]">
          <h2 id="product-related" className="text-[length:var(--fs-h3)]">
            {t('related')}
          </h2>
          <ul className="card-grid">
            {related.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} locale={locale} supabaseUrl={url} />
              </li>
            ))}
          </ul>
        </Container>
      ) : null}
      {extra}
    </article>
  );
}
