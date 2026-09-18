import { getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { Button } from '@/ui/Button';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { getCachedProjectList } from '../../data/projectsRepository';
import { ProjectCard } from './ProjectCard';

/** Ana sayfa 05 — proje galerisi (öne çıkanlar önce, en çok 6). Proje yoksa bölüm render edilmez. */
export async function ProjectsSection({ locale, index = '03' }: { readonly locale: string; readonly index?: string }) {
  const [result, env, t] = await Promise.all([getCachedProjectList(locale), readSupabasePublicEnv(), getTranslations('Projects')]);
  if (!result.ok) {
    logger.warn(result.error.message, { module: 'projects', code: result.error.code });
    return null;
  }
  if (result.data.length === 0) return null;
  const items = [...result.data].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)).slice(0, 6);

  return (
    <Container as="section" className="grid gap-10 py-[var(--section-y)]" aria-labelledby="projects-title">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHeading index={index} kicker={t('kicker')} title={<span id="projects-title">{t('homeTitle')}</span>} />
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
      </ul>
    </Container>
  );
}
