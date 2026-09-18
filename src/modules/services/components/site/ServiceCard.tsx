import { mediaAlt, mediaSrcSet, publicStorageUrl } from '@/core/storage';
import { Link } from '@/i18n/navigation';
import type { ServiceCardData } from '../../data/servicesRepository';
import { ServiceIcon } from './ServiceIcon';

interface Props {
  readonly service: ServiceCardData;
  readonly locale: string;
  readonly supabaseUrl: string | null;
  readonly headingLevel?: 'h2' | 'h3';
}

/** Kart: kapak (yoksa ikon alanı) + başlık + özet. Tüm kart tek bağlantı; gölge/yuvarlak köşe yok (MASTER). */
export function ServiceCard({ service, locale, supabaseUrl, headingLevel: Heading = 'h3' }: Props) {
  const cover = service.cover && supabaseUrl ? service.cover : null;
  return (
    <article className="card">
      <Link href={{ pathname: '/services/[slug]', params: { slug: service.slug } }} className="card-link">
        <div className="card-media">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49)
            <img src={publicStorageUrl(supabaseUrl!, cover)} srcSet={mediaSrcSet(supabaseUrl!, cover)} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw" alt={mediaAlt(cover, locale)} width={cover.width ?? undefined} height={cover.height ?? undefined} loading="lazy" decoding="async" />
          ) : (
            <div className="card-media-icon" data-on-dark="">
              <ServiceIcon name={service.icon ?? 'building'} size={40} />
            </div>
          )}
        </div>
        <div className="card-body">
          <Heading className="card-title">{service.title}</Heading>
          {service.excerpt ? <p className="card-excerpt">{service.excerpt}</p> : null}
        </div>
      </Link>
    </article>
  );
}
