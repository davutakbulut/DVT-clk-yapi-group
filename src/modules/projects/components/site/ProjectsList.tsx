import { getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { Link } from '@/i18n/navigation';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { getCachedProjectCategories, getCachedProjectList } from '../../data/projectsRepository';
import { ProjectCard } from './ProjectCard';

interface Props {
  readonly locale: string;
  /** Kategori sayfası: yalnız bu slug'daki projeler; başlık kategori adı. */
  readonly categorySlug?: string;
}

/** /projeler ve /projeler/kategori/[slug]: kategori süzgeci (bağlantı çipleri, JS'siz) + kart ızgarası. */
export async function ProjectsList({ locale, categorySlug }: Props) {
  const [list, cats, env, t] = await Promise.all([getCachedProjectList(locale), getCachedProjectCategories(locale), readSupabasePublicEnv(), getTranslations('Projects')]);
  if (!list.ok) logger.warn(list.error.message, { module: 'projects', code: list.error.code });
  const categories = cats.ok ? cats.data : [];
  const current = categorySlug ? categories.find((c) => c.slug === categorySlug) : undefined;
  const items = (list.ok ? list.data : []).filter((p) => !categorySlug || p.categories.some((c) => c.slug === categorySlug));

  return (
    <Container as="section" className="grid gap-10 py-[var(--section-y)]">
      <SectionHeading as="h1" kicker={t('kicker')} title={current ? current.name : t('title')} lead={current ? current.description || undefined : t('lead')} />
      {categories.length > 0 ? (
        <nav aria-label={t('category')} className="chips">
          <Link href="/projects" className="chip" aria-current={!categorySlug ? 'page' : undefined}>
            {t('allCategories')}
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={{ pathname: '/projects/category/[slug]', params: { slug: c.slug } }} className="chip" aria-current={c.slug === categorySlug ? 'page' : undefined}>
              {c.name}
            </Link>
          ))}
        </nav>
      ) : null}
      {items.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">{t('empty')}</p>
      ) : (
        <ul className="card-grid">
          {items.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} locale={locale} supabaseUrl={env.ok ? env.data.url : null} headingLevel="h2" />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
