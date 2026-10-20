import { readMediaEnv } from '@/core/storage/mediaEnv';
import { publicStorageUrl } from '@/core/storage';
import type { ThumbSrc } from '../components/admin/Thumb';

export interface ThumbMedia {
  readonly storage_path: string;
  readonly variants: unknown;
}

/** Liste sorgusundaki `thumb:media_library!…(storage_path, variants)` gömüsünü küçük/büyük adres çiftine çevirir; env yoksa null. */
export function thumbSrc(media: ThumbMedia | null | undefined): ThumbSrc | null {
  if (!media) return null;
  const env = readMediaEnv();
  if (!env.ok) return null;
  const variants = (typeof media.variants === 'object' && media.variants !== null ? media.variants : {}) as Record<string, string>;
  const smallPath = variants['w480'] ?? variants['w768'] ?? media.storage_path;
  return { small: publicStorageUrl(env.data.url, { bucket: 'media', path: smallPath }), full: publicStorageUrl(env.data.url, { bucket: 'media', path: media.storage_path }) };
}
