#!/usr/bin/env node
// Hero scroll videosu (03-RESPONSIVE-ANIMATION › Hero Video Stratejisi): kaynak videodan
//   · masaüstü: her kare keyframe (-g 1) → currentTime scrub takılmaz
//   · telefon: DİKEY kırpım (ekranda zaten yalnız orta şerit görünür) + lanczos ile 1080 px yüksekliğe + hafif keskinleştirme,
//     normal GOP (döngüde seek yok → aynı boyutta daha yüksek kalite). Tablet masaüstü dosyasıyla scrub eder.
//   · poster = videonun İLK karesi (WebP) → poster→video geçişi fark edilmez, LCP posterdir
// üretir, Storage'a yükler, media_library'ye yazar ve AKTİF hero_media kaydına bağlar.
//
//   FFMPEG_PATH=/yol/ffmpeg node --env-file=.env.local scripts/hero-video-build.mjs assets/videos/6-sn-video-2.mp4
//
// ffmpeg PATH'te yoksa FFMPEG_PATH verilir (ör. `npm i ffmpeg-static` ile gelen ikili). Secret key yalnız bu yerel betikte (Kural 4).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { BLUR_WIDTH, contentHash, readVideoMetadata, uuidFromHash } from '../src/lib/mediaPipeline.ts';

const [input] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
if (!input || !url || !secret) {
  console.error('Kullanım: [FFMPEG_PATH=…] node --env-file=.env.local scripts/hero-video-build.mjs <kaynak-video>');
  process.exit(1);
}
const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const BUCKET = 'media';
const FOLDER = 'hero';
const ALT = { tr: 'Çelik ve cam kemerli büyük bir salonun iç görünümü', en: 'Interior of a large hall with steel and glass arches' };

const work = mkdtempSync(join(tmpdir(), 'hero-'));
const run = (args) => execFileSync(ffmpeg, ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
const out = { desktop: join(work, 'desktop.mp4'), mobile: join(work, 'mobile.mp4'), frameD: join(work, 'd.png'), frameM: join(work, 'm.png') };

// Masaüstü: -g 1 (tüm kareler keyframe), ses yok, faststart (moov başta → hemen seek edilebilir)
run(['-i', input, '-an', '-vf', 'scale=1280:-2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-g', '1', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out.desktop]);
// Telefon: yatay 480p'yi dikey ekrana yaymak bulanıklaştırıyordu → kaynağın tam yüksekliği, dikey kırpım, 912×1080
run(['-i', input, '-an', '-vf', 'crop=ih*0.845:ih,scale=912:1080:flags=lanczos,unsharp=5:5:0.6', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out.mobile]);
run(['-i', out.desktop, '-frames:v', '1', out.frameD]);
run(['-i', out.mobile, '-frames:v', '1', out.frameM]);

async function put(path, body, contentType) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType, upsert: true, cacheControl: '31536000' });
  if (error) throw new Error(`Yükleme başarısız ${path}: ${error.message}`);
}
async function row(r) {
  const { error } = await supabase.from('media_library').upsert(r, { onConflict: 'storage_bucket,storage_path' });
  if (error) throw new Error(`media_library yazılamadı ${r.storage_path}: ${error.message}`);
  return r.id;
}
async function video(file, label) {
  const buf = readFileSync(file);
  const hash = contentHash(buf);
  const path = `${FOLDER}/${label}-${hash.slice(0, 12)}.mp4`;
  const meta = readVideoMetadata(buf, 'x.mp4');
  await put(path, buf, 'video/mp4');
  const id = await row({ id: uuidFromHash(hash), storage_bucket: BUCKET, storage_path: path, file_name: basename(path), mime_type: 'video/mp4', size_bytes: buf.length, width: meta.width, height: meta.height, duration_ms: meta.durationMs, alt: ALT, folder: FOLDER, variants: {} });
  console.log(`${label.padEnd(16)} ${(buf.length / 1048576).toFixed(2)} MB  ${meta.width}×${meta.height}  ${meta.durationMs} ms`);
  return { id, durationMs: meta.durationMs };
}
async function poster(file, label) {
  const img = sharp(readFileSync(file));
  const full = await img.clone().webp({ quality: 78 }).toBuffer({ resolveWithObject: true });
  const blur = await img.clone().resize({ width: BLUR_WIDTH }).webp({ quality: 40 }).toBuffer();
  const hash = contentHash(full.data);
  const path = `${FOLDER}/${label}-${hash.slice(0, 12)}.webp`;
  await put(path, full.data, 'image/webp');
  const id = await row({ id: uuidFromHash(hash), storage_bucket: BUCKET, storage_path: path, file_name: basename(path), mime_type: 'image/webp', size_bytes: full.data.length, width: full.info.width, height: full.info.height, blur_data_url: `data:image/webp;base64,${blur.toString('base64')}`, alt: ALT, folder: FOLDER, variants: {} });
  console.log(`${label.padEnd(16)} ${(full.data.length / 1024).toFixed(0)} KB  ${full.info.width}×${full.info.height}`);
  return id;
}

try {
  const d = await video(out.desktop, 'hero-desktop-g1');
  const m = await video(out.mobile, 'hero-mobile-portrait');
  const pd = await poster(out.frameD, 'hero-poster-desktop');
  const pm = await poster(out.frameM, 'hero-poster-mobile');
  const { data: active, error } = await supabase.from('hero_media').select('id, label').eq('is_active', true).maybeSingle();
  if (error || !active) throw new Error(`Aktif hero_media kaydı yok: ${error?.message ?? ''}`);
  const upd = await supabase.from('hero_media').update({ desktop_video_id: d.id, mobile_video_id: m.id, desktop_poster_id: pd, mobile_poster_id: pm, duration_seconds: Number((d.durationMs / 1000).toFixed(2)) }).eq('id', active.id);
  if (upd.error) throw new Error(`hero_media güncellenemedi: ${upd.error.message}`);
  console.log(`\nAktif hero "${active.label}" videoya bağlandı. Önbellek: sitede /admin/pages/home'da Kaydet ya da yeniden dağıtım.`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
