import { getTranslations } from 'next-intl/server';
import { logger } from '@/core/observability/logger';
import { Link } from '@/i18n/navigation';
import { pickLocale } from '@/lib/localized';
import { getCachedProductCategories, getCachedProductList, ProductCategoryIcon } from '@/modules/products';
import { getPublicSettings } from '@/modules/site-settings';
import { Button } from '@/ui/Button';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';

/** Kartta gösterilen ürün adı sayısı; fazlası "+N" (yalıtımda 37 ürün kartı uzatıyordu). */
const MAX_NAMES = 8;

/**
 * 01 · Malzeme satışı (K-111): kök kategori kartları (ikon, ad, açıklama, o kategorideki ürün adları) + "listede yok mu?"
 * teklif kartı + üç "neden" sütunu. Kategori/ürün veritabanından; metinler site_settings home.page.materials.
 */
export async function MaterialsSection({ locale, index = '01' }: { readonly locale: string; readonly index?: string }) {
  const [cats, products, settings, t] = await Promise.all([getCachedProductCategories(locale), getCachedProductList(locale), getPublicSettings(), getTranslations('Home')]);
  if (!cats.ok) {
    logger.warn(cats.error.message, { module: 'home', code: cats.error.code });
    return null;
  }
  const copy = settings.homePage.materials;
  const L = (v: Readonly<Partial<Record<string, string>>> | null | undefined) => pickLocale(v, locale, { fallback: 'tr' });
  const roots = cats.data.filter((c) => !c.parentId);
  if (roots.length === 0) return null;
  const parentOf = new Map(cats.data.map((c) => [c.id, c.parentId ?? c.id]));
  const names = new Map<string, string[]>();
  for (const p of products.ok ? products.data : []) {
    if (!p.category) continue;
    const root = parentOf.get(p.category.id) ?? p.category.id;
    names.set(root, [...(names.get(root) ?? []), p.name]);
  }
  const why = copy.why.map((w) => ({ title: L(w.title), text: L(w.text) })).filter((w) => w.title);
  const cta = { title: L(copy.cta.title), text: L(copy.cta.text), button: L(copy.cta.button) };
  const title = L(copy.title) || t('materialsTitle');

  return (
    <section id="malzeme" className="border-t border-[var(--color-border)]" aria-labelledby="materials-title">
      <Container className="grid gap-10 py-[var(--section-y)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading index={index} kicker={t('materialsKicker')} title={<span id="materials-title">{title.split('\n').map((l, i) => (i === 0 ? l : <span key={i}><br />{l}</span>))}</span>} lead={L(copy.lede) || undefined} />
          <Button href="/products" variant="ghost">{t('allProducts')}</Button>
        </div>
        <ul className="home-cats">
          {roots.map((c) => {
            const list = names.get(c.id) ?? [];
            const rest = list.length - MAX_NAMES; // kartta gösterilmeyen ürün adedi (sayaç, içerik değil)
            const more = rest <= 0 ? '' : ` +${rest}`;
            return (
              <li key={c.id}>
                <Link href={{ pathname: '/products/category/[slug]', params: { slug: c.slug } }} className="home-cat">
                  <span className="home-cat-ico"><ProductCategoryIcon name={c.iconKey} /></span>
                  <h3>{c.name}</h3>
                  {c.description ? <p>{c.description}</p> : null}
                  {list.length > 0 ? <span className="home-cat-items"><b>{list.slice(0, MAX_NAMES).join(' · ')}</b>{more}</span> : null}
                </Link>
              </li>
            );
          })}
          {cta.title ? (
            <li>
              <Link href="/get-quote" className="home-cat home-cat-cta">
                <span className="home-cat-ico" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.5" focusable="false"><circle cx="13" cy="13" r="10" /><path d="M13 8v10M8 13h10" /></svg>
                </span>
                <h3>{cta.title}</h3>
                {cta.text ? <p>{cta.text}</p> : null}
                {cta.button ? <span className="home-cat-items"><b>{cta.button} →</b></span> : null}
              </Link>
            </li>
          ) : null}
        </ul>
        {why.length > 0 ? (
          <ul className="home-why">
            {why.map((w) => (
              <li key={w.title}><strong>{w.title}</strong>{w.text ? <p>{w.text}</p> : null}</li>
            ))}
          </ul>
        ) : null}
      </Container>
    </section>
  );
}
