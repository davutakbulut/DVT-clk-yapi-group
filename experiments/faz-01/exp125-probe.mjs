// ============================================================
// DENEY #1, #2, #5 — kanarya uygulamasına (localhost:3100, next start) karşı sonda
// ============================================================
import { writeFileSync } from 'node:fs';
const BASE = 'http://localhost:3100';

async function hit(path) {
  const r = await fetch(BASE + path, { redirect: 'manual' });
  const body = r.headers.get('content-type')?.includes('image') ? Buffer.from(await r.arrayBuffer()) : await r.text();
  return { status: r.status, cache: r.headers.get('x-nextjs-cache'), loc: r.headers.get('location'), rewrite: r.headers.get('x-middleware-rewrite'), body };
}
const row = (label, v) => console.log('   ' + label.padEnd(46), v);
const stamp = (html) => /data-testid="rendered-at">([^<]+)</.exec(html)?.[1] ?? '-';

console.log('\n══ VARSAYIM #1 — middleware rewrite, ISR önbellek isabetini koruyor mu?');
const ext1 = await hit('/tr/projeler/fabrika-celik-cati');
const ext2 = await hit('/tr/projeler/fabrika-celik-cati');
row('DIŞ yol 1. istek  → durum / x-nextjs-cache', `${ext1.status} / ${ext1.cache}`);
row('DIŞ yol 2. istek  → durum / x-nextjs-cache', `${ext2.status} / ${ext2.cache}`);
row('render zaman damgası aynı mı (build anı)?', stamp(ext1.body) === stamp(ext2.body) ? `EVET (${stamp(ext1.body)})` : 'HAYIR — her istekte yeniden render');
const inner = await hit('/tr/projects/fabrika-celik-cati');
row('İÇ yol doğrudan   → durum / location', `${inner.status} / ${inner.loc}`);
const od1 = await hit('/tr/projeler/on-demand-deneme');
const od2 = await hit('/tr/projeler/on-demand-deneme');
row('ön-üretilmemiş slug 1. istek (on-demand ISR)', `${od1.status} / ${od1.cache}`);
row('ön-üretilmemiş slug 2. istek', `${od2.status} / ${od2.cache}`);
const v1 = ext1.cache === 'HIT' && ext2.cache === 'HIT' && od2.cache === 'HIT';
console.log('   ⇒', v1 ? 'YEREL: DOĞRULANDI ✅ (Vercel edge için x-vercel-cache ilk dağıtımda ayrıca bakılacak)' : 'BAŞARISIZ ❌');

console.log('\n══ VARSAYIM #2 — geçirgen kök layout + kök not-found.tsx');
const home = await hit('/');
row('/                 → durum / location', `${home.status} / ${home.loc}`);
const tr = await hit('/tr');
row('/tr               → durum / <html lang>', `${tr.status} / ${/<html[^>]*lang="([^"]+)"/.exec(tr.body)?.[1]}`);
const en = await hit('/en');
row('/en               → durum / <html lang>', `${en.status} / ${/<html[^>]*lang="([^"]+)"/.exec(en.body)?.[1]}`);
const l404 = await hit('/tr/olmayan-route');
row('/tr/olmayan-route → durum / hangi 404', `${l404.status} / ${l404.body.includes('locale-404') ? 'DİLLİ 404' : l404.body.includes('root-404') ? 'KÖK 404' : '?'}`);
const e404 = await hit('/en/olmayan-route');
row('/en/olmayan-route → durum / metin', `${e404.status} / ${/locale-404">([^<]+)</.exec(e404.body)?.[1]}`);
const bare = await hit('/olmayan-route');
row('/olmayan-route    → durum / location', `${bare.status} / ${bare.loc}`);
const dotted = await hit('/olmayan.dosya');
row('/olmayan.dosya (matcher dışı) → durum / 404', `${dotted.status} / ${dotted.body.includes('root-404') ? 'KÖK 404' : '?'}`);
row('kök 404 tek <html> mi (çift sarma yok)?', (dotted.body.match(/<html/g) ?? []).length === 1 ? 'EVET' : 'HAYIR — ' + (dotted.body.match(/<html/g) ?? []).length);
const bad = await hit('/de/herhangi');
row('/de/herhangi (geçersiz locale) → durum / loc', `${bad.status} / ${bad.loc}`);
const v2 = tr.status === 200 && l404.status === 404 && l404.body.includes('locale-404') && dotted.status === 404 && dotted.body.includes('root-404');
console.log('   ⇒', v2 ? 'DOĞRULANDI ✅' : 'BAŞARISIZ ❌');

console.log('\n══ VARSAYIM #5 — next/og varsayılan fontu Türkçe glifleri kapsıyor mu?');
const og = await hit('/tr/og-test/opengraph-image');
row('opengraph-image   → durum / boyut', `${og.status} / ${og.body.length} byte`);
if (og.status === 200) { writeFileSync('exp5-og-output.png', og.body); row('kaydedildi', 'experiments/faz-01/exp5-og-output.png  (GÖZLE bakılacak)'); }
