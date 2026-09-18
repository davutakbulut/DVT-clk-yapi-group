import { mediaAlt, mediaSrcSet, publicStorageUrl } from '@/core/storage';
import { Link } from '@/i18n/navigation';
import type { ProjectCardData } from '../../data/projectsRepository';

interface Props {
  readonly project: ProjectCardData;
  readonly locale: string;
  readonly supabaseUrl: string | null;
  readonly headingLevel?: 'h2' | 'h3';
}

/** Proje kartı: kapak · başlık · konum · kategori etiketleri. Tüm kart tek bağlantı. */
export function ProjectCard({ project, locale, supabaseUrl, headingLevel: Heading = 'h3' }: Props) {
  const cover = project.cover && supabaseUrl ? project.cover : null;
  return (
    <article className="card">
      <Link href={{ pathname: '/projects/[slug]', params: { slug: project.slug } }} className="card-link">
        <div className="card-media">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49)
            <img src={publicStorageUrl(supabaseUrl!, cover)} srcSet={mediaSrcSet(supabaseUrl!, cover)} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw" alt={mediaAlt(cover, locale)} width={cover.width ?? undefined} height={cover.height ?? undefined} loading="lazy" decoding="async" />
          ) : (
            <div className="card-media-icon" aria-hidden="true" />
          )}
        </div>
        <div className="card-body">
          <Heading className="card-title">{project.title}</Heading>
          {project.location ? <p className="card-excerpt">{project.location}</p> : null}
          {project.categories.length > 0 ? (
            <p className="label-mono text-[var(--color-accent-text)]">{project.categories.map((c) => c.name).join(' · ')}</p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
