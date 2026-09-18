import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { renderMarkdown } from '@/lib/markdown';
import { Container } from '@/ui/Container';
import type { JobPostingData } from '../../data/corporateRepository';
import { ApplicationForm } from './ApplicationForm';

export async function JobDetail({ job, locale }: { readonly job: JobPostingData; readonly locale: string }) {
  const [t, format] = await Promise.all([getTranslations('Corporate'), getFormatter()]);
  const facts = [
    { label: t('department'), value: job.department },
    { label: t('location'), value: job.location },
    { label: t('employmentType'), value: t(`types.${job.employmentType as 'full_time'}`) },
    { label: t('deadline'), value: job.applicationDeadline ? format.dateTime(new Date(job.applicationDeadline), { day: 'numeric', month: 'long', year: 'numeric' }) : '' },
  ].filter((f) => f.value);
  return (
    <article className="grid">
      <header className="page-head" data-on-dark="">
        <Container className="grid gap-6 py-[var(--section-y)]">
          <nav aria-label={t('careersTitle')} className="label-mono flex flex-wrap items-center gap-2 text-[var(--color-text-inverse-subtle)]">
            <Link href="/" className="hover:text-[var(--color-accent-on-dark)]">
              {t('home')}
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/careers" className="hover:text-[var(--color-accent-on-dark)]">
              {t('careersTitle')}
            </Link>
          </nav>
          <h1 className="max-w-[24ch] text-[var(--color-text-inverse)]">{job.title}</h1>
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
      </header>
      <Container className="grid gap-12 py-[var(--section-y)] lg:grid-cols-[7fr_5fr]">
        <div className="grid content-start gap-10">
          {job.description ? <div className="prose-site" dangerouslySetInnerHTML={{ __html: renderMarkdown(job.description) }} /> : null}
          {job.requirements ? (
            <section className="grid gap-4">
              <h2 className="text-[length:var(--fs-h3)]">{t('requirements')}</h2>
              <div className="prose-site" dangerouslySetInnerHTML={{ __html: renderMarkdown(job.requirements) }} />
            </section>
          ) : null}
        </div>
        <aside className="grid content-start gap-6 border border-[var(--color-border)] bg-[var(--color-surface)] p-6 lg:sticky lg:top-[calc(var(--header-h)+var(--space-6))] lg:self-start" aria-labelledby="apply-title">
          <h2 id="apply-title" className="text-[length:var(--fs-h3)]">
            {t('applyTitle')}
          </h2>
          {job.isOpen ? <ApplicationForm jobPostingId={job.id} locale={locale} /> : <p className="text-[var(--color-text-muted)]">{t('closed')}</p>}
        </aside>
      </Container>
    </article>
  );
}
