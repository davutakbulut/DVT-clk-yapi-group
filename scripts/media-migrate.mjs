#!/usr/bin/env node
// Faz 3 · assets/ altındaki kaynak görsel ve videoları Supabase Storage'a taşır, media_library'ye yazar.
//
//   node --env-file=.env.local scripts/media-migrate.mjs [--dry-run] [--only <klasör>]
//
// - Yeniden çalıştırılabilir: kayıt anahtarı (bucket, path) ve id içerik hash'inden türetilir (upsert).
// - Görsel → WebP: 480/960/1440 varyant + en çok 1920 px "tam" boy + 16 px blur yer tutucu.
// - Video → olduğu gibi (ffmpeg yok); mp4 üst verisi kutu yapısından okunur. Poster üretimi Faz 6.
// - Secret key yalnız burada (yerel betik); Kural 4. assets/ git dışındadır ve kaynak arşivdir.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import {
  BLUR_WIDTH, IMAGE_EXT, VIDEO_EXT, WEBP_QUALITY, altFor, contentHash, folderSlug, imagePaths, mimeFor,
  planWidths, readVideoMetadata, uuidFromHash, videoPath,
} from './lib/media-pipeline.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const ASSETS = join(ROOT, 'assets');
const BUCKET = 'media';
const CONCURRENCY = 4;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!dryRun && (!url || !secret)) {
  console.error('.env.local içinde NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SECRET_KEY dolu olmalı (ya da --dry-run).');
  process.exit(1);
}
const supabase = dryRun ? null : createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

function* walk(dir) {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (IMAGE_EXT.test(name) || VIDEO_EXT.test(name)) yield path;
  }
}

async function upload(path, body, contentType) {
  if (dryRun) return;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType, upsert: true, cacheControl: '31536000' });
  if (error) throw new Error(`Yükleme başarısız ${path}: ${error.message}`);
}

async function upsertRow(row) {
  if (dryRun) return;
  const { error } = await supabase.from('media_library').upsert(row, { onConflict: 'storage_bucket,storage_path' });
  if (error) throw new Error(`media_library yazılamadı ${row.storage_path}: ${error.message}`);
}

async function processImage(file, folder, buffer, hash) {
  const source = sharp(buffer).rotate(); // EXIF yönü uygulanır, üst veri atılır
  const meta = await source.metadata();
  const { full, variants } = planWidths(meta.width);
  const paths = imagePaths(folder, hash);

  const fullBuf = await source.clone().resize({ width: full, withoutEnlargement: true }).webp({ quality: WEBP_QUALITY }).toBuffer({ resolveWithObject: true });
  await upload(paths.full, fullBuf.data, 'image/webp');

  const variantMap = {};
  let variantBytes = 0;
  for (const w of variants) {
    const out = await source.clone().resize({ width: w }).webp({ quality: WEBP_QUALITY }).toBuffer();
    await upload(paths.variant(w), out, 'image/webp');
    variantMap[`w${w}`] = paths.variant(w);
    variantBytes += out.length;
  }
  const blur = await source.clone().resize({ width: BLUR_WIDTH }).webp({ quality: 40 }).toBuffer();

  await upsertRow({
    id: uuidFromHash(hash),
    storage_bucket: BUCKET,
    storage_path: paths.full,
    file_name: basename(paths.full),
    mime_type: 'image/webp',
    size_bytes: fullBuf.data.length,
    width: fullBuf.info.width,
    height: fullBuf.info.height,
    blur_data_url: `data:image/webp;base64,${blur.toString('base64')}`,
    alt: altFor(folder),
    folder: folderSlug(folder),
    variants: variantMap,
  });
  return { kind: 'image', source: relative(ROOT, file), path: paths.full, originalBytes: buffer.length, bytes: fullBuf.data.length, variantBytes, width: fullBuf.info.width, height: fullBuf.info.height, variants: Object.keys(variantMap) };
}

async function processVideo(file, folder, buffer, hash) {
  const name = basename(file);
  const path = videoPath(folder, name);
  const mime = mimeFor(name);
  const meta = readVideoMetadata(buffer, name);
  await upload(path, buffer, mime);
  await upsertRow({
    id: uuidFromHash(hash),
    storage_bucket: BUCKET,
    storage_path: path,
    file_name: basename(path),
    mime_type: mime,
    size_bytes: buffer.length,
    width: meta.width,
    height: meta.height,
    duration_ms: meta.durationMs,
    alt: altFor(folder),
    folder: folderSlug(folder),
    variants: {},
  });
  return { kind: 'video', source: relative(ROOT, file), path, originalBytes: buffer.length, bytes: buffer.length, variantBytes: 0, width: meta.width, height: meta.height, durationMs: meta.durationMs, variants: [] };
}

const files = [...walk(ASSETS)].filter((f) => !only || relative(ASSETS, f).startsWith(only));
console.log(`${dryRun ? '[DRY RUN] ' : ''}${files.length} dosya · hedef bucket "${BUCKET}"`);

const seen = new Map();
const results = [];
const failures = [];
let cursor = 0;
async function worker() {
  while (cursor < files.length) {
    const file = files[cursor++];
    const folder = basename(join(file, '..'));
    try {
      const buffer = readFileSync(file);
      const hash = contentHash(buffer);
      if (seen.has(hash)) {
        results.push({ kind: 'duplicate', source: relative(ROOT, file), duplicateOf: seen.get(hash) });
        continue;
      }
      seen.set(hash, relative(ROOT, file));
      const result = IMAGE_EXT.test(file) ? await processImage(file, folder, buffer, hash) : await processVideo(file, folder, buffer, hash);
      results.push(result);
      const saved = result.originalBytes ? Math.round((1 - result.bytes / result.originalBytes) * 100) : 0;
      console.log(`✔ ${result.path}  ${(result.originalBytes / 1024).toFixed(0)} KB → ${(result.bytes / 1024).toFixed(0)} KB (−${saved}%)${result.variants.length ? ' + ' + result.variants.join(',') : ''}`);
    } catch (cause) {
      failures.push({ source: relative(ROOT, file), message: cause.message });
      console.error(`✖ ${relative(ROOT, file)}: ${cause.message}`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const images = results.filter((r) => r.kind === 'image');
const videos = results.filter((r) => r.kind === 'video');
const duplicates = results.filter((r) => r.kind === 'duplicate');
const sum = (list, key) => list.reduce((acc, r) => acc + (r[key] ?? 0), 0);
const manifest = {
  generatedAt: new Date().toISOString(),
  dryRun,
  bucket: BUCKET,
  totals: {
    images: images.length, videos: videos.length, duplicates: duplicates.length, failures: failures.length,
    originalBytes: sum(images, 'originalBytes') + sum(videos, 'originalBytes'),
    fullBytes: sum(images, 'bytes') + sum(videos, 'bytes'),
    variantBytes: sum(images, 'variantBytes'),
  },
  items: results,
  failures,
};
const outDir = join(ROOT, 'supabase/.temp');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'media-manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`\n${images.length} görsel · ${videos.length} video · ${duplicates.length} yinelenen · ${failures.length} hata`);
console.log(`Kaynak ${(manifest.totals.originalBytes / 1048576).toFixed(1)} MB → tam boy ${(manifest.totals.fullBytes / 1048576).toFixed(1)} MB + varyantlar ${(manifest.totals.variantBytes / 1048576).toFixed(1)} MB`);
console.log(`Manifest: supabase/.temp/media-manifest.json`);
process.exit(failures.length ? 1 : 0);
