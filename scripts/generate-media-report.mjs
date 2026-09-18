#!/usr/bin/env node
// Faz 3 · media_library'nin tarayıcıda görülebilen hâli: klasör klasör galeri, varyantlar, boyutlar.
// Anonim anahtarla okur (media_library ve media bucket'ı herkese açık) — secret gerekmez.
//
//   node --env-file=.env.local scripts/generate-media-report.mjs   →  supabase/.temp/media-report.html
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT_DIR = join(ROOT, 'supabase/.temp');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error('.env.local içinde NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY dolu olmalı.');
  process.exit(1);
}
const supabase = createClient(url, anon, { auth: { persistSession: false } });

const { data: rows, error } = await supabase.from('media_library').select('*').order('folder').order('file_name');
if (error) {
  console.error('media_library okunamadı:', error.message);
  process.exit(1);
}
const manifestPath = join(OUT_DIR, 'media-manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
const originalBytesByPath = new Map((manifest?.items ?? []).filter((i) => i.path).map((i) => [i.path, i.originalBytes]));

const publicUrl = (path) => supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const folders = [...new Set(rows.map((r) => r.folder ?? '(kök)'))];
const images = rows.filter((r) => r.mime_type.startsWith('image/'));
const videos = rows.filter((r) => r.mime_type.startsWith('video/'));
const totalBytes = rows.reduce((a, r) => a + Number(r.size_bytes), 0);
const originalTotal = manifest?.totals?.originalBytes ?? null;

const card = (r) => {
  const isImage = r.mime_type.startsWith('image/');
  const thumb = isImage ? publicUrl(r.variants?.w480 ?? r.storage_path) : null;
  const original = originalBytesByPath.get(r.storage_path);
  const variants = Object.entries(r.variants ?? {}).map(([k, p]) => `<a href="${esc(publicUrl(p))}" target="_blank">${esc(k)}</a>`).join(' · ');
  return `<figure class="card">
    ${isImage
      ? `<a href="${esc(publicUrl(r.storage_path))}" target="_blank"><img src="${esc(thumb)}" alt="${esc(r.alt?.tr ?? '')}" loading="lazy" width="${r.width ?? ''}" height="${r.height ?? ''}" style="background-image:url('${r.blur_data_url ?? ''}')"></a>`
      : `<video src="${esc(publicUrl(r.storage_path))}" controls preload="metadata" muted playsinline></video>`}
    <figcaption>
      <code>${esc(r.storage_path)}</code>
      <div class="meta">${r.width ?? '?'}×${r.height ?? '?'}${r.duration_ms ? ` · ${(r.duration_ms / 1000).toFixed(1)} sn` : ''} · ${kb(r.size_bytes)}${original ? ` <span class="from">(kaynak ${kb(original)})</span>` : ''}</div>
      ${variants ? `<div class="variants">${variants}</div>` : ''}
      <div class="alt">alt: ${esc(JSON.stringify(r.alt))}</div>
    </figcaption>
  </figure>`;
};

const html = `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Medya Kütüphanesi Raporu — CLK Yapı Group</title>
<style>
  :root{color-scheme:light dark;font-family:system-ui,sans-serif}
  body{margin:0;padding:24px;max-width:1400px;margin-inline:auto}
  h1{margin:0 0 4px}h2{margin:32px 0 12px;font-size:1.1rem}
  .summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:16px 0 8px}
  .stat{border:1px solid color-mix(in srgb,currentColor 20%,transparent);border-radius:10px;padding:12px}
  .stat b{display:block;font-size:1.5rem}.stat span{opacity:.7;font-size:.85rem}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
  .card{margin:0;border:1px solid color-mix(in srgb,currentColor 15%,transparent);border-radius:10px;overflow:hidden;font-size:.8rem}
  .card img,.card video{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background-size:cover;background-color:#8883}
  figcaption{padding:8px 10px;display:grid;gap:3px}code{font-size:.72rem;word-break:break-all}
  .meta{opacity:.85}.from{opacity:.6}.variants a{margin-right:2px}.alt{opacity:.6;font-size:.72rem}
  nav a{margin-right:12px}
</style></head><body>
<h1>Medya Kütüphanesi</h1>
<p><small>Üretildi: ${new Date().toISOString()} · kaynak: <code>public.media_library</code> + <code>storage/media</code> (anonim anahtar)</small></p>
<div class="summary">
  <div class="stat"><b>${rows.length}</b><span>kayıt</span></div>
  <div class="stat"><b>${images.length}</b><span>görsel (WebP)</span></div>
  <div class="stat"><b>${videos.length}</b><span>video</span></div>
  <div class="stat"><b>${folders.length}</b><span>klasör</span></div>
  <div class="stat"><b>${mb(totalBytes)}</b><span>tam boy toplam${originalTotal ? ` (kaynak ${mb(originalTotal)})` : ''}</span></div>
  ${manifest ? `<div class="stat"><b>${mb(manifest.totals.variantBytes)}</b><span>varyantlar (480/960/1440)</span></div>` : ''}
</div>
<nav>${folders.map((f) => `<a href="#${esc(f)}">${esc(f)}</a>`).join('')}</nav>
${folders.map((f) => {
  const list = rows.filter((r) => (r.folder ?? '(kök)') === f);
  return `<h2 id="${esc(f)}">${esc(f)} <small>(${list.length})</small></h2><div class="grid">${list.map(card).join('')}</div>`;
}).join('')}
</body></html>`;

mkdirSync(OUT_DIR, { recursive: true });
const out = join(OUT_DIR, 'media-report.html');
writeFileSync(out, html);
console.log(`✔ ${rows.length} kayıt → ${out}`);
