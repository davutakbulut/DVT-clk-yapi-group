// Faz 3 · Medya boru hattının SAF parçaları: dosya sistemi ve ağ yok, bu yüzden test edilebilir.
// I/O tarafı scripts/media-migrate.mjs içinde.
import { createHash } from 'node:crypto';
import { slugify } from '../../src/lib/slugify.ts';

/** Üretilen WebP genişlikleri. Kaynaklar en çok 2048 px; 1920 üstü hiçbir kırılımda istenmez. */
export const VARIANT_WIDTHS = Object.freeze([480, 960, 1440]);
export const MAX_FULL_WIDTH = 1920;
export const WEBP_QUALITY = 80;
export const BLUR_WIDTH = 16;

/** Klasör adı (Türkçe, büyük harf) → alt metni etiketi. Klasör adı slug'a çevrilerek Storage yolu olur. */
export const FOLDER_LABELS = Object.freeze({
  'ÇELİK KONSTRÜKSİYON': 'Çelik konstrüksiyon',
  'HAFİF ÇELİK': 'Hafif çelik',
  'KÖRKASA': 'Körkasa',
  'KUTU PROFİL': 'Kutu profil',
  'KUTU PROFİL ALÇIPAN': 'Kutu profil alçıpan',
  videos: 'Video',
});

export const IMAGE_EXT = /\.(jpe?g|png|webp|avif)$/i;
export const VIDEO_EXT = /\.(mp4|webm)$/i;

export function folderSlug(folderName) {
  const slug = slugify(folderName);
  if (!slug) throw new Error(`Klasör adı slug'a çevrilemedi: ${folderName}`);
  return slug;
}

export function contentHash(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

/** İçerikten türetilen kararlı UUID: betik yeniden koşunca aynı kayıt aynı id'yi alır. */
export function uuidFromHash(hex) {
  const h = hex.replace(/[^0-9a-f]/gi, '');
  if (h.length < 32) throw new Error('uuidFromHash: en az 32 hex karakter gerekir');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Kaynak genişliğinden küçük olan varyantlar + (gerekirse) 1920'ye kırpılmış "tam" boy. */
export function planWidths(originalWidth) {
  const full = Math.min(originalWidth, MAX_FULL_WIDTH);
  return { full, variants: VARIANT_WIDTHS.filter((w) => w < full) };
}

export function imagePaths(folder, hash) {
  const short = hash.slice(0, 12);
  const base = `${folderSlug(folder)}/${short}`;
  return { full: `${base}.webp`, variant: (w) => `${base}-w${w}.webp` };
}

export function videoPath(folder, fileName) {
  const ext = fileName.slice(fileName.lastIndexOf('.'));
  const name = slugify(fileName.slice(0, -ext.length));
  if (!name) throw new Error(`Video adı slug'a çevrilemedi: ${fileName}`);
  return `${folderSlug(folder)}/${name}${ext}`;
}

export function mimeFor(fileName) {
  if (/\.webp$/i.test(fileName)) return 'image/webp';
  if (/\.jpe?g$/i.test(fileName)) return 'image/jpeg';
  if (/\.png$/i.test(fileName)) return 'image/png';
  if (/\.avif$/i.test(fileName)) return 'image/avif';
  if (/\.mp4$/i.test(fileName)) return 'video/mp4';
  if (/\.webm$/i.test(fileName)) return 'video/webm';
  return 'application/octet-stream';
}

export function altFor(folder) {
  // macOS readdir klasör adını NFD (ayrışık) döndürür: "İ" = I + U+0307. Tablo NFC ile yazıldı.
  const label = FOLDER_LABELS[folder.normalize('NFC')];
  return label ? { tr: label } : {};
}

// ─────────────────────────────────────────────────────────────────────────────
// MP4 üst verisi — ffprobe yok. moov → mvhd (süre) ve moov → trak → tkhd (en/boy) okunur.
// Yalnız ISO BMFF kutu yapısı; codec'e bakılmaz. WebM (EBML) desteklenmez → null döner.
// ─────────────────────────────────────────────────────────────────────────────
function* boxes(buf, start, end) {
  let offset = start;
  while (offset + 8 <= end) {
    let size = buf.readUInt32BE(offset);
    const type = buf.toString('latin1', offset + 4, offset + 8);
    let header = 8;
    if (size === 1) {
      size = Number(buf.readBigUInt64BE(offset + 8));
      header = 16;
    } else if (size === 0) size = end - offset;
    if (size < header) return;
    yield { type, body: offset + header, end: Math.min(offset + size, end) };
    offset += size;
  }
}

function findBox(buf, start, end, type) {
  for (const box of boxes(buf, start, end)) if (box.type === type) return box;
  return null;
}

export function readMp4Metadata(buf) {
  const moov = findBox(buf, 0, buf.length, 'moov');
  if (!moov) return null;
  const mvhd = findBox(buf, moov.body, moov.end, 'mvhd');
  let durationMs = null;
  if (mvhd) {
    const version = buf[mvhd.body];
    const timescale = version === 1 ? buf.readUInt32BE(mvhd.body + 20) : buf.readUInt32BE(mvhd.body + 12);
    const duration = version === 1 ? Number(buf.readBigUInt64BE(mvhd.body + 24)) : buf.readUInt32BE(mvhd.body + 16);
    if (timescale > 0) durationMs = Math.round((duration / timescale) * 1000);
  }
  let width = null;
  let height = null;
  for (const trak of boxes(buf, moov.body, moov.end)) {
    if (trak.type !== 'trak') continue;
    const tkhd = findBox(buf, trak.body, trak.end, 'tkhd');
    if (!tkhd) continue;
    const version = buf[tkhd.body];
    const at = tkhd.body + (version === 1 ? 88 : 76);
    const w = buf.readUInt32BE(at) / 65536;
    const h = buf.readUInt32BE(at + 4) / 65536;
    if (w > 0 && h > 0) {
      width = Math.round(w);
      height = Math.round(h);
      break; // ilk görsel parça
    }
  }
  return { width, height, durationMs };
}

export function readVideoMetadata(buf, fileName) {
  return /\.mp4$/i.test(fileName) ? readMp4Metadata(buf) : { width: null, height: null, durationMs: null };
}
