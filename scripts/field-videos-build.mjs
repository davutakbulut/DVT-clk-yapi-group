#!/usr/bin/env node
/**
 * Sahadan Videolar — firmanın KENDİ saha fotoğraflarından dikey (9:16) derleme videoları üretir, Storage'a yükler ve
 * `field_videos` satırlarını yazar (K-77). Uydurma içerik yok: görüntüler `assets/` altındaki gerçek iş fotoğraflarıdır;
 * başlıklar yalnız görüneni adlandırır (yer, metrekare, müşteri gibi doğrulanamayan bilgi yazılmaz).
 *
 * Yeniden çalıştırılabilir: kimlikler içerikten türetilir (aynı girdi → aynı satır), panelden yapılan düzenleme ezilmez.
 * Kullanım: [FFMPEG_PATH=…] node --env-file=.env.local scripts/field-videos-build.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { BLUR_WIDTH, contentHash, readVideoMetadata, uuidFromHash } from '../src/lib/mediaPipeline.ts';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
if (!url || !secret) {
  console.error('Kullanım: [FFMPEG_PATH=…] node --env-file=.env.local scripts/field-videos-build.mjs');
  process.exit(1);
}
const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const BUCKET = 'media';
const FOLDER = 'field-videos';
const W = 720;
const H = 1280;
const FPS = 25;
const HOLD = 3; // sn / fotoğraf
const FADE = 0.6;
const WA = 'WhatsApp Image 2026-09-13 at ';
const CAPTION = { tr: 'Saha fotoğraflarımızdan derleme', en: 'Compiled from our site photos' };

const SETS = [
  {
    key: 'mezzanine',
    dir: 'assets/ÇELİK KONSTRÜKSİYON',
    title: { tr: 'Mevcut yapı içinde çelik ara kat', en: 'Steel mezzanine inside an existing building' },
    alt: { tr: 'Taş duvarlı bir yapının içinde kırmızı astarlı çelik kolon ve kirişlerden kurulan ara kat', en: 'Mezzanine of red-primed steel columns and beams inside a stone-walled building' },
    files: ['16.41.28', '16.41.29 (2)', '16.41.30 (5)', '16.42.54 (1)', '16.42.56 (5)', '16.42.57 (5)', '16.42.56 (7)', '16.42.56 (1)'].map((n) => `${WA}${n}.jpeg`),
  },
  {
    key: 'hall-frame',
    dir: 'assets/ÇELİK KONSTRÜKSİYON',
    title: { tr: 'Çelik hol karkası montajı', en: 'Steel hall frame erection' },
    alt: { tr: 'Açık arazide beton temeller üzerinde yükselen siyah çelik hol karkası ve mobil vinç', en: 'Black steel hall frame rising on concrete footings with a mobile crane' },
    files: ['16.45.26 (4)', '16.47.11 (1)', '16.47.43 (1)', '16.48.14 (1)', '16.48.43 (2)', '16.48.44 (3)', '16.48.44', '16.49.22 (4)'].map((n) => `${WA}${n}.jpeg`),
  },
  {
    key: 'roof-terrace',
    dir: 'assets/ÇELİK KONSTRÜKSİYON',
    title: { tr: 'Çatı katında çelik teras konstrüksiyonu', en: 'Steel terrace structure at roof level' },
    alt: { tr: 'Betonarme binanın çatı katında kurulan açık renk boyalı çelik çerçeve', en: 'Light-painted steel frame erected on the roof level of a concrete building' },
    files: ['2a253cfe-5373-457a-86b6-b91490d8da90', '6e790638-3bec-462a-b692-576cf6793983', 'ac3da529-36aa-4a14-b399-31ca5728d315', 'bdc57757-6814-48be-b13c-4257e0ba0d71', 'e714e7be-6ea2-47d3-b5b7-6b9c91f06f0c', 'f4b60f24-44fc-4221-a9e3-392bf5e62d43'].map((n) => `${n}.jpg`),
  },
  {
    key: 'box-section-framing',
    dir: 'assets/KUTU PROFİL',
    title: { tr: 'Kutu profil karkas uygulamaları', en: 'Box-section framing applications' },
    alt: { tr: 'Kolon ve duvar çevresinde kırmızı astarlı kutu profilden kurulan kaplama karkası', en: 'Cladding sub-frame of red-primed box sections around columns and walls' },
    files: ['08b44aed-aca5-4df8-a145-e37a89c5aa95', '294ad5d4-135e-4987-8bb6-e6cebbf0d7d3', '55b91d7d-0f98-4ba4-952f-6c343ea918c8', '69df29eb-a619-4c5a-89b0-c8c8c6b43b8a', '7d1517ef-0257-4053-8a19-91ae62e34cae', '0489868f-81c7-4c1e-a69e-37c06d294681'].map((n) => `${n}.jpg`),
  },
];

const work = mkdtempSync(join(tmpdir(), 'field-videos-'));
const run = (args) => execFileSync(ffmpeg, ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });

/** Fotoğraflar → yavaş yakınlaşma + çapraz geçişli dikey MP4 (ses yok, faststart). */
async function build(set) {
  const inputs = [];
  for (const [i, file] of set.files.entries()) {
    const frame = join(work, `${set.key}-${i}.jpg`);
    // 2× boyutta hazırla: zoompan tam sayı piksele yuvarlar, küçük kaynakta titreme yapar
    await sharp(join(set.dir, file)).rotate().resize(W * 2, H * 2, { fit: 'cover', position: 'attention' }).jpeg({ quality: 90 }).toFile(frame);
    inputs.push(frame);
  }
  const frames = HOLD * FPS;
  const filters = inputs.map((_, i) => `[${i}:v]zoompan=z='min(zoom+0.0007,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${W}x${H}:fps=${FPS},format=yuv420p[v${i}]`);
  let last = 'v0';
  for (let i = 1; i < inputs.length; i++) {
    const out = i === inputs.length - 1 ? 'out' : `x${i}`;
    filters.push(`[${last}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${(i * (HOLD - FADE)).toFixed(2)}[${out}]`);
    last = out;
  }
  const mp4 = join(work, `${set.key}.mp4`);
  run([...inputs.flatMap((f) => ['-i', f]), '-filter_complex', filters.join(';'), '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4]);
  return { mp4, poster: inputs[0] };
}

async function put(path, body, contentType) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType, upsert: true, cacheControl: '31536000' });
  if (error) throw new Error(`Yükleme başarısız ${path}: ${error.message}`);
}
async function mediaRow(r) {
  const { error } = await supabase.from('media_library').upsert(r, { onConflict: 'storage_bucket,storage_path' });
  if (error) throw new Error(`media_library yazılamadı ${r.storage_path}: ${error.message}`);
  return r.id;
}

