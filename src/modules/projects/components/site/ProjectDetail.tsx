import type { ReactNode } from 'react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { mediaAlt, mediaSrcSet, publicStorageUrl } from '@/core/storage';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { renderMarkdown } from '@/lib/markdown';
import { Button } from '@/ui/Button';
import { Container } from '@/ui/Container';
import type { ProjectCardData, ProjectDetailData } from '../../data/projectsRepository';
import { ProjectCard } from './ProjectCard';

interface Props {
  readonly project: ProjectDetailData;
  readonly locale: string;
  /** Aynı kategoriden (en çok 3) ve önceki/sonraki — liste sırasından. */
  readonly related: readonly ProjectCardData[];
  readonly prev: ProjectCardData | null;
  readonly next: ProjectCardData | null;
  /** CTA bandından önce ek bölüm (ör. bu projeye bağlı yorumlar — route katmanı verir). */
  readonly extra?: ReactNode;
}

/**
 * Proje detayı (01-PUBLIC-PAGES): başlık bandı + künye → kapak → gövde + galeri → kullanılan hizmetler → aynı kategoriden
 * → önceki/sonraki → teklif CTA. Künyede yalnız dolu alanlar; uydurma değer yok.
 */
export async function ProjectDetail({ project, locale, related, prev, next, extra }: Props) {
  const [env, t, format] = await Promise.all([readSupabasePublicEnv(), getTranslations('Projects'), getFormatter()]);
  const url = env.ok ? env.data.url : null;
  const cover = project.cover && url ? project.cover : null;
  const quoteRoute = '/get-quote' in routing.pathnames;
  const date = (iso: string | null) => (iso ? format.dateTime(new Date(iso), { year: 'numeric', month: 'long' }) : null);
  const facts: { readonly label: string; readonly value: string }[] = [
    { label: t('location'), value: project.location },
    { label: t('client'), value: project.clientName ?? '' },
    { label: t('area'), value: project.areaM2 ? `${format.number(project.areaM2)} ${t('m2')}` : '' },
    { label: t('tonnage'), value: project.tonnage ? `${format.number(project.tonnage)} ${t('ton')}` : '' },
    { label: t('started'), value: date(project.startedOn) ?? '' },
    { label: t('completed'), value: date(project.completedOn) ?? '' },
  ].filter((f) => f.value);

  return (
    <article className="grid">
      <header className="page-head" data-on-dark="">
        <Container className="grid gap-6 py-[var(--section-y)]">
          <nav aria-label={t('breadcrumb')} className="label-mono flex flex-wrap items-center gap-2 text-[var(--color-text-inverse-subtle)]">
            <Link href="/" className="hover:text-[var(--color-accent-on-dark)]">
              {t('home')}
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/projects" className="hover:text-[var(--color-accent-on-dark)]">
              {t('title')}
            </Link>
            {project.categories[0] ? (
              <>
                <span aria-hidden="true">/</span>
                <Link href={{ pathname: '/projects/category/[slug]', params: { slug: project.categories[0].slug } }} className="hover:text-[var(--color-accent-on-dark)]">
                  {project.categories[0].name}
                </Link>
              </>
            ) : null}
          </nav>
          <div className="grid gap-4">
            <h1 className="max-w-[20ch] text-[var(--color-text-inverse)]">{project.title}</h1>
            {project.excerpt ? <p className="max-w-[58ch] text-[length:var(--fs-body-lg)] text-[var(--color-text-inverse-muted)]">{project.excerpt}</p> : null}
          </div>
          {facts.length > 0 ? (
            <dl className="facts">
              {facts.map((f) => (
                <div key={f.label} className="fact">
                  <dt className="label-mono text-[var(--color-text-inverse-subtle)]">{f.label}</dt>
                  <dd className="text-[var(--color-text-inverse)]">{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </Container>
        {cover ? (
          <div className="page-head-cover">
            {/* eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49) */}
            <img src={publicStorageUrl(url!, cover)} srcSet={mediaSrcSet(url!, cover)} sizes="100vw" alt={mediaAlt(cover, locale)} width={cover.width ?? undefined} height={cover.height ?? undefined} fetchPriority="high" decoding="async" />
          </div>
        ) : null}
      </header>

      {project.body || project.services.length > 0 ? (
        <Container className="grid gap-12 py-[var(--section-y)] lg:grid-cols-[7fr_5fr]">
          {project.body ? <div className="prose-site" dangerouslySetInnerHTML={{ __html: renderMarkdown(project.body) }} /> : <div />}
          {project.services.length > 0 ? (
            <aside className="steps lg:self-start" aria-labelledby="project-services">
              <h2 id="project-services" className="steps-title">
                {t('services')}
              </h2>
              <ul className="grid gap-2">
                {project.services.map((s) => (
                  <li key={s.slug}>
                    <Link href={{ pathname: '/services/[slug]', params: { slug: s.slug } }} className="font-semibold text-[var(--color-accent-text)] underline-offset-4 hover:underline">
                      {s.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          ) : null}
        </Container>
      ) : null}

      {project.images.length > 0 && url ? (
        <Container as="section" aria-label={t('gallery')} className="pb-[var(--section-y)]">
          <ul className="gallery-grid">
            {project.images.map((image) => (
              <li key={image.path}>
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49) */}
                  <img src={publicStorageUrl(url, image)} srcSet={mediaSrcSet(url, image)} sizes="(min-width: 1024px) 33vw, 50vw" alt={mediaAlt(image, locale)} width={image.width ?? undefined} height={image.height ?? undefined} loading="lazy" decoding="async" />
                  {image.caption ? <figcaption className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{image.caption}</figcaption> : null}
                </figure>
              </li>
            ))}
          </ul>
        </Container>
      ) : null}

      {related.length > 0 ? (
        <Container as="section" aria-labelledby="project-related" className="grid gap-8 pb-[var(--section-y)]">
          <h2 id="project-related" className="text-[length:var(--fs-h3)]">
            {t('related')}
          </h2>
          <ul className="card-grid">
            {related.map((p) => (
              <li key={p.id}>
                <ProjectCard project={p} locale={locale} supabaseUrl={url} />
              </li>
            ))}
          </ul>
        </Container>
      ) : null}

      {prev || next ? (
        <Container as="nav" aria-label={`${t('prev')} / ${t('next')}`} className="flex flex-wrap justify-between gap-4 border-t border-[var(--color-border)] py-8">
          {prev ? (
            <Link href={{ pathname: '/projects/[slug]', params: { slug: prev.slug } }} className="grid gap-1">
              <span className="label-mono text-[var(--color-text-subtle)]">{t('prev')}</span>
              <span className="font-semibold">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={{ pathname: '/projects/[slug]', params: { slug: next.slug } }} className="grid gap-1 text-right">
              <span className="label-mono text-[var(--color-text-subtle)]">{t('next')}</span>
              <span className="font-semibold">{next.title}</span>
            </Link>
          ) : null}
        </Container>
      ) : null}

      {extra}

      {quoteRoute ? (
        <section className="cta-band" data-on-dark="">
          <Container className="grid justify-items-start gap-5 py-[var(--section-y)] lg:justify-items-center lg:text-center">
            <h2 className="max-w-[24ch] text-[var(--color-text-inverse)]">{t('ctaTitle')}</h2>
            <p className="max-w-[52ch] text-[var(--color-text-inverse-muted)]">{t('ctaLead')}</p>
            <Button href={'/get-quote' as never}>{t('ctaButton')}</Button>
          </Container>
        </section>
      ) : null}
    </article>
  );
}
