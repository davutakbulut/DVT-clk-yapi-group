import { getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { mediaAlt, mediaSrcSet, publicStorageUrl } from '@/core/storage';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { renderMarkdown } from '@/lib/markdown';
import { Button } from '@/ui/Button';
import { Container } from '@/ui/Container';
import { Crumbs } from '@/ui/Crumbs';
import { SectionHeading } from '@/ui/SectionHeading';
import { getCachedSolutionList, type SolutionCardData, type SolutionDetailData } from '../../data/solutionsRepository';

export function SolutionCard({ solution, locale, supabaseUrl, headingLevel: Heading = 'h3' }: { readonly solution: SolutionCardData; readonly locale: string; readonly supabaseUrl: string | null; readonly headingLevel?: 'h2' | 'h3' }) {
  const cover = solution.cover && supabaseUrl ? solution.cover : null;
  return (
    <article className="card">
      <Link href={{ pathname: '/solutions/[slug]', params: { slug: solution.slug } }} className="card-link">
        <div className="card-media">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49)
            <img src={publicStorageUrl(supabaseUrl!, cover)} srcSet={mediaSrcSet(supabaseUrl!, cover)} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw" alt={mediaAlt(cover, locale)} width={cover.width ?? undefined} height={cover.height ?? undefined} loading="lazy" decoding="async" />
          ) : (
            <div className="card-media-icon" aria-hidden="true" />
          )}
        </div>
        <div className="card-body">
          <Heading className="card-title">{solution.title}</Heading>
          {solution.summary ? <p className="card-excerpt">{solution.summary}</p> : null}
        </div>
      </Link>
    </article>
  );
}

