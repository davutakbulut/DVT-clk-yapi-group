import 'server-only';
import sharp from 'sharp';
import type { ServerDbClient } from '@/core/db/createServerClient';
import { err, ok, type Result } from '@/core/errors/result';
import { logger } from '@/core/observability/logger';
import { BLUR_WIDTH, WEBP_QUALITY, contentHash, imagePaths, planWidths, readVideoMetadata, uuidFromHash } from '@/lib/mediaPipeline.ts';
import { slugify } from '@/lib/slugify';
import { MAX_UPLOAD_BYTES, detectFileType, mimeMatches } from '../domain/fileType';

const BUCKET = 'media';

export interface UploadInput {
  readonly bytes: Buffer;
  readonly declaredMime: string;
  readonly originalName: string;
  readonly folder: string;
  readonly altTr: string;
  readonly altEn: string;
  readonly uploadedBy: string;
}

export type UploadErrorCode = 'fileSize' | 'fileType' | 'fileMagic' | 'unexpected';

/**
 * Admin yüklemesi = Faz 3 boru hattının istek içindeki hâli (K-49): aynı varyantlar, aynı kararlı id.
 * Kullanıcının oturumuyla yazar → storage.objects ve media_library RLS'i geçerli; service-role YOK (Kural 4).
 */
export async function processUpload(client: ServerDbClient, input: UploadInput): Promise<Result<{ id: string; path: string }, UploadErrorCode>> {
  if (input.bytes.length === 0 || input.bytes.length > MAX_UPLOAD_BYTES) return err('fileSize');
  const detected = detectFileType(input.bytes);
  if (!detected) return err('fileType');
  if (!mimeMatches(input.declaredMime, detected)) return err('fileMagic');

  const folder = slugify(input.folder) || 'uploads';
  const hash = contentHash(input.bytes);
  const id = uuidFromHash(hash);
  const alt: Record<string, string> = { ...(input.altTr ? { tr: input.altTr } : {}), ...(input.altEn ? { en: input.altEn } : {}) };

  const upload = async (path: string, body: Buffer, contentType: string) => {
    const { error } = await client.storage.from(BUCKET).upload(path, body, { contentType, upsert: true, cacheControl: '31536000' });
    if (error) throw new Error(`Yükleme başarısız ${path}: ${error.message}`); // static-ok: log mesajı
  };

  try {
    if (detected.isImage) {
      const source = sharp(input.bytes).rotate();
      const meta = await source.metadata();
      const { full, variants } = planWidths(meta.width ?? 0);
      const paths = imagePaths(folder, hash);
      const fullBuf = await source.clone().resize({ width: full, withoutEnlargement: true }).webp({ quality: WEBP_QUALITY }).toBuffer({ resolveWithObject: true });
      await upload(paths.full, fullBuf.data, 'image/webp');
      const variantMap: Record<string, string> = {};
      for (const w of variants) {
        await upload(paths.variant(w), await source.clone().resize({ width: w }).webp({ quality: WEBP_QUALITY }).toBuffer(), 'image/webp');
        variantMap[`w${w}`] = paths.variant(w);
      }
      const blur = await source.clone().resize({ width: BLUR_WIDTH }).webp({ quality: 40 }).toBuffer();
      const { error } = await client.from('media_library').upsert(
        {
          id,
          storage_bucket: BUCKET,
          storage_path: paths.full,
          file_name: paths.full.slice(paths.full.lastIndexOf('/') + 1),
          mime_type: 'image/webp',
          size_bytes: fullBuf.data.length,
          width: fullBuf.info.width,
          height: fullBuf.info.height,
          blur_data_url: `data:image/webp;base64,${blur.toString('base64')}`,
          alt,
          folder,
          variants: variantMap,
          uploaded_by: input.uploadedBy,
        },
        { onConflict: 'storage_bucket,storage_path' },
      );
      if (error) throw new Error(error.message);
      return ok({ id, path: paths.full });
    }

    const base = slugify(input.originalName.replace(/\.[^.]+$/, '')) || hash.slice(0, 12);
    const path = `${folder}/${base}-${hash.slice(0, 8)}.${detected.ext}`;
    const video = detected.mime.startsWith('video/') ? readVideoMetadata(input.bytes, `x.${detected.ext}`) : null;
    await upload(path, input.bytes, detected.mime);
    const { error } = await client.from('media_library').upsert(
      {
        id,
        storage_bucket: BUCKET,
        storage_path: path,
        file_name: path.slice(path.lastIndexOf('/') + 1),
        mime_type: detected.mime,
        size_bytes: input.bytes.length,
        width: video?.width ?? null,
        height: video?.height ?? null,
        duration_ms: video?.durationMs ?? null,
        alt,
        folder,
        variants: {},
        uploaded_by: input.uploadedBy,
      },
      { onConflict: 'storage_bucket,storage_path' },
    );
    if (error) throw new Error(error.message);
    return ok({ id, path });
  } catch (cause) {
    logger.error('Medya yüklemesi başarısız', { module: 'media', cause });
    return err('unexpected');
  }
}
