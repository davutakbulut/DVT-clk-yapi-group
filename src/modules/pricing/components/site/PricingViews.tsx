import { getFormatter, getTranslations } from 'next-intl/server';
import { logger } from '@/core/observability/logger';
import { Link } from '@/i18n/navigation';
import { renderMarkdown } from '@/lib/markdown';
import { Container } from '@/ui/Container';
import { Crumbs } from '@/ui/Crumbs';
import { SectionHeading } from '@/ui/SectionHeading';
import { getCachedPriceGuideList, type PriceGuideDetailData } from '../../data/pricingRepository';
import { PriceCalculator } from './PriceCalculator';

/** /fiyatlar: yayındaki rehberler. Boşsa kısa not (fiyat verisi ürün sahibinden gelir — K-55). */
export async function PricingList({ locale }: { readonly locale: string }) {
  const [list, t, format] = await Promise.all([getCachedPriceGuideList(locale), getTranslations('Pricing'), getFormatter()]);
  if (!list.ok) logger.warn(list.error.message, { module: 'pricing', code: list.error.code });
  const items = list.ok ? list.data : [];
  return (
    <Container as="section" className="grid gap-10 py-[var(--section-y)]">
      <SectionHeading as="h1" kicker={t('kicker')} title={t('title')} lead={t('lead')} />
      {items.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">{t('empty')}</p>
      ) : (
        <ul className="card-grid">
          {items.map((g) => (
            <li key={g.id}>
              <article className="card">
                <Link href={{ pathname: '/pricing/[slug]', params: { slug: g.slug } }} className="card-link">
                  <div className="card-body">
                    <h2 className="card-title">{g.title}</h2>
                    {g.intro ? <p className="card-excerpt">{g.intro}</p> : null}
                    {g.pricesUpdatedAt ? <p className="label-mono text-[var(--color-text-subtle)]">{t('updatedAt', { date: format.dateTime(new Date(g.pricesUpdatedAt), { dateStyle: 'medium' }) })}</p> : null}
                  </div>
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

/**
 * Fiyat rehberi (01-PUBLIC-PAGES şablonu): H1 + son güncelleme + KDV notu → fiyat tablosu (sistem · açıklama · birim fiyat aralığı ·
 * ön ayar sütunları) → hızlı hesaplayıcı (istemci) → faktörler · formül · UYARI (zorunlu) → SSS. Fiyatsız satır "—" gösterir.
 */
export async function PriceGuideDetail({ guide, locale, whatsappHref }: { readonly guide: PriceGuideDetailData; readonly locale: string; readonly whatsappHref: string | null }) {
  const [t, format] = await Promise.all([getTranslations('Pricing'), getFormatter()]);
  const money = (v: number, currency: string) => format.number(v, { style: 'currency', currency, maximumFractionDigits: 0 });
  const unitLabel = t(`units.${guide.quantityUnit as 'ton'}`);
  const presets = guide.quantityPresets;
  void locale;

  return (
    <article className="grid">
      <header className="page-head" data-on-dark="">
        <Container className="grid gap-6 py-[var(--section-y)]">
          <Crumbs label={t('breadcrumb')} className="text-[var(--color-text-inverse-subtle)]">
            <Link href="/" className="hover:text-[var(--color-accent-on-dark)]">
              {t('home')}
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/pricing" className="hover:text-[var(--color-accent-on-dark)]">
              {t('title')}
            </Link>
          </Crumbs>
          <div className="grid gap-4">
            <h1 className="max-w-[22ch] text-[var(--color-text-inverse)]">{guide.title}</h1>
            {guide.intro ? <p className="max-w-[60ch] text-[length:var(--fs-body-lg)] text-[var(--color-text-inverse-muted)]">{guide.intro}</p> : null}
            <p className="label-mono text-[var(--color-text-inverse-subtle)]">
              {guide.pricesUpdatedAt ? t('updatedAt', { date: format.dateTime(new Date(guide.pricesUpdatedAt), { dateStyle: 'long' }) }) : t('noPricesYet')} · {guide.vatIncluded ? t('vatIncluded') : t('vatExcluded')}
            </p>
            {guide.service ? (
              <p className="text-[length:var(--fs-sm)] text-[var(--color-text-inverse-subtle)]">
                {t('service')}:{' '}
                <Link href={{ pathname: '/services/[slug]', params: { slug: guide.service.slug } }} className="text-[var(--color-accent-on-dark)] underline-offset-4 hover:underline">
                  {guide.service.title}
                </Link>
              </p>
            ) : null}
          </div>
        </Container>
      </header>

      <Container className="grid gap-12 py-[var(--section-y)]">
        <p role="note" className="border-l-4 border-[var(--color-accent)] bg-[var(--color-surface)] p-4 text-[length:var(--fs-sm)]">
          {guide.disclaimer}
        </p>

        {guide.rows.length > 0 ? (
          <section aria-labelledby="price-table" className="grid gap-6">
            <h2 id="price-table" className="text-[length:var(--fs-h3)]">
              {t('tableTitle')}
            </h2>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">{t('systemType')}</th>
                    <th scope="col">{t('description')}</th>
                    <th scope="col">{t('unitPrice', { unit: unitLabel })}</th>
                    {presets.map((p) => (
                      <th key={p} scope="col" className="tabular-nums">
                        {format.number(p)} {unitLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guide.rows.map((r) => (
                    <tr key={r.id}>
                      <th scope="row">{r.systemType}</th>
                      <td className="text-[var(--color-text-muted)]">{r.description || '—'}</td>
                      <td className="tabular-nums">{r.minPrice !== null && r.maxPrice !== null && r.currency ? `${money(r.minPrice, r.currency)} – ${money(r.maxPrice, r.currency)}` : '—'}</td>
                      {presets.map((p) => (
                        <td key={p} className="tabular-nums">
                          {r.minPrice !== null && r.maxPrice !== null && r.currency ? `${money(r.minPrice * p, r.currency)} – ${money(r.maxPrice * p, r.currency)}` : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <PriceCalculator rows={guide.rows.map((r) => ({ id: r.id, systemType: r.systemType, minPrice: r.minPrice, maxPrice: r.maxPrice, currency: r.currency }))} unit={unitLabel} presets={presets} whatsappHref={whatsappHref} />

        {guide.factors || guide.formula ? (
          <div className="grid gap-10 lg:grid-cols-2">
            {guide.factors ? (
              <section aria-labelledby="price-factors" className="grid gap-4">
                <h2 id="price-factors" className="text-[length:var(--fs-h3)]">
                  {t('factors')}
                </h2>
                <div className="prose-site" dangerouslySetInnerHTML={{ __html: renderMarkdown(guide.factors) }} />
              </section>
            ) : null}
            {guide.formula ? (
              <section aria-labelledby="price-formula" className="grid gap-4">
                <h2 id="price-formula" className="text-[length:var(--fs-h3)]">
                  {t('formula')}
                </h2>
                <div className="prose-site" dangerouslySetInnerHTML={{ __html: renderMarkdown(guide.formula) }} />
              </section>
            ) : null}
          </div>
        ) : null}

        {guide.faqs.length > 0 ? (
          <section aria-labelledby="price-faq" className="grid gap-4">
            <h2 id="price-faq" className="text-[length:var(--fs-h3)]">
              {t('faq')}
            </h2>
            <div className="faq-list">
              {guide.faqs.map((faq) => (
                <details key={faq.question} className="faq-item">
                  <summary>{faq.question}</summary>
                  <div className="prose-site" dangerouslySetInnerHTML={{ __html: renderMarkdown(faq.answer) }} />
                </details>
              ))}
            </div>
          </section>
        ) : null}
      </Container>
    </article>
  );
}
