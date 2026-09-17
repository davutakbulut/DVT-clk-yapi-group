#!/usr/bin/env node
// Kural 1 — "Sıfır statik veri" taraması. Ön yüzde görünen içerik koda gömülmez; veritabanından
// (ya da mikro-metin ise messages/*.json'dan) gelir. Sezgiseldir: şüpheliyi işaretler, insan karar verir.
// Bilinçli istisna satırın SONUNA şu yorumla işaretlenir:  // static-ok: <gerekçe>
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../src/', import.meta.url).pathname;

// 03-ERROR-ISOLATION: global-error next-intl bağlamına erişemez → metin gömülü olmak ZORUNDA.
const ALLOWED_FILES = new Set(['app/global-error.tsx']);

const TR_CHARS = 'çğıöşüÇĞİÖŞÜâîû';
const RULES = [
  // (?<!=)> : ok fonksiyonundaki "=>" etiket kapanışı sayılmaz. Metin "</" ya da "{" ile bitebilir.
  { id: 'jsx-text', tsxOnly: true, test: new RegExp(`(?<!=)>\\s*[^<>{}()=;]*[A-Za-z${TR_CHARS}]{3,}[^<>{}()=;]*(</|\\{)`), why: 'JSX içinde düz metin → t("…") ya da veritabanı' },
  { id: 'tr-literal', test: new RegExp(`(['"\`])[^'"\`]*[${TR_CHARS}][^'"\`]*\\1`), why: 'Kod içinde Türkçe metin → içerik koda gömülmüş olabilir' },
  { id: 'phone', test: /(\+90|\b0)[\s(]*\d{3}[\s)]*\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/, why: 'Sabit telefon numarası → site_settings' },
  { id: 'email', test: /['"`][\w.+-]+@[\w-]+\.[\w.]+['"`]/, why: 'Sabit e-posta → site_settings' },
  { id: 'lorem', test: /lorem ipsum/i, why: 'Yer tutucu metin' },
  { id: 'content-array', test: /\bconst\s+(services|products|projects|testimonials|team|faqs|menu|references|certificates)\s*(:[^=]+)?=\s*\[/i, why: 'İçerik dizisi koda gömülmüş → seed script + veritabanı' },
];

// Log ve hata mesajları ziyaretçiye gösterilmez; aria/test öznitelikleri de içerik değildir.
const IGNORED_LINE = /logger\.(info|warn|error)\(|appError\(|\bmessage:|^\s*(\/\/|\*|\/\*)|static-ok:/;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== '__tests__') yield* walk(path);
    } else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) yield path;
  }
}

const findings = [];
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  if (ALLOWED_FILES.has(rel)) continue;
  readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    if (IGNORED_LINE.test(line)) return;
    const code = line.replace(/\/\/.*$/, ''); // satır sonu yorumları içerik değildir
    for (const rule of RULES) {
      if (rule.tsxOnly && !file.endsWith('.tsx')) continue;
      if (rule.test.test(code)) findings.push({ rel, line: index + 1, rule, text: line.trim() });
    }
  });
}

if (findings.length === 0) {
  console.log('✔ Statik veri taraması temiz');
  process.exit(0);
}
for (const f of findings) console.error(`src/${f.rel}:${f.line}  [${f.rule.id}] ${f.rule.why}\n    ${f.text}`);
console.error(`\n✖ ${findings.length} şüpheli satır. Gerçekten gerekliyse satır sonuna  // static-ok: <gerekçe>  ekleyin.`);
process.exit(1);
