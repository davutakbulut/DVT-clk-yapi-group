import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { mediaAlt, mediaSrcSet, publicStorageUrl } from '@/core/storage';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { renderMarkdown } from '@/lib/markdown';
import { Button } from '@/ui/Button';
import { Container } from '@/ui/Container';
import type { ServiceDetailData } from '../../data/servicesRepository';
import { ServiceIcon } from './ServiceIcon';

interface Props {
  readonly service: ServiceDetailData;
  readonly locale: string;
  /** CTA bandından önce ek bölüm (ör. bu hizmete bağlı çözümler — route katmanı verir, modül sınırı korunur). */
  readonly extra?: ReactNode;
}

/**
 * Hizmet detayı (01-PUBLIC-PAGES › iç bağlantı akışı): başlık bandı → gövde → süreç (gerçek sıra, numaralı) → galeri →
 * bu hizmetle yapılan projeler (Faz 8 verisi; yoksa yok) → SSS → teklif CTA (route gelince). Boş bölüm render edilmez.
 */
export async function ServiceDetail({ service, locale, extra }: Props) {
  const [env, t] = await Promise.all([readSupabasePublicEnv(), getTranslations('Services')]);
  const url = env.ok ? env.data.url : null;
  const cover = service.cover && url ? service.cover : null;
  const quoteRoute = '/get-quote' in routing.pathnames;

  return (
    <article className="grid">
      <header className="page-head" data-on-dark="">
        <Container className="grid gap-6 py-[var(--section-y)]">
          <nav aria-label={t('breadcrumb')} className="label-mono flex flex-wrap items-center gap-2 text-[var(--color-text-inverse-subtle)]">
            <Link href="/" className="hover:text-[var(--color-accent-on-dark)]">
              {t('home')}
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/services" className="hover:text-[var(--color-accent-on-dark)]">
              {t('title')}
            </Link>
          </nav>
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="grid gap-4">
              <h1 className="max-w-[20ch] text-[var(--color-text-inverse)]">{service.title}</h1>
              {service.excerpt ? <p className="max-w-[58ch] text-[length:var(--fs-body-lg)] text-[var(--color-text-inverse-muted)]">{service.excerpt}</p> : null}
            </div>
            <ServiceIcon name={service.icon} size={56} className="hidden text-[var(--color-accent-on-dark)] lg:block" />
          </div>
        </Container>
        {cover ? (
          <div className="page-head-cover">
            {/* eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49) */}
            <img src={publicStorageUrl(url!, cover)} srcSet={mediaSrcSet(url!, cover)} sizes="100vw" alt={mediaAlt(cover, locale)} width={cover.width ?? undefined} height={cover.height ?? undefined} fetchPriority="high" decoding="async" />
          </div>
        ) : null}
      </header>

      <Container className="grid gap-16 py-[var(--section-y)] lg:grid-cols-[7fr_5fr]">
        <div className="grid content-start gap-12">
          {service.body ? <div className="prose-site" dangerouslySetInnerHTML={{ __html: renderMarkdown(service.body) }} /> : null}
          {service.faqs.length > 0 ? (
            <section aria-labelledby="service-faq" className="grid gap-4">
              <h2 id="service-faq" className="text-[length:var(--fs-h3)]">
                {t('faq')}
              </h2>
              <div className="faq-list">
                {service.faqs.map((faq) => (
                  <details key={faq.question} className="faq-item">
                    <summary>{faq.question}</summary>
                    <div className="prose-site" dangerouslySetInnerHTML={{ __html: renderMarkdown(faq.answer) }} />
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </div>
        {service.processSteps.length > 0 ? (
          <aside aria-labelledby="service-process" className="steps lg:sticky lg:top-[calc(var(--header-h)+var(--space-6))] lg:self-start">
            <h2 id="service-process" className="steps-title">
              {t('process')}
            </h2>
            <ol className="steps-list">
              {service.processSteps.map((step, i) => (
                <li key={`${i}-${step.title}`} className="step">
                  <span className="step-index" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="step-title">{step.title}</h3>
                    {step.description ? <p className="step-desc">{step.description}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        ) : null}
      </Container>

      {service.images.length > 0 && url ? (
        <Container as="section" aria-label={t('gallery')} className="pb-[var(--section-y)]">
          <ul className="gallery-grid">
            {service.images.map((image) => (
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

      {service.projects.length > 0 ? (
        <Container as="section" aria-labelledby="service-projects" className="grid gap-8 pb-[var(--section-y)]">
          <h2 id="service-projects" className="text-[length:var(--fs-h3)]">
            {t('relatedProjects')}
          </h2>
          <ul className="card-grid">
            {service.projects.map((project) => (
              <li key={project.slug} className="card">
                <Link href={{ pathname: '/projects/[slug]' as never, params: { slug: project.slug } } as never} className="card-link">
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
