import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { isLocalizedText, type LocalizedText } from '@/lib/localized';
import { formatStats, readStats } from '../domain/stats';

export interface AdminHero {
  readonly id: string;
  readonly label: string;
  readonly desktop_video_id: string | null;
  readonly mobile_video_id: string | null;
  readonly desktop_poster_id: string | null;
  readonly mobile_poster_id: string | null;
  readonly duration_seconds: number | null;
  readonly headline: LocalizedText;
  readonly subheadline: LocalizedText;
  readonly cta_label: LocalizedText;
  readonly cta_path: string | null;
  readonly is_active: boolean;
}

export interface AdminAbout {
  readonly eyebrow: LocalizedText;
  readonly title: LocalizedText;
  readonly body: LocalizedText;
  readonly image_id: string | null;
  /** Form metni: "değer | TR | EN" satırları. */
  readonly statsText: string;
  readonly status: string;
  readonly published_locales: readonly string[];
  readonly reviewedEn: boolean;
}

export interface MediaChoice {
  readonly id: string;
  readonly path: string;
  readonly mime: string;
}

export interface AdminHome {
  readonly hero: AdminHero | null;
  readonly about: AdminAbout | null;
  readonly images: readonly MediaChoice[];
  readonly videos: readonly MediaChoice[];
}

const lt = (v: unknown): LocalizedText => (isLocalizedText(v) ? v : {});

/** Panel: aktif (yoksa en son) hero, hakkımızda kaydı ve medya seçenekleri. Kullanıcının oturumuyla (RLS). */
export async function getAdminHome(): Promise<Result<AdminHome>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [hero, about, media] = await Promise.all([
    client.data.from('hero_media').select('id, label, desktop_video_id, mobile_video_id, desktop_poster_id, mobile_poster_id, duration_seconds, headline, subheadline, cta_label, cta_path, is_active').order('is_active', { ascending: false }).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    client.data.from('about_content').select('eyebrow, title, body, image_id, stats, status, published_locales, translation_meta').eq('key', 'main').maybeSingle(),
    client.data.from('media_library').select('id, storage_path, mime_type').order('created_at', { ascending: false }).limit(500),
  ]);
  const failure = hero.error ?? about.error ?? media.error;
  if (failure) return err(appError('external_service', failure.message, { module: 'home' }));

  const choices = (media.data ?? []).map((m) => ({ id: m.id, path: m.storage_path, mime: m.mime_type }));
  const meta = (about.data?.translation_meta ?? {}) as { en?: { reviewed?: boolean } };
  return ok({
    hero: hero.data
      ? { ...hero.data, duration_seconds: hero.data.duration_seconds === null ? null : Number(hero.data.duration_seconds), headline: lt(hero.data.headline), subheadline: lt(hero.data.subheadline), cta_label: lt(hero.data.cta_label) }
      : null,
    about: about.data
      ? { eyebrow: lt(about.data.eyebrow), title: lt(about.data.title), body: lt(about.data.body), image_id: about.data.image_id, statsText: formatStats(readStats(about.data.stats)), status: about.data.status, published_locales: about.data.published_locales, reviewedEn: meta.en?.reviewed === true }
      : null,
    images: choices.filter((m) => m.mime.startsWith('image/')),
    videos: choices.filter((m) => m.mime.startsWith('video/')),
  });
}
