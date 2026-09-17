#!/usr/bin/env node
// `supabase db push` sarmalayıcısı: bağlı proje İZİN LİSTESİNDE değilse push'u REDDEDER.
// Neden var: 2026-09-18'de migration'lar aynı hesaptaki BAŞKA bir uygulamanın canlı veritabanına
// uygulandı. Tek koruma dikkat olmamalı — hedef, komut çalışmadan önce makinece doğrulanır.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

// Bu depoya ait Supabase projeleri. Ayrı geliştirme projesi açıldığında buraya eklenir.
const ALLOWED = { exifnifijxnrxagkqwam: 'clk-yapi-group' };

const refFile = new URL('../supabase/.temp/project-ref', import.meta.url);
if (!existsSync(refFile)) {
  console.error('✖ Bağlı proje yok. Önce:\n    supabase link --project-ref exifnifijxnrxagkqwam');
  process.exit(1);
}
const ref = readFileSync(refFile, 'utf8').trim();
if (!(ref in ALLOWED)) {
  console.error(`✖ DURDURULDU: bağlı proje "${ref}" bu depoya ait DEĞİL.\n  İzinli: ${Object.entries(ALLOWED).map(([r, n]) => `${r} (${n})`).join(', ')}\n  Düzeltmek için:  supabase unlink && supabase link --project-ref exifnifijxnrxagkqwam`);
  process.exit(1);
}

console.log(`✔ Hedef: ${ALLOWED[ref]} (${ref})`);
const args = ['db', 'push', ...process.argv.slice(2)];
process.exit(spawnSync('supabase', args, { stdio: 'inherit' }).status ?? 1);
