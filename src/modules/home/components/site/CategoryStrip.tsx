import { getTranslations } from 'next-intl/server';
import { logger } from '@/core/observability/logger';
import { Link } from '@/i18n/navigation';
import { getCachedProductCategories } from '@/modules/products';

/** Hero altı ürün grubu şeridi (K-111): kök kategoriler yatay kaydırmalı çip; kategori yoksa hiç çizilmez. */
export async function CategoryStrip({ locale }: { readonly locale: string }) {
  const [cats, t] = await Promise.all([getCachedProductCategories(locale), getTranslations('Home')]);
  if (!cats.ok) {
    logger.warn(cats.error.message, { module: 'home', code: cats.error.code });
    return null;
  }
  const roots = cats.data.filter((c) => !c.parentId);
  if (roots.length === 0) return null;
  return (
    <nav className="home-catbar" aria-label={t('productsLabel')} data-on-dark="">
      <div className="home-catbar-row">
        <span className="label-mono text-[var(--color-accent-on-dark)]">{t('productsLabel')}</span>
        {roots.map((c) => (
          <Link key={c.id} href={{ pathname: '/products/category/[slug]', params: { slug: c.slug } }} className="home-catbar-chip">
            {c.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}
