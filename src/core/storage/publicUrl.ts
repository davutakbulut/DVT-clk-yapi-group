// Medya adresleri (K-116): herkese açık "media" deposu hosting'de ~/public_html/media → <kök>/<path>.
// Kök: core/storage/mediaEnv (NEXT_PUBLIC_MEDIA_URL). Gizli depo (private-documents) adres almaz: imzalı bağlantı (fileStore.signedUrl).

export interface StorageRef {
  readonly bucket: string;
  readonly path: string;
}

/** `media_library` satırının ön yüzün ihtiyaç duyduğu kesiti. */
export interface MediaAsset extends StorageRef {
  readonly width: number | null;
  readonly height: number | null;
  /** {"w480": "path", …} — Faz 3 boru hattı üretir. */
  readonly variants: Readonly<Record<string, string>>;
  readonly blurDataUrl: string | null;
  readonly alt: Readonly<Record<string, string>>;
}

export function publicStorageUrl(mediaBase: string, ref: StorageRef): string {
  const base = mediaBase.replace(/\/+$/, '');
  const path = ref.path.split('/').map(encodeURIComponent).join('/');
  return `${base}/${path}`;
}

const WIDTH_KEY = /^w(\d+)$/;

/**
 * `srcset` dizesi: varyantlar genişliğe göre sıralanır, tam boy en sona `width`'iyle eklenir.
 * Varyantsız kayıt yalnız tam boyu döndürür (video/PDF gibi kayıtlar için boş dize).
 */
export function mediaSrcSet(mediaBase: string, asset: MediaAsset): string {
  const entries: { width: number; url: string }[] = [];
  for (const [key, path] of Object.entries(asset.variants)) {
    const match = WIDTH_KEY.exec(key);
    if (match?.[1]) entries.push({ width: Number(match[1]), url: publicStorageUrl(mediaBase, { bucket: asset.bucket, path }) });
  }
  if (asset.width) entries.push({ width: asset.width, url: publicStorageUrl(mediaBase, asset) });
  return entries
    .sort((a, b) => a.width - b.width)
    .map((e) => `${e.url} ${e.width}w`)
    .join(', ');
}

/** Dil için alt metni; çevrilmemişse boş dize (İngilizce sayfada Türkçe alt çıkmaz — 01-SCHEMA). */
export function mediaAlt(asset: Pick<MediaAsset, 'alt'>, locale: string): string {
  return asset.alt[locale] ?? '';
}