/** /cozumler: yayındaki çözüm sayfaları (K-26). Boşsa kısa not; hata sessiz. */
export async function SolutionsList({ locale }: { readonly locale: string }) {
  const [list, env, t] = await Promise.all([getCachedSolutionList(locale), readSupabasePublicEnv(), getTranslations('Solutions')]);
  if (!list.ok) logger.warn(list.error.message, { module: 'solutions', code: list.error.code });
  const items = list.ok ? list.data : [];
  const url = env.ok ? env.data.url : null;
  return (
    <Container as="section" className="grid gap-10 py-[var(--section-y)]">
      <SectionHeading as="h1" kicker={t('kicker')} title={t('title')} lead={t('lead')} />
      {items.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">{t('empty')}</p>
      ) : (
        <ul className="card-grid">
          {items.map((s) => (
            <li key={s.id}>
              <SolutionCard solution={s} locale={locale} supabaseUrl={url} headingLevel="h2" />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

/** Hizmet detayı vb. için: bir hizmete bağlı çözümler (kart ızgarası). Boşsa hiç render edilmez. */
export async function SolutionsForService({ serviceId, locale }: { readonly serviceId: string; readonly locale: string }) {
  const [list, env, t] = await Promise.all([getCachedSolutionList(locale), readSupabasePublicEnv(), getTranslations('Solutions')]);
  const items = list.ok ? list.data.filter((s) => s.serviceId === serviceId) : [];
  if (items.length === 0) return null;
  const url = env.ok ? env.data.url : null;
  return (
    <Container as="section" aria-labelledby="service-solutions" className="grid gap-8 pb-[var(--section-y)]">
      <h2 id="service-solutions" className="text-[length:var(--fs-h3)]">
        {t('forService')}
      </h2>
      <ul className="card-grid">
        {items.map((s) => (
          <li key={s.id}>
            <SolutionCard solution={s} locale={locale} supabaseUrl={url} />
          </li>
        ))}
      </ul>
    </Container>
  );
}

/**
 * Çözüm detayı — K-26'nın 8 bölümü sırayla: hero → sorun → karşılaştırma → avantajlar → teknik dayanak → örnek projeler → SSS → CTA.
 * Boş bölüm render edilmez; CTA metni veritabanından (boşsa bant yok).
 */
export async function SolutionDetail({ solution, locale }: { readonly solution: SolutionDetailData; readonly locale: string }) {
  const [env, t] = await Promise.all([readSupabasePublicEnv(), getTranslations('Solutions')]);
  const url = env.ok ? env.data.url : null;
  const cover = solution.cover && url ? solution.cover : null;
  const quoteRoute = '/get-quote' in routing.pathnames;
  const rows = solution.comparison.rows.filter((r) => r.criterion);

  return (
    <article className="grid">
      <header className="page-head" data-on-dark="">
        <Container className="grid gap-6 py-[var(--section-y)]">
          <Crumbs label={t('breadcrumb')} className="text-[var(--color-text-inverse-subtle)]">
            <Link href="/" className="hover:text-[var(--color-accent-on-dark)]">
              {t('home')}
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/solutions" className="hover:text-[var(--color-accent-on-dark)]">
              {t('title')}
            </Link>
          </Crumbs>
          <div className="grid gap-4">
            <h1 className="max-w-[22ch] text-[var(--color-text-inverse)]">{solution.title}</h1>
            {solution.summary ? <p className="max-w-[60ch] text-[length:var(--fs-body-lg)] text-[var(--color-text-inverse-muted)]">{solution.summary}</p> : null}
            {solution.service ? (
              <p className="text-[length:var(--fs-sm)] text-[var(--color-text-inverse-subtle)]">
                {t('service')}:{' '}
                <Link href={{ pathname: '/services/[slug]', params: { slug: solution.service.slug } }} className="text-[var(--color-accent-on-dark)] underline-offset-4 hover:underline">
                  {solution.service.title}
                </Link>
              </p>
            ) : null}
          </div>
        </Container>
        {cover ? (
          <div className="page-head-cover">
            {/* eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49) */}
            <img src={publicStorageUrl(url!, cover)} srcSet={mediaSrcSet(url!, cover)} sizes="100vw" alt={mediaAlt(cover, locale)} width={cover.width ?? undefined} height={cover.height ?? undefined} fetchPriority="high" decoding="async" />
          </div>
        ) : null}
      </header>

      {solution.problem ? (
        <Container as="section" aria-labelledby="solution-problem" className="grid gap-6 py-[var(--section-y)] lg:grid-cols-[4fr_8fr]">
          <h2 id="solution-problem" className="text-[length:var(--fs-h3)]">
            {t('problem')}
          </h2>
          <div className="prose-site" dangerouslySetInnerHTML={{ __html: renderMarkdown(solution.problem) }} />
        </Container>
      ) : null}

      {rows.length > 0 ? (
        <section aria-labelledby="solution-comparison" className="bg-[var(--color-surface)]">
          <Container className="grid gap-8 py-[var(--section-y)]">
            <h2 id="solution-comparison" className="text-[length:var(--fs-h3)]">
              {t('comparison')}
            </h2>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">{t('criterion')}</th>
                    <th scope="col">{t('steel')}</th>
                    <th scope="col">{solution.comparison.alternative || t('alternative')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.criterion}>
                      <th scope="row">{r.criterion}</th>
                      <td>{r.steel}</td>
                      <td className="text-[var(--color-text-muted)]">{r.alternative}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Container>
        </section>
      ) : null}

      {solution.advantages.length > 0 ? (
        <Container as="section" aria-labelledby="solution-advantages" className="grid gap-8 py-[var(--section-y)]">
          <h2 id="solution-advantages" className="text-[length:var(--fs-h3)]">
            {t('advantages')}
          </h2>
          <ol className="advantage-grid">
            {solution.advantages.map((a, i) => (
              <li key={`${i}-${a.title}`} className="advantage">
                <span className="advantage-index" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="advantage-title">{a.title}</h3>
                {a.description ? <p className="advantage-desc">{a.description}</p> : null}
              </li>
            ))}
          </ol>
        </Container>
      ) : null}

      {solution.technicalBasis ? (
        <section aria-labelledby="solution-technical" className="border-y border-[var(--color-border)]">
          <Container className="grid gap-6 py-[var(--section-y)] lg:grid-cols-[4fr_8fr]">
            <h2 id="solution-technical" className="text-[length:var(--fs-h3)]">
              {t('technicalBasis')}
            </h2>
            <div className="prose-site" dangerouslySetInnerHTML={{ __html: renderMarkdown(solution.technicalBasis) }} />
          </Container>
        </section>
      ) : null}

      {solution.projects.length > 0 ? (
        <Container as="section" aria-labelledby="solution-projects" className="grid gap-8 py-[var(--section-y)]">
          <h2 id="solution-projects" className="text-[length:var(--fs-h3)]">
            {t('projects')}
          </h2>
          <ul className="card-grid">
            {solution.projects.map((project) => (
              <li key={project.slug} className="card">
                <Link href={{ pathname: '/projects/[slug]', params: { slug: project.slug } }} className="card-link">
                  <div className="card-media">
                    {project.cover && url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49)
                      <img src={publicStorageUrl(url, project.cover)} srcSet={mediaSrcSet(url, project.cover)} sizes="(min-width: 1024px) 33vw, 90vw" alt={mediaAlt(project.cover, locale)} width={project.cover.width ?? undefined} height={project.cover.height ?? undefined} loading="lazy" decoding="async" />
                    ) : null}
                  </div>
                  <div className="card-body">
                    <h3 className="card-title">{project.title}</h3>
                    {project.location ? <p className="card-excerpt">{project.location}</p> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      ) : null}

      {solution.faqs.length > 0 ? (
        <Container as="section" aria-labelledby="solution-faq" className="grid gap-6 pb-[var(--section-y)] lg:grid-cols-[4fr_8fr]">
          <h2 id="solution-faq" className="text-[length:var(--fs-h3)]">
            {t('faq')}
          </h2>
          <div className="faq-list">
            {solution.faqs.map((faq) => (
              <details key={faq.question} className="faq-item">
                <summary>{faq.question}</summary>
                <div className="prose-site" dangerouslySetInnerHTML={{ __html: renderMarkdown(faq.answer) }} />
              </details>
            ))}
          </div>
        </Container>
      ) : null}

      {solution.cta.title && quoteRoute ? (
        <section className="cta-band" data-on-dark="">
          <Container className="grid justify-items-start gap-5 py-[var(--section-y)] lg:justify-items-center lg:text-center">
            <h2 className="max-w-[24ch] text-[var(--color-text-inverse)]">{solution.cta.title}</h2>
            {solution.cta.lead ? <p className="max-w-[52ch] text-[var(--color-text-inverse-muted)]">{solution.cta.lead}</p> : null}
            <Button href="/get-quote">{solution.cta.button || t('ctaButton')}</Button>
          </Container>
        </section>
      ) : null}
    </article>
  );
}
