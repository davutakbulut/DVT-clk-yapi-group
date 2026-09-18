import { getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { Link } from '@/i18n/navigation';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { getCachedBlogCategories, getCachedPostList } from '../../data/blogRepository';
import { PostCard } from './PostCard';

interface Props {
  readonly locale: string;
  readonly categorySlug?: string;
  readonly tagSlug?: string;
  readonly title?: string;
  readonly lead?: string;
}

/** /blog · /blog/kategori/[slug] · /blog/etiket/[slug]: kategori çipleri + kart ızgarası. */
export async function PostsList({ locale, categorySlug, tagSlug, title, lead }: Props) {
  const [list, cats, env, t] = await Promise.all([getCachedPostList(locale), getCachedBlogCategories(locale), readSupabasePublicEnv(), getTranslations('Blog')]);
  if (!list.ok) logger.warn(list.error.message, { module: 'blog', code: list.error.code });
  const categories = cats.ok ? cats.data : [];
  const items = (list.ok ? list.data : []).filter((p) => (!categorySlug || p.category?.slug === categorySlug) && (!tagSlug || p.tagSlugs.includes(tagSlug)));
  const url = env.ok ? env.data.url : null;

  return (
    <Container as="section" className="grid gap-10 py-[var(--section-y)]">
      <SectionHeading as="h1" kicker={t('kicker')} title={title ?? t('title')} lead={lead ?? (title ? undefined : t('lead'))} />
      {categories.length > 0 ? (
        <nav aria-label={t('category')} className="chips">
          <Link href="/blog" className="chip" aria-current={!categorySlug && !tagSlug ? 'page' : undefined}>
            {t('allCategories')}
          </Link>
          {categories.map((c) => (
            <Link key={c.id} href={{ pathname: '/blog/category/[slug]', params: { slug: c.slug } }} className="chip" aria-current={c.slug === categorySlug ? 'page' : undefined}>
              {c.name}
            </Link>
          ))}
        </nav>
      ) : null}
      {items.length === 0 ? (
        <p className="text-[var(--color-text-muted)]">{t('empty')}</p>
      ) : (
        <ul className="card-grid">
          {items.map((post) => (
            <li key={post.id}>
              <PostCard post={post} locale={locale} supabaseUrl={url} headingLevel="h2" />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
