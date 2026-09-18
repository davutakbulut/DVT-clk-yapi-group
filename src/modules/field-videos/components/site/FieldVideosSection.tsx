import { getTranslations } from 'next-intl/server';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { logger } from '@/core/observability/logger';
import { publicStorageUrl } from '@/core/storage';
import { Container } from '@/ui/Container';
import { SectionHeading } from '@/ui/SectionHeading';
import { getCachedFieldVideos } from '../../data/fieldVideosRepository';
import { youTubeThumbnail } from '../../domain/youtube';
import { FieldVideosCarousel, type FieldVideoItem } from './FieldVideosCarousel';

/** Ana sayfa "Sahadan Videolar": panelden eklenen videolar. Kayıt yoksa ya da veri gelmezse bölüm HİÇ render edilmez (Kural 3). */
export async function FieldVideosSection({ locale, index }: { readonly locale: string; readonly index?: string }) {
  const [result, env, t] = await Promise.all([getCachedFieldVideos(locale), readSupabasePublicEnv(), getTranslations('FieldVideos')]);
  if (!result.ok) {
    logger.warn(result.error.message, { module: 'field-videos', code: result.error.code });
    return null;
  }
  if (result.data.length === 0) return null;
  const url = env.ok ? env.data.url : null;
  const items: FieldVideoItem[] = result.data
    .map((v) => ({
      id: v.id,
      title: v.title,
      caption: v.caption,
      source: v.source,
      youtubeId: v.youtubeId,
      videoSrc: v.video && url ? publicStorageUrl(url, v.video) : null,
      posterSrc: v.poster && url ? publicStorageUrl(url, v.poster) : v.source === 'youtube' && v.youtubeId ? youTubeThumbnail(v.youtubeId) : null,
    }))
    .filter((v) => (v.source === 'youtube' ? Boolean(v.youtubeId) : Boolean(v.videoSrc)));
  if (items.length === 0) return null;
  return (
    <section className="fv-section border-t border-[var(--color-border)]" aria-labelledby="field-videos-title">
      <Container className="grid gap-10 py-[var(--section-y)]">
        <SectionHeading index={index} kicker={t('kicker')} title={<span id="field-videos-title">{t('title')}</span>} lead={t('lead')} />
        <FieldVideosCarousel items={items} />
      </Container>
    </section>
  );
}
