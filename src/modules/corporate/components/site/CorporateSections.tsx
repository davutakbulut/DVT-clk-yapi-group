import { getFormatter, getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { mediaAlt, mediaSrcSet, publicStorageUrl } from '@/core/storage';
import { Link } from '@/i18n/navigation';
import { renderMarkdown } from '@/lib/markdown';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { getCachedCertificates, getCachedClients, getCachedFaqs, getCachedJobPostings, getCachedTeam } from '../../data/corporateRepository';

/** Hakkımızda sayfasının altındaki yönlendirme kartları: ekip · referanslar · belgeler · kariyer. */
export async function CorporateLinks() {
  const t = await getTranslations('Corporate');
  const items = [
    { href: '/team' as const, label: t('exploreTeam') },
    { href: '/references' as const, label: t('exploreReferences') },
    { href: '/certificates' as const, label: t('exploreCertificates') },
    { href: '/careers' as const, label: t('exploreCareers') },
  ];
  return (
    <Container as="nav" aria-label={t('aboutTitle')} className="pb-[var(--section-y)]">
      <ul className="card-grid">
        {items.map((i) => (
          <li key={i.href} className="card">
            <Link href={i.href} className="card-link">
              <div className="card-body">
                <p className="card-title">{i.label}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}

export async function TeamGrid({ locale }: { readonly locale: string }) {
  const [result, env, t] = await Promise.all([getCachedTeam(locale), readSupabasePublicEnv(), getTranslations('Corporate')]);
  if (!result.ok) logger.warn(result.error.message, { module: 'corporate', code: result.error.code });
  const items = result.ok ? result.data : [];
  const url = env.ok ? env.data.url : null;
  return (
    <Container as="section" className="grid gap-10 py-[var(--section-y)]">
      <SectionHeading as="h1" kicker={t('aboutTitle')} title={t('teamTitle')} lead={t('teamLead')} />
      {items.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">{t('teamEmpty')}</p>
      ) : (
        <ul className="card-grid">
          {items.map((m) => (
            <li key={m.id} className="card">
              <div className="card-media">
                {m.photo && url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49)
                  <img src={publicStorageUrl(url, m.photo)} srcSet={mediaSrcSet(url, m.photo)} sizes="(min-width: 1024px) 25vw, 50vw" alt={mediaAlt(m.photo, locale) || m.name} width={m.photo.width ?? undefined} height={m.photo.height ?? undefined} loading="lazy" decoding="async" />
                ) : (
                  <div className="card-media-icon" aria-hidden="true" />
                )}
              </div>
              <div className="card-body">
                <h2 className="card-title">{m.name}</h2>
                {m.position ? <p className="label-mono text-[var(--color-accent-text)]">{m.position}</p> : null}
                {m.bio ? <p className="card-excerpt">{m.bio}</p> : null}
                {m.linkedinUrl ? (
                  <a href={m.linkedinUrl} rel="noopener noreferrer" target="_blank" className="text-[length:var(--fs-sm)] text-[var(--color-accent-text)] underline underline-offset-4">
                    LinkedIn
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

export async function ClientLogos({ locale }: { readonly locale: string }) {
  const [result, env, t] = await Promise.all([getCachedClients(locale), readSupabasePublicEnv(), getTranslations('Corporate')]);
  if (!result.ok) logger.warn(result.error.message, { module: 'corporate', code: result.error.code });
  const items = result.ok ? result.data : [];
  const url = env.ok ? env.data.url : null;
  return (
    <Container as="section" className="grid gap-10 py-[var(--section-y)]">
      <SectionHeading as="h1" kicker={t('aboutTitle')} title={t('referencesTitle')} lead={t('referencesLead')} />
      {items.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">{t('referencesEmpty')}</p>
      ) : (
        <ul className="logo-grid">
          {items.map((c) => {
            const inner = (
              <>
                {c.logo && url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Storage WebP (K-49)
                  <img src={publicStorageUrl(url, c.logo)} srcSet={mediaSrcSet(url, c.logo)} sizes="200px" alt={mediaAlt(c.logo, locale) || c.name} width={c.logo.width ?? undefined} height={c.logo.height ?? undefined} loading="lazy" decoding="async" className="logo-img" />
                ) : (
                  <span className="font-[family-name:var(--font-heading)] font-bold">{c.name}</span>
                )}
                {c.sector ? <span className="text-[length:var(--fs-xs)] text-[var(--color-text-subtle)]">{c.sector}</span> : null}
              </>
            );
            return (
              <li key={c.id} className="logo-cell">
                {c.websiteUrl ? (
                  <a href={c.websiteUrl} rel="noopener noreferrer" target="_blank" aria-label={c.name} className="grid justify-items-center gap-2">
                    {inner}
                  </a>
                ) : (
                  <div className="grid justify-items-center gap-2">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}

export async function CertificatesList({ locale }: { readonly locale: string }) {
  const [result, env, t, format] = await Promise.all([getCachedCertificates(locale), readSupabasePublicEnv(), getTranslations('Corporate'), getFormatter()]);
  if (!result.ok) logger.warn(result.error.message, { module: 'corporate', code: result.error.code });
  const items = result.ok ? result.data : [];
  const url = env.ok ? env.data.url : null;
  const date = (d: string | null) => (d ? format.dateTime(new Date(d), { year: 'numeric', month: 'long' }) : null);
  return (
    <Container as="section" className="grid gap-10 py-[var(--section-y)]">
      <SectionHeading as="h1" kicker={t('aboutTitle')} title={t('certificatesTitle')} lead={t('certificatesLead')} />
      {items.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">{t('certificatesEmpty')}</p>
      ) : (
        <ul className="card-grid">
          {items.map((c) => (
            <li key={c.id} className="card">
              {c.image && url ? (
                <div className="card-media">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Storage WebP (K-49) */}
                  <img src={publicStorageUrl(url, c.image)} srcSet={mediaSrcSet(url, c.image)} sizes="(min-width: 1024px) 33vw, 90vw" alt={mediaAlt(c.image, locale) || c.title} width={c.image.width ?? undefined} height={c.image.height ?? undefined} loading="lazy" decoding="async" />
                </div>
              ) : null}
              <div className="card-body">
                <h2 className="card-title">{c.title}</h2>
                <dl className="grid gap-1 text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">
                  {c.issuer ? (
                    <div>
                      <dt className="inline">{t('issuer')}: </dt>
                      <dd className="inline">{c.issuer}</dd>
                    </div>
                  ) : null}
                  {c.certificateNo ? (
                    <div>
                      <dt className="inline">{t('certificateNo')}: </dt>
                      <dd className="inline font-mono">{c.certificateNo}</dd>
                    </div>
                  ) : null}
                  {c.issuedOn ? (
                    <div>
                      <dt className="inline">{t('issuedOn')}: </dt>
                      <dd className="inline">{date(c.issuedOn)}</dd>
                    </div>
                  ) : null}
                  {c.validUntil ? (
                    <div>
                      <dt className="inline">{t('validUntil')}: </dt>
                      <dd className="inline">{date(c.validUntil)}</dd>
                    </div>
                  ) : null}
                </dl>
                {c.description ? <p className="card-excerpt">{c.description}</p> : null}
                {c.document && url ? (
                  <a href={publicStorageUrl(url, c.document)} rel="noopener noreferrer" target="_blank" className="text-[length:var(--fs-sm)] font-semibold text-[var(--color-accent-text)] underline underline-offset-4">
                    {t('download')}
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

export async function JobList({ locale }: { readonly locale: string }) {
  const [result, t, format] = await Promise.all([getCachedJobPostings(locale), getTranslations('Corporate'), getFormatter()]);
  if (!result.ok) logger.warn(result.error.message, { module: 'corporate', code: result.error.code });
  const items = result.ok ? result.data : [];
  return (
    <Container as="section" className="grid gap-10 py-[var(--section-y)]">
      <SectionHeading as="h1" kicker={t('aboutTitle')} title={t('careersTitle')} lead={t('careersLead')} />
      {items.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">{t('careersEmpty')}</p>
      ) : (
        <ul className="grid gap-px border border-[var(--color-border)] bg-[var(--color-border)]">
          {items.map((j) => (
            <li key={j.id} className="bg-[var(--color-surface)]">
              <Link href={{ pathname: '/careers/[slug]', params: { slug: j.slug } }} className="grid gap-2 p-6 hover:bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)] sm:grid-cols-[1fr_auto] sm:items-center">
                <span className="grid gap-1">
                  <span className="font-[family-name:var(--font-heading)] text-xl font-bold">{j.title}</span>
                  <span className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{[j.department, j.location, t(`types.${j.employmentType as 'full_time'}`)].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="label-mono text-[var(--color-text-subtle)]">{j.isOpen ? (j.applicationDeadline ? `${t('deadline')}: ${format.dateTime(new Date(j.applicationDeadline), { day: 'numeric', month: 'long', year: 'numeric' })}` : '') : t('closed')}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

export async function FaqList({ locale, entityType = null, entityId = null, asPage = false }: { readonly locale: string; readonly entityType?: string | null; readonly entityId?: string | null; readonly asPage?: boolean }) {
  const [result, t] = await Promise.all([getCachedFaqs(locale, entityType, entityId), getTranslations('Corporate')]);
  if (!result.ok) logger.warn(result.error.message, { module: 'corporate', code: result.error.code });
  const items = result.ok ? result.data : [];
  if (!asPage && items.length === 0) return null;
  const list = (
    <div className="faq-list">
      {items.map((f) => (
        <details key={f.id} className="faq-item">
          <summary>{f.question}</summary>
          <div className="prose-site" dangerouslySetInnerHTML={{ __html: renderMarkdown(f.answer) }} />
        </details>
      ))}
    </div>
  );
  if (!asPage) return list;
  return (
    <Container as="section" className="grid max-w-[var(--prose-max)] gap-10 py-[var(--section-y)]">
      <SectionHeading as="h1" kicker={t('aboutTitle')} title={t('faqTitle')} lead={t('faqLead')} />
      {items.length === 0 ? <p className="text-[var(--color-text-muted)]">{t('faqEmpty')}</p> : list}
    </Container>
  );
}
