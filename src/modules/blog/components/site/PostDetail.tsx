import { getFormatter, getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { mediaAlt, mediaSrcSet, publicStorageUrl } from '@/core/storage';
import { Link } from '@/i18n/navigation';
import { extractHeadings, renderMarkdown } from '@/lib/markdown';
import { Container } from '@/ui/Container';
import { Crumbs } from '@/ui/Crumbs';
import { fetchPublishedComments, type PostCardData, type PostDetailData } from '../../data/blogRepository';
import { CommentForm } from './CommentForm';
import { PostCard } from './PostCard';

interface Props {
  readonly post: PostDetailData;
  readonly locale: string;
  readonly related: readonly PostCardData[];
  readonly prev: PostCardData | null;
  readonly next: PostCardData | null;
}

/**
 * Yazı detayı (01-PUBLIC-PAGES): başlık bandı (kategori · tarih · okuma süresi · yazar) → kapak → içindekiler + gövde →
 * etiketler → yazar kutusu → aynı kategoriden → önceki/sonraki → yorumlar (onaylı liste + form).
 */
export async function PostDetail({ post, locale, related, prev, next }: Props) {
  const [env, t, format, comments] = await Promise.all([readSupabasePublicEnv(), getTranslations('Blog'), getFormatter(), fetchPublishedComments(post.id)]);
  const url = env.ok ? env.data.url : null;
  const cover = post.cover && url ? post.cover : null;
  const headings = extractHeadings(post.body).filter((h) => h.level <= 3);
  const date = (iso: string | null) => (iso ? format.dateTime(new Date(iso), { year: 'numeric', month: 'long', day: 'numeric' }) : null);
  const roots = comments.filter((c) => !c.parentId);
  const replies = (id: string) => comments.filter((c) => c.parentId === id);

  return (
    <article className="grid">
      <header className="page-head" data-on-dark="">
        <Container className="grid gap-6 py-[var(--section-y)]">
          <Crumbs label={t('breadcrumb')} className="text-[var(--color-text-inverse-subtle)]">
            <Link href="/" className="hover:text-[var(--color-accent-on-dark)]">
              {t('home')}
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/blog" className="hover:text-[var(--color-accent-on-dark)]">
              {t('title')}
            </Link>
            {post.category ? (
              <>
                <span aria-hidden="true">/</span>
                <Link href={{ pathname: '/blog/category/[slug]', params: { slug: post.category.slug } }} className="hover:text-[var(--color-accent-on-dark)]">
                  {post.category.name}
                </Link>
              </>
            ) : null}
          </Crumbs>
          <div className="grid gap-4">
            <h1 className="max-w-[24ch] text-[var(--color-text-inverse)]">{post.title}</h1>
            {post.excerpt ? <p className="max-w-[60ch] text-[length:var(--fs-body-lg)] text-[var(--color-text-inverse-muted)]">{post.excerpt}</p> : null}
            <p className="text-[length:var(--fs-sm)] text-[var(--color-text-inverse-subtle)]">
              {[post.author?.name, date(post.publishedAt), post.readingMinutes ? t('readingTime', { minutes: post.readingMinutes }) : null].filter(Boolean).join(' · ')}
            </p>
          </div>
        </Container>
        {cover ? (
          <div className="page-head-cover">
            {/* eslint-disable-next-line @next/next/no-img-element -- Storage WebP + srcset (K-49) */}
            <img src={publicStorageUrl(url!, cover)} srcSet={mediaSrcSet(url!, cover)} sizes="100vw" alt={mediaAlt(cover, locale)} width={cover.width ?? undefined} height={cover.height ?? undefined} fetchPriority="high" decoding="async" />
          </div>
        ) : null}
      </header>

      <Container className="grid gap-12 py-[var(--section-y)] lg:grid-cols-[3fr_8fr]">
        {headings.length > 1 ? (
          <nav aria-label={t('toc')} className="toc lg:sticky lg:top-[calc(var(--header-h)+var(--space-6))] lg:self-start">
            <p className="label-mono text-[var(--color-text-subtle)]">{t('toc')}</p>
            <ol>
              {headings.map((h) => (
                <li key={h.id} className={h.level === 3 ? 'pl-4' : ''}>
                  <a href={`#${h.id}`}>{h.text}</a>
                </li>
              ))}
            </ol>
          </nav>
        ) : (
          <div className="hidden lg:block" />
        )}
        <div className="grid content-start gap-10">
          <div className="prose-site prose-article" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }} />
          {post.tags.length > 0 ? (
            <nav aria-label={t('tags')} className="chips">
              {post.tags.map((tag) => (
                <Link key={tag.slug} href={{ pathname: '/blog/tag/[slug]', params: { slug: tag.slug } }} className="chip">
                  {tag.name}
                </Link>
              ))}
            </nav>
          ) : null}
          {post.author ? (
            <aside className="author-box" aria-label={t('author')}>
              {post.author.photo && url ? (
                // eslint-disable-next-line @next/next/no-img-element -- Storage WebP (K-49)
                <img src={publicStorageUrl(url, post.author.photo)} srcSet={mediaSrcSet(url, post.author.photo)} sizes="96px" alt={mediaAlt(post.author.photo, locale)} width={96} height={96} loading="lazy" className="author-photo" />
              ) : null}
              <div className="grid gap-1">
                <p className="label-mono text-[var(--color-text-subtle)]">{t('author')}</p>
                <p className="font-[family-name:var(--font-heading)] text-lg font-bold">{post.author.name}</p>
                {post.author.position ? <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{post.author.position}</p> : null}
                {post.author.bio ? <p className="text-[length:var(--fs-sm)]">{post.author.bio}</p> : null}
                {post.author.linkedinUrl ? (
                  <a href={post.author.linkedinUrl} rel="noopener noreferrer" target="_blank" className="text-[length:var(--fs-sm)] text-[var(--color-accent-text)] underline underline-offset-4">
                    LinkedIn
                  </a>
                ) : null}
              </div>
            </aside>
          ) : null}
          {post.updatedAt && post.publishedAt && new Date(post.updatedAt).getTime() - new Date(post.publishedAt).getTime() > 86_400_000 ? (
            <p className="text-[length:var(--fs-xs)] text-[var(--color-text-subtle)]">
              {t('updated')}: {date(post.updatedAt)}
            </p>
          ) : null}
        </div>
      </Container>

      {related.length > 0 ? (
        <Container as="section" aria-labelledby="post-related" className="grid gap-8 pb-[var(--section-y)]">
          <h2 id="post-related" className="text-[length:var(--fs-h3)]">
            {t('related')}
          </h2>
          <ul className="card-grid">
            {related.map((p) => (
              <li key={p.id}>
                <PostCard post={p} locale={locale} supabaseUrl={url} />
              </li>
            ))}
          </ul>
        </Container>
      ) : null}

      {prev || next ? (
        <Container as="nav" aria-label={`${t('prev')} / ${t('next')}`} className="flex flex-wrap justify-between gap-4 border-t border-[var(--color-border)] py-8">
          {prev ? (
            <Link href={{ pathname: '/blog/[slug]', params: { slug: prev.slug } }} className="grid gap-1">
              <span className="label-mono text-[var(--color-text-subtle)]">{t('prev')}</span>
              <span className="font-semibold">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={{ pathname: '/blog/[slug]', params: { slug: next.slug } }} className="grid gap-1 text-right">
              <span className="label-mono text-[var(--color-text-subtle)]">{t('next')}</span>
              <span className="font-semibold">{next.title}</span>
            </Link>
          ) : null}
        </Container>
      ) : null}

      <Container as="section" aria-labelledby="post-comments" className="grid max-w-[var(--prose-max)] gap-8 border-t border-[var(--color-border)] py-[var(--section-y)]">
        <h2 id="post-comments" className="text-[length:var(--fs-h3)]">
          {t('comments')} {comments.length > 0 ? <span className="text-[var(--color-text-subtle)]">({comments.length})</span> : null}
        </h2>
        {roots.length === 0 ? <p className="text-[var(--color-text-muted)]">{t('noComments')}</p> : null}
        {roots.length > 0 ? (
          <ol className="grid gap-6">
            {roots.map((c) => (
              <li key={c.id} className="comment">
                <p className="text-[length:var(--fs-sm)]">
                  <strong>{c.authorName}</strong> <span className="text-[var(--color-text-subtle)]">· {date(c.createdAt)}</span>
                </p>
                <p>{c.body}</p>
                {replies(c.id).length > 0 ? (
                  <ol className="mt-4 grid gap-4 border-l-2 border-[var(--color-border)] pl-4">
                    {replies(c.id).map((r) => (
                      <li key={r.id}>
                        <p className="text-[length:var(--fs-sm)]">
                          <strong>{r.authorName}</strong> <span className="text-[var(--color-text-subtle)]">· {date(r.createdAt)}</span>
                        </p>
                        <p>{r.body}</p>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}
        {post.allowComments ? (
          <div className="grid gap-4">
            <h3 className="text-[length:var(--fs-body-lg)]">{t('commentForm')}</h3>
            <CommentForm postId={post.id} locale={locale} />
          </div>
        ) : (
          <p className="text-[var(--color-text-muted)]">{t('commentsClosed')}</p>
        )}
      </Container>
    </article>
  );
}
