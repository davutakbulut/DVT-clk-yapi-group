import { getTranslations } from 'next-intl/server';
import { mediaAlt, mediaSrcSet, publicStorageUrl } from '@/core/storage';
import { Link } from '@/i18n/navigation';
import { renderMarkdown } from '@/lib/markdown';
import { Container } from '@/ui/Container';
import { ConfiguratorGlyph, type GlyphKey } from '@/ui/ConfiguratorGlyph';
import { NumberedSteps, PageHero, WhyGrid } from '@/ui/PageSections';
import type { GuideCardData, GuideDetailData } from '../../data/configuratorPagesRepository';
import { CONFIGURATOR_HREF, type ConfiguratorKey } from '../../domain/types';
import { ConfiguratorBanner } from './ConfiguratorBanner';

const GLYPH: Readonly<Record<ConfiguratorKey, GlyphKey>> = { hall: 'hall', multi_storey: 'multiStorey', cladding: 'cladding', mezzanine: 'mezzanine', fence: 'fence', drywall: 'drywall' };

/** /konfigurator-rehberi: her konfigüratör için bir kart (başlık, özet, "Rehberi oku" + "Konfigüratörü aç"). */
export async function GuideList({ items, locale, supabaseUrl, heroTitle, heroLede }: { readonly items: readonly GuideCardData[]; readonly locale: string; readonly supabaseUrl: string | null; readonly heroTitle: string; readonly heroLede: string }) {
  const t = await getTranslations('ConfiguratorGuide');
  return (
    <Container as="div" className="pb-[var(--section-y)]">
      <PageHero eyebrow={t('kicker')} title={heroTitle} lede={heroLede} />
      {items.length === 0 ? <p className="pt-8 text-[var(--color-text-muted)]">{t('empty')}</p> : (
        <ul className="svc-grid pt-8">
          {items.map((g) => (
            <li key={g.id}>
              <article className="svc-card">
                <div className="tech-art cfg-art">
                  {g.cover && supabaseUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49)
                    <img src={publicStorageUrl(supabaseUrl, g.cover)} srcSet={mediaSrcSet(supabaseUrl, g.cover)} sizes="(min-width: 1024px) 33vw, 90vw" alt={mediaAlt(g.cover, locale)} loading="lazy" decoding="async" />
                  ) : <ConfiguratorGlyph type={GLYPH[g.key]} />}
                </div>
                <div className="svc-body">
                  <h2 className="text-[1.3rem]">{g.title}</h2>
                  {g.summary ? <p className="svc-desc">{g.summary}</p> : null}
                  <div className="svc-links">
                    <Link href={{ pathname: '/configurator-guide/[slug]', params: { slug: g.slug } }}>{t('read')} →</Link>
                    <Link className="sec" href={CONFIGURATOR_HREF[g.key]}>{t('open')}</Link>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

/** Rehber detayı: hero + kapak/şema · faydalar · gövde (Markdown) · adımlar · SSS · "Kendiniz inşa etmek ister misiniz?" bandı. */
export async function GuideDetail({ guide, locale, supabaseUrl }: { readonly guide: GuideDetailData; readonly locale: string; readonly supabaseUrl: string | null }) {
  const t = await getTranslations('ConfiguratorGuide');
  const href = CONFIGURATOR_HREF[guide.key];
  const html = guide.body ? renderMarkdown(guide.body) : '';
  return (
    <Container as="article" className="pb-[var(--section-y)]">
      <PageHero eyebrow={t('kicker')} title={guide.title} lede={guide.summary} compact>
        <div className="cfg-hero-row">
          <div className="tech-art cfg-hero-art">
            {guide.cover && supabaseUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49)
              <img src={publicStorageUrl(supabaseUrl, guide.cover)} srcSet={mediaSrcSet(supabaseUrl, guide.cover)} sizes="(min-width: 1024px) 60vw, 90vw" alt={mediaAlt(guide.cover, locale)} decoding="async" />
            ) : <ConfiguratorGlyph type={GLYPH[guide.key]} />}
          </div>
          <div className="cfg-hero-acts">
            <Link href={href} className="btn btn-primary">{guide.cta.button || t('open')} →</Link>
            <Link href="/configurator-guide" className="btn btn-ghost">{t('all')}</Link>
          </div>
        </div>
      </PageHero>
      <WhyGrid title={t('benefits')} items={guide.benefits.map((b) => ({ title: b.title, text: b.description }))} />
      {html ? <section className="page-block"><div className="prose-site max-w-[var(--prose-max)]" dangerouslySetInnerHTML={{ __html: html }} /></section> : null}
      <NumberedSteps id="adimlar" title={t('steps')} items={guide.steps.map((s) => ({ title: s.title, text: s.description }))} />
      {guide.faqs.length > 0 ? (
        <section className="page-block faq-list" id="sss" aria-labelledby="g-sss">
          <h2 id="g-sss" className="page-block-title">{t('faq')}</h2>
          <div>{guide.faqs.map((f) => <details key={f.question}><summary>{f.question}</summary><p>{f.answer}</p></details>)}</div>
        </section>
      ) : null}
      <div className="pt-[var(--space-12)]">
        <ConfiguratorBanner title={guide.cta.title} lead={guide.cta.lead} button={guide.cta.button || t('open')} href={href} glyph={GLYPH[guide.key]} secondary={{ label: t('quote'), href: '/get-quote' }} />
      </div>
    </Container>
  );
}