try {
  for (const [index, set] of SETS.entries()) {
    const built = await build(set);
    const video = readFileSync(built.mp4);
    const vHash = contentHash(video);
    const vPath = `${FOLDER}/${set.key}-${vHash.slice(0, 12)}.mp4`;
    const meta = readVideoMetadata(video, 'x.mp4');
    await put(vPath, video, 'video/mp4');
    const videoId = await mediaRow({ id: uuidFromHash(vHash), storage_bucket: BUCKET, storage_path: vPath, file_name: basename(vPath), mime_type: 'video/mp4', size_bytes: video.length, width: meta.width, height: meta.height, duration_ms: meta.durationMs, alt: set.alt, folder: FOLDER, variants: {} });

    const img = sharp(readFileSync(built.poster)).resize(W, H);
    const full = await img.clone().webp({ quality: 78 }).toBuffer({ resolveWithObject: true });
    const blur = await img.clone().resize({ width: BLUR_WIDTH }).webp({ quality: 40 }).toBuffer();
    const pHash = contentHash(full.data);
    const pPath = `${FOLDER}/${set.key}-poster-${pHash.slice(0, 12)}.webp`;
    await put(pPath, full.data, 'image/webp');
    const posterId = await mediaRow({ id: uuidFromHash(pHash), storage_bucket: BUCKET, storage_path: pPath, file_name: basename(pPath), mime_type: 'image/webp', size_bytes: full.data.length, width: full.info.width, height: full.info.height, blur_data_url: `data:image/webp;base64,${blur.toString('base64')}`, alt: set.alt, folder: FOLDER, variants: {} });

    // Satır kimliği set anahtarından: yeniden çalıştırma çoğaltmaz; var olan satırda yalnız medya bağları güncellenir (panel metni ezilmez)
    const id = uuidFromHash(contentHash(Buffer.from(`field-video:${set.key}`)));
    const { data: existing } = await supabase.from('field_videos').select('id').eq('id', id).maybeSingle();
    const { error } = existing
      ? await supabase.from('field_videos').update({ video_id: videoId, poster_id: posterId }).eq('id', id)
      : await supabase.from('field_videos').insert({ id, title: set.title, caption: CAPTION, source: 'upload', video_id: videoId, poster_id: posterId, is_active: true, sort_order: index + 1 });
    if (error) throw new Error(`field_videos yazılamadı (${set.key}): ${error.message}`);
    console.log(`${set.key.padEnd(22)} ${(video.length / 1048576).toFixed(2)} MB  ${meta.width}×${meta.height}  ${(meta.durationMs / 1000).toFixed(1)} sn  ${existing ? 'güncellendi' : 'eklendi'}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
