import { getFormatter, getTranslations } from 'next-intl/server';
import { mediaAlt, mediaSrcSet, publicStorageUrl } from '@/core/storage';
import { Link } from '@/i18n/navigation';
import type { PostCardData } from '../../data/blogRepository';

interface Props {
  readonly post: PostCardData;
  readonly locale: string;
  readonly supabaseUrl: string | null;
  readonly headingLevel?: 'h2' | 'h3';
}

/** Yazı kartı: kapak · kategori + tarih + okuma süresi · başlık · özet. */
export async function PostCard({ post, locale, supabaseUrl, headingLevel: Heading = 'h3' }: Props) {
  const [t, format] = await Promise.all([getTranslations('Blog'), getFormatter()]);
  const cover = post.cover && supabaseUrl ? post.cover : null;
  const meta = [post.category?.name, post.publishedAt ? format.dateTime(new Date(post.publishedAt), { year: 'numeric', month: 'long', day: 'numeric' }) : null, post.readingMinutes ? t('readingTime', { minutes: post.readingMinutes }) : null].filter(Boolean);
  return (
    <article className="card">
      <Link href={{ pathname: '/blog/[slug]', params: { slug: post.slug } }} className="card-link">
        {cover ? (
          <div className="card-media">
            {/* eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49) */}
            <img src={publicStorageUrl(supabaseUrl!, cover)} srcSet={mediaSrcSet(supabaseUrl!, cover)} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw" alt={mediaAlt(cover, locale)} width={cover.width ?? undefined} height={cover.height ?? undefined} loading="lazy" decoding="async" />
          </div>
        ) : (
          <div />
        )}
        <div className="card-body">
          {meta.length > 0 ? <p className="text-[length:var(--fs-xs)] text-[var(--color-text-subtle)]">{meta.join(' · ')}</p> : null}
          <Heading className="card-title">{post.title}</Heading>
          {post.excerpt ? <p className="card-excerpt">{post.excerpt}</p> : null}
        </div>
      </Link>
    </article>
  );
}
