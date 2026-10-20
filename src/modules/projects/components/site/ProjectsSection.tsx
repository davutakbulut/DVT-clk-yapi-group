import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { TechDrawing } from '@/ui/TechDrawing';
import { readMediaEnv } from '@/core/storage/mediaEnv';
import { logger } from '@/core/observability/logger';
import { Button } from '@/ui/Button';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { getCachedProjectList } from '../../data/projectsRepository';
import { ProjectCard } from './ProjectCard';

interface Cta { readonly kicker: string; readonly title: string; readonly text: string }

/** Ana sayfa — proje galerisi (öne çıkanlar önce, en çok 6; CTA kartı varsa 5 + kart, K-111). Proje yoksa bölüm render edilmez. */
export async function ProjectsSection({ locale, index = '03', title, cta }: { readonly locale: string; readonly index?: string; readonly title?: string; readonly cta?: Cta | null }) {
  const [result, env, t] = await Promise.all([getCachedProjectList(locale), readMediaEnv(), getTranslations('Projects')]);
  if (!result.ok) {
    logger.warn(result.error.message, { module: 'projects', code: result.error.code });
    return null;
  }
  if (result.data.length === 0) return null;
  const items = [...result.data].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)).slice(0, cta?.title ? 5 : 6);

  return (
    <Container as="section" className="grid gap-10 py-[var(--section-y)]" aria-labelledby="projects-title">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading index={index} kicker={t('kicker')} title={<span id="projects-title">{title || t('homeTitle')}</span>} />
        <Button href="/projects" variant="ghost">
          {t('all')}
        </Button>
      </div>
      <ul className="card-grid">
        {items.map((project) => (
          <li key={project.id}>
            <ProjectCard project={project} locale={locale} supabaseUrl={env.ok ? env.data.url : null} />
          </li>
        ))}
        {cta?.title ? (
          <li>
            <Link href="/get-quote" className="proj-card proj-cta">
              <div className="tech-art" aria-hidden="true"><TechDrawing name="proje" /></div>
              <div className="proj-body">
                {cta.kicker ? <p className="label-mono text-[var(--color-accent-text)]">{cta.kicker}</p> : null}
                <h3>{cta.title}</h3>
                {cta.text ? <p className="svc-desc">{cta.text}</p> : null}
                <span className="proj-more">{t('ctaMore')} →</span>
              </div>
            </Link>
          </li>
        ) : null}
      </ul>
    </Container>
  );
}
