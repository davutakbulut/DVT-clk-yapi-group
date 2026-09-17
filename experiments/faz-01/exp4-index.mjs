// ============================================================
// DENEY #4 — RPC'deki OR dallanması locale başına ifade indeksini kullanıyor mu?
// Karşılaştırma: (A) OR dallanması  (B) CASE ifadesi  (C) PL/pgSQL IF ile iki ayrı sorgu
// Motor: PGlite = gerçek Postgres'in WASM derlemesi (planlayıcı aynı).
// ============================================================
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const ver = await db.query('select version()');
console.log('Motor:', ver.rows[0].version.split(' on ')[0], '\n');

await db.exec(`
  create table projects (
    id                uuid primary key default gen_random_uuid(),
    slug              jsonb not null,
    published_locales text[] not null default '{}',
    body              text
  );
  insert into projects (slug, published_locales, body)
  select jsonb_build_object('tr', 'proje-' || g, 'en', 'project-' || g),
         '{tr,en}', repeat('x', 200)
  from generate_series(1, 50000) g;

  create unique index projects_slug_tr_uq on projects ((slug->>'tr')) where slug->>'tr' is not null;
  create unique index projects_slug_en_uq on projects ((slug->>'en')) where slug->>'en' is not null;
  analyze projects;
`);

async function plan(label, sql, params) {
  // generic plan: fonksiyon içindeki parametreli sorgunun gerçek davranışı budur
  await db.exec(`set plan_cache_mode = force_generic_plan;`);
  const name = 'q' + Math.random().toString(36).slice(2, 8);
  await db.exec(`prepare ${name}(text, text) as ${sql}`);
  const r = await db.query(`explain (analyze, buffers, costs off, timing off) execute ${name}('${params[0]}', '${params[1]}')`);
  const lines = r.rows.map((x) => x['QUERY PLAN']);
  const text = lines.join('\n');
  const usesIndex = /Index Scan|Bitmap Index Scan|Index Only Scan/.test(text);
  const seq = /Seq Scan/.test(text);
  console.log(`── ${label}`);
  for (const l of lines) console.log('   ' + l);
  console.log(`   ⇒ ${usesIndex && !seq ? 'İNDEKS KULLANILIYOR ✅' : 'TAM TABLO TARAMASI ❌'}\n`);
  return usesIndex && !seq;
}

const A = await plan('A) OR dallanması (dokümandaki tasarım) — generic plan',
  `select id from projects p
   where ($1 = 'tr' and p.slug->>'tr' = $2)
      or ($1 = 'en' and p.slug->>'en' = $2)`, ['tr', 'proje-4242']);

const B = await plan('B) CASE ifadesi (yasak dediğimiz biçim) — generic plan',
  `select id from projects p
   where (case when $1 = 'tr' then p.slug->>'tr' else p.slug->>'en' end) = $2`, ['tr', 'proje-4242']);

const C1 = await plan('C) IF ile bölünmüş — yalnız TR dalı',
  `select id from projects p where $1 = 'tr' and p.slug->>'tr' = $2`, ['tr', 'proje-4242']);

// A'nın custom plan (parametre değerleri biliniyor) hâli
await db.exec(`set plan_cache_mode = force_custom_plan;`);
const r = await db.query(`explain (analyze, buffers, costs off, timing off)
  select id from projects p
  where ('tr' = 'tr' and p.slug->>'tr' = 'proje-4242')
     or ('tr' = 'en' and p.slug->>'en' = 'proje-4242')`);
const customText = r.rows.map((x) => x['QUERY PLAN']).join('\n');
console.log('── A′) OR dallanması — custom plan (sabitler katlanmış)');
for (const l of customText.split('\n')) console.log('   ' + l);
const A2 = /Index/.test(customText) && !/Seq Scan/.test(customText);
console.log(`   ⇒ ${A2 ? 'İNDEKS KULLANILIYOR ✅' : 'TAM TABLO TARAMASI ❌'}\n`);

console.log('════════ ÖZET ════════');
console.log('A  OR (generic) :', A ? '✅ indeks' : '❌ seq scan');
console.log('A′ OR (custom)  :', A2 ? '✅ indeks' : '❌ seq scan');
console.log('B  CASE         :', B ? '✅ indeks' : '❌ seq scan');
console.log('C  IF ile bölme :', C1 ? '✅ indeks' : '❌ seq scan');
