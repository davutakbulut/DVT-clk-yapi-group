#!/usr/bin/env node
// K-116 · Supabase Storage'daki dosyaları kendi hosting'imize taşır: media → ~/public_html/media, private-documents → ~/storage/private-documents.
// Dosya listesi bir yedekten (backup-export.mjs): media_library (tam boy + varyantlar), job_applications (CV), lead_attachments.
//   node --env-file=.env.local scripts/mysql/migrate-media.mjs backups/<zaman> [--dry]
// Yeniden çalıştırılabilir: taşınanlar backups/<zaman>/media-migrated.json'da tutulur, atlanır. Kişisel veri yazdırılmaz (yalnız yol/sayı).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const dry = process.argv.includes('--dry');
const { NEXT_PUBLIC_SUPABASE_URL: SUPA, SUPABASE_SECRET_KEY: SECRET, CPANEL_HOST: HOST, CPANEL_USER: USER, CPANEL_TOKEN: TOKEN } = process.env;
if (!dir || !SUPA || !SECRET || !HOST || !USER || !TOKEN) {
  console.error('Kullanım: migrate-media.mjs backups/<zaman> [--dry] — NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, CPANEL_* gerekli');
  process.exit(1);
}
const load = (t) => (existsSync(join(dir, `${t}.json`)) ? JSON.parse(readFileSync(join(dir, `${t}.json`), 'utf8')) : []);

const files = new Map(); // "bucket/path" → { bucket, path }
const add = (bucket, path) => path && files.set(`${bucket}/${path}`, { bucket, path });
for (const m of load('media_library')) {
  add(m.storage_bucket, m.storage_path);
  for (const v of Object.values(m.variants ?? {})) add(m.storage_bucket, v);
}
for (const a of load('job_applications')) add(a.cv_bucket, a.cv_path);
for (const a of load('lead_attachments')) add(a.storage_bucket, a.storage_path);

const ROOT = { media: `/home/${USER}/public_html/media`, 'private-documents': `/home/${USER}/storage/private-documents` };
const stateFile = join(dir, 'media-migrated.json');
const done = new Set(existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : []);
const auth = { Authorization: `cpanel ${USER}:${TOKEN}` };
const madeDirs = new Set();

async function mkdirs(full) {
  const home = `/home/${USER}`;
  let cur = home;
  for (const seg of full.slice(home.length + 1).split('/')) {
    const next = `${cur}/${seg}`;
    if (!madeDirs.has(next)) {
      const body = new URLSearchParams({ cpanel_jsonapi_user: USER, cpanel_jsonapi_apiversion: '2', cpanel_jsonapi_module: 'Fileman', cpanel_jsonapi_func: 'mkdir', path: cur, name: seg });
      await fetch(`https://${HOST}:2083/json-api/cpanel`, { method: 'POST', headers: auth, body }); // var olan klasörde hata döner, yok sayılır
      madeDirs.add(next);
    }
    cur = next;
  }
}

let moved = 0;
let failed = 0;
let bytes = 0;
const pending = [...files.values()].filter((f) => !done.has(`${f.bucket}/${f.path}`));
console.log(`${files.size} dosya, ${pending.length} taşınacak${dry ? ' (deneme)' : ''}`);
for (const f of pending) {
  const root = ROOT[f.bucket];
  if (!root || !/^[A-Za-z0-9._/-]+$/.test(f.path) || f.path.includes('..')) {
    console.log(`ATLANDI (bilinmeyen depo ya da güvensiz yol): ${f.bucket}/${f.path}`);
    failed++;
    continue;
  }
  if (dry) continue;
  try {
    const src = f.bucket === 'media' ? `${SUPA}/storage/v1/object/public/media/${f.path}` : `${SUPA}/storage/v1/object/${f.bucket}/${f.path}`;
    const res = await fetch(src, { headers: f.bucket === 'media' ? {} : { Authorization: `Bearer ${SECRET}`, apikey: SECRET } });
    if (!res.ok) throw new Error(`indirme ${res.status}`);
    const body = new Uint8Array(await res.arrayBuffer());
    const target = `${root}/${f.path}`;
    const targetDir = target.slice(0, target.lastIndexOf('/'));
    await mkdirs(targetDir);
    const form = new FormData();
    form.set('dir', targetDir);
    form.set('overwrite', '1');
    form.set('file-1', new Blob([body], { type: res.headers.get('content-type') ?? 'application/octet-stream' }), target.slice(target.lastIndexOf('/') + 1));
    const up = await (await fetch(`https://${HOST}:2083/execute/Fileman/upload_files`, { method: 'POST', headers: auth, body: form })).json();
    if (up.status !== 1) throw new Error(`yükleme reddedildi: ${JSON.stringify(up.errors)}`);
    done.add(`${f.bucket}/${f.path}`);
    writeFileSync(stateFile, JSON.stringify([...done]));
    moved++;
    bytes += body.length;
    if (moved % 20 === 0) console.log(`  ${moved}/${pending.length} (${(bytes / 1048576).toFixed(1)} MB)`);
  } catch (e) {
    failed++;
    console.log(`HATA ${f.bucket}/${f.path}: ${e.message}`);
  }
}
console.log(`Bitti: ${moved} taşındı (${(bytes / 1048576).toFixed(1)} MB), ${failed} hata`);
process.exit(failed ? 1 : 0);
