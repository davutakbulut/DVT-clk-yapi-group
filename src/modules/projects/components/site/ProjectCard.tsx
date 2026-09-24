import { useTranslations } from 'next-intl';
import { mediaAlt, mediaSrcSet, publicStorageUrl } from '@/core/storage';
import { Link } from '@/i18n/navigation';
import { TechDrawing } from '@/ui/TechDrawing';
import type { ProjectCardData } from '../../data/projectsRepository';

interface Props {
  readonly project: ProjectCardData;
  readonly locale: string;
  readonly supabaseUrl: string | null;
  readonly headingLevel?: 'h2' | 'h3';
  readonly wide?: boolean;
}

/** Proje kartı (K-106): kapak ya da teknik çizim + aşama çipi · kategori · başlık · konum · özet · yıl/alan/çelik/süre · bağlantı. */
export function ProjectCard({ project, locale, supabaseUrl, headingLevel: Heading = 'h3', wide = false }: Props) {
  const t = useTranslations('Projects');
  const cover = project.cover && supabaseUrl ? project.cover : null;
  const fmt = (n: number | null, unit: string) => (n === null ? '—' : `${new Intl.NumberFormat(locale).format(n)} ${unit}`);
  return (
    <article className={`proj-card${wide ? ' wide' : ''}`}>
      <div className="tech-art">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49)
          <img src={publicStorageUrl(supabaseUrl!, cover)} srcSet={mediaSrcSet(supabaseUrl!, cover)} sizes={wide ? '(min-width: 1024px) 66vw, 90vw' : '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw'} alt={mediaAlt(cover, locale)} width={cover.width ?? undefined} height={cover.height ?? undefined} loading="lazy" decoding="async" />
        ) : (
          <TechDrawing name={project.drawing} />
        )}
        <span className="chip-phase" data-phase={project.phase}>{t(`phases.${project.phase}`)}</span>
      </div>
      <div className="proj-body">
        {project.categories.length > 0 ? <p className="label-mono text-[var(--color-accent-text)]">{project.categories.map((c) => c.name).join(' · ')}</p> : null}
        <Heading>{project.title}</Heading>
        {project.location ? <p className="proj-loc">{project.location}</p> : null}
        {project.excerpt ? <p className="svc-desc">{project.excerpt}</p> : null}
        <dl className="proj-meta">
          <div><dt>{t('year')}</dt><dd><b>{project.year ?? '—'}</b></dd></div>
          <div><dt>{t('area')}</dt><dd><b>{fmt(project.areaM2, t('m2'))}</b></dd></div>
          <div><dt>{t('steel')}</dt><dd><b>{fmt(project.tonnage, t('ton'))}</b></dd></div>
          <div><dt>{t('duration')}</dt><dd><b>{project.duration || '—'}</b></dd></div>
        </dl>
        <Link href={{ pathname: '/projects/[slug]', params: { slug: project.slug } }} className="proj-more" aria-label={`${t('inspect')}: ${project.title}`}>{t('inspect')} →</Link>
      </div>
    </article>
  );
}
