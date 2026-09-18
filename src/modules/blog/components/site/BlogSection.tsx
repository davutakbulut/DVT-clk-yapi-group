import { getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { Button } from '@/ui/Button';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { getCachedPostList } from '../../data/blogRepository';
import { PostCard } from './PostCard';

/** Ana sayfa 06 — son 3 yazı. Yazı yoksa bölüm render edilmez. */
export async function BlogSection({ locale, index = '04' }: { readonly locale: string; readonly index?: string }) {
  const [result, env, t] = await Promise.all([getCachedPostList(locale), readSupabasePublicEnv(), getTranslations('Blog')]);
  if (!result.ok) {
    logger.warn(result.error.message, { module: 'blog', code: result.error.code });
    return null;
  }
  if (result.data.length === 0) return null;
  const items = result.data.slice(0, 3);
  return (
    <section className="border-t border-[var(--color-border)]" aria-labelledby="blog-title">
      <Container className="grid gap-10 py-[var(--section-y)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading index={index} kicker={t('kicker')} title={<span id="blog-title">{t('homeTitle')}</span>} />
          <Button href="/blog" variant="ghost">
            {t('all')}
          </Button>
        </div>
        <ul className="card-grid">
          {items.map((post) => (
            <li key={post.id}>
              <PostCard post={post} locale={locale} supabaseUrl={env.ok ? env.data.url : null} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
