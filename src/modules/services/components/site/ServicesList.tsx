import { getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { mediaAlt, mediaSrcSet, publicStorageUrl } from '@/core/storage';
import { Link } from '@/i18n/navigation';
import { pickLocale } from '@/lib/localized';
import { EMPTY_SERVICES_PAGE, getPublicSettings, SERVICE_GROUP_KEYS } from '@/modules/site-settings';
import { Container } from '@/ui/Container';
import { CtaBand, NumberedSteps, PageHero, WhyGrid } from '@/ui/PageSections';
import { TechDrawing } from '@/ui/TechDrawing';
import { ConfiguratorBanner } from '@/modules/configurator-pages';
import { getCachedServiceList, type ServiceCardData } from '../../data/servicesRepository';

/**
 * /hizmetler (K-106): hero · atlama çubuğu · 3 grup (çelik: kart ızgarası, mühendislik: geniş kart, inşaat: kompakt satırlar) ·
 * neden çelik · süreç · araçlar · SSS · CTA. Metinler site_settings 'services.page'; hizmetler veritabanından. Boş bölüm render edilmez.
 */
export async function ServicesList({ locale }: { readonly locale: string }) {
  const [result, env, t, settings] = await Promise.all([getCachedServiceList(locale), readSupabasePublicEnv(), getTranslations('Services'), getPublicSettings()]);
  if (!result.ok) logger.warn(result.error.message, { module: 'services', code: result.error.code });
  const items = result.ok ? result.data : [];
  const copy = settings.servicesPage ?? EMPTY_SERVICES_PAGE; // eski önbellek nesnesinde alan yoksa (dağıtım geçişi) bölümler sessizce boş
  const L = (v: Readonly<Partial<Record<string, string>>>) => pickLocale(v, locale, { fallback: 'tr' });
  const url = env.ok ? env.data.url : null;
  const groups = SERVICE_GROUP_KEYS.map((key, i) => ({ key, i, items: items.filter((s) => s.group === key), copy: copy.groups.find((g) => g.key === key) })).filter((g) => g.items.length > 0);
  const steps = copy.steps.items.map((s) => ({ title: L(s.title), text: L(s.text) })).filter((s) => s.title);
  const why = copy.why.items.map((s) => ({ title: L(s.title), text: L(s.text) })).filter((s) => s.title);
  const tools = copy.tools.items.map((i) => ({ ...i, title: L(i.title), text: L(i.text), cta: L(i.cta) })).filter((i) => i.title);
  const faqs = copy.faq.items.map((f) => ({ q: L(f.q), a: L(f.a) })).filter((f) => f.q && f.a);
  const jump = [...groups.map((g) => ({ href: `#${g.key}`, label: `${String(g.i + 1).padStart(2, '0')} ${g.copy ? L(g.copy.title) : t('title')}` })), ...(steps.length ? [{ href: '#surec', label: t('process') }] : []), ...(faqs.length ? [{ href: '#sss', label: t('faqShort') }] : [])];

  const Art = ({ s, w = 2 }: { readonly s: ServiceCardData; readonly w?: number }) => (
    <div className="tech-art">
      {s.cover && url ? (
        // eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49)
        <img src={publicStorageUrl(url, s.cover)} srcSet={mediaSrcSet(url, s.cover)} sizes="(min-width: 1024px) 33vw, 90vw" alt={mediaAlt(s.cover, locale)} loading="lazy" decoding="async" />
      ) : (
        <TechDrawing name={s.drawing} strokeWidth={w} />
      )}
    </div>
  );
  const Links = ({ s }: { readonly s: ServiceCardData }) => (
    <div className="svc-links">
      <Link href={{ pathname: '/services/[slug]', params: { slug: s.slug } }}>{t('details')} →</Link>
      {s.projectCategorySlug ? <Link className="sec" href={{ pathname: '/projects/category/[slug]', params: { slug: s.projectCategorySlug } }}>{t('seeProjects')}</Link> : null}
    </div>
  );
  const Highlights = ({ s }: { readonly s: ServiceCardData }) => (s.highlights.length ? <ul className="inc">{s.highlights.map((h) => <li key={h}>{h}</li>)}</ul> : null);

  return (
    <Container as="div" className="pb-[var(--section-y)]">
      <PageHero eyebrow={t('kicker')} title={L(copy.hero.title) || t('title')} lede={L(copy.hero.lede) || t('lead')} />
      {jump.length > 1 ? (
        <nav className="jump-nav" aria-label={t('jump')}>
          {jump.map((j) => <a key={j.href} href={j.href}>{j.label}</a>)}
        </nav>
      ) : null}
      {items.length === 0 ? <p className="pt-10 text-[var(--color-text-muted)]">{t('empty')}</p> : null}
      {groups.map((g) => (
        <section key={g.key} className="page-block" id={g.key} aria-labelledby={`g-${g.key}`}>
          <div className="ghead">
            <h2 id={`g-${g.key}`} className="page-block-title"><span className="label-mono gnum text-[var(--color-accent-text)]">{String(g.i + 1).padStart(2, '0')}</span>{g.copy ? L(g.copy.title) : ''}</h2>
            {g.copy && L(g.copy.lede) ? <p>{L(g.copy.lede)}</p> : null}
          </div>
          {g.key === 'engineering' ? (
            g.items.map((s) => (
              <article key={s.id} className="wide-svc">
                <Art s={s} />
                <div className="svc-body"><h3>{s.title}</h3>{s.excerpt ? <p className="svc-desc">{s.excerpt}</p> : null}<Highlights s={s} /><Links s={s} /></div>
              </article>
            ))
          ) : g.key === 'construction' ? (
            <ul className="svc-rows">
              {g.items.map((s) => (
                <li key={s.id}>
                  <div className="tech-art"><TechDrawing name={s.drawing} strokeWidth={4} /></div>
                  <div><h3>{s.title}</h3>{s.excerpt ? <p>{s.excerpt}</p> : null}<Links s={s} /></div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="svc-grid">
              {g.items.map((s) => (
                <li key={s.id}>
                  <article className="svc-card">
                    <Art s={s} />
                    <div className="svc-body"><h3>{s.title}</h3>{s.excerpt ? <p className="svc-desc">{s.excerpt}</p> : null}<Highlights s={s} /><Links s={s} /></div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <WhyGrid title={L(copy.why.title)} lede={copy.why.lede ? L(copy.why.lede) : undefined} items={why} />
      <NumberedSteps id="surec" title={L(copy.steps.title)} items={steps} />
      {tools.length > 0 ? (
        <section className="page-block" aria-labelledby="tools-h">
          <div className="ghead"><h2 id="tools-h" className="page-block-title">{L(copy.tools.title)}</h2>{copy.tools.lede && L(copy.tools.lede) ? <p>{L(copy.tools.lede)}</p> : null}</div>
          <ul className="tools">
            {tools.map((i) => (
              <li key={i.href}><Link href={i.href as never}><strong>{i.title}</strong><span>{i.text}</span><em>{i.cta} →</em></Link></li>
            ))}
          </ul>
        </section>
      ) : null}
      {L(settings.configuratorBanner.title) ? (
        <div className="pt-[var(--space-12)]"><ConfiguratorBanner title={L(settings.configuratorBanner.title)} lead={L(settings.configuratorBanner.lead)} button={L(settings.configuratorBanner.button)} href="/configurator-guide" /></div>
      ) : null}
      {faqs.length > 0 ? (
        <section className="page-block faq-list" id="sss" aria-labelledby="sss-h">
          <h2 id="sss-h" className="page-block-title">{L(copy.faq.title) || t('faqShort')}</h2>
          <div>{faqs.map((f) => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
        </section>
      ) : null}
      <CtaBand title={L(copy.cta.title)} lede={L(copy.cta.lede)} primaryLabel={t('ctaButton')} phone={settings.contact.phone} phoneLabel={settings.contact.phone} />
    </Container>
  );
}
