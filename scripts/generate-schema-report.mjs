#!/usr/bin/env node
// Şema gezgini: migration'ları boş bir PGlite'a uygular, KATALOĞU okur ve tek dosyalık HTML üretir.
// Elle yazılmış doküman değil, veritabanının kendisi konuşur → şemayla asla ayrışmaz.
//   npm run db:report  →  supabase/.temp/schema-report.html
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

const ROOT = new URL('..', import.meta.url).pathname;
const MIGRATIONS = join(ROOT, 'supabase/migrations');
const OUT_DIR = join(ROOT, 'supabase/.temp');
const ROLES = ['anon', 'member', 'viewer', 'sales', 'editor', 'admin', 'super_admin'];

const db = new PGlite();
await db.exec(readFileSync(join(ROOT, 'supabase/tests/helpers/supabase-shim.sql'), 'utf8'));

// Hangi tablo hangi migration'da doğdu → gruplama
const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
const bornIn = new Map();
const list = async () => (await db.query(`select c.relname as name, c.relkind as kind from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','v')`)).rows;
for (const file of files) {
  await db.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  for (const rel of await list()) if (!bornIn.has(rel.name)) bornIn.set(rel.name, { file, kind: rel.kind });
}

const q = async (sql) => (await db.query(sql)).rows;
const columns = await q(`select table_name, column_name, data_type, udt_name, is_nullable, column_default from information_schema.columns where table_schema = 'public' order by table_name, ordinal_position`);
const policies = await q(`select tablename, policyname, cmd, roles::text[] as roles, qual, with_check from pg_policies where schemaname = 'public' order by tablename, policyname`);
const grants = await q(`select table_name, grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and grantee in ('anon','authenticated')`);
const fks = await q(`select conrelid::regclass::text as tbl, confrelid::regclass::text as ref, pg_get_constraintdef(oid) as def from pg_constraint where contype = 'f' and connamespace = 'public'::regnamespace`);
const checks = await q(`select conrelid::regclass::text as tbl, conname, pg_get_constraintdef(oid) as def from pg_constraint where contype = 'c' and connamespace = 'public'::regnamespace`);
const indexes = await q(`select tablename, indexname, indexdef from pg_indexes where schemaname = 'public'`);
const functions = await q(`select n.nspname as schema, p.proname as name, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef as definer, obj_description(p.oid) as doc from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public','app_private') order by 1, 2`);

// Politika metninden KİME uygulandığını çıkar. Katalog iki biçimde saklar: yardımcı prosedürden gelen
// VARIADIC '{a,b}'::text[]  ve elle yazılan has_role('a','b') → VARIADIC ARRAY['a'::text, 'b'::text]
function audience(policy) {
  const text = `${policy.qual ?? ''} ${policy.with_check ?? ''}`;
  const roles = new Set();
  for (const m of text.matchAll(/has_role\(VARIADIC '\{([^}]*)\}'/g)) m[1].split(',').forEach((r) => roles.add(r));
  for (const m of text.matchAll(/has_role\(VARIADIC ARRAY\[([^\]]*)\]/g)) for (const r of m[1].matchAll(/'([a-z_]+)'/g)) roles.add(r[1]);
  if (roles.size > 0) return { kind: 'roles', roles };
  // "user_id = auth.uid()" sahiplik; "auth.uid() IS NOT NULL" ise yalnız "giriş yapmış herkes"
  if (/=\s*\(\s*SELECT auth\.uid\(\)|=\s*auth\.uid\(\)|user_role\(\)/i.test(text)) return { kind: 'own' };
  return { kind: 'everyone' };
}

function access(table) {
  const cell = Object.fromEntries(ROLES.map((r) => [r, { readAll: false, readOwn: false, writeAll: false, writeOwn: false, cond: false }]));
  const granted = (grantee, priv) => grants.some((g) => g.table_name === table && g.grantee === grantee && g.privilege_type === priv);
  for (const policy of policies.filter((p) => p.tablename === table)) {
    const who = audience(policy);
    const reads = ['SELECT', 'ALL'].includes(policy.cmd);
    const writes = ['INSERT', 'UPDATE', 'DELETE', 'ALL'].includes(policy.cmd);
    // Rol kontrolünün ötesinde satır filtresi var mı (ör. status = 'published', is_public, role <> 'member')
    const stripped = (policy.qual ?? '').replace(/\(?\s*SELECT app_private\.has_role\([^)]*\)\s*(AS has_role)?\)?/gi, '').replace(/[()\s]/g, '');
    const conditional = who.kind !== 'own' && stripped !== '' && stripped !== 'true';
    for (const role of ROLES) {
      const dbRole = role === 'anon' ? 'anon' : 'authenticated';
      if (!policy.roles.includes(dbRole)) continue;
      if (who.kind === 'roles' && !who.roles.has(role)) continue;
      if (who.kind === 'own' && role === 'anon') continue;
      const c = cell[role];
      if (reads && granted(dbRole, 'SELECT')) { if (who.kind === 'own') c.readOwn = true; else { c.readAll = true; if (!conditional) c.readAllUnfiltered = true; } }
      if (writes && role !== 'anon' && ['INSERT', 'UPDATE', 'DELETE'].some((p) => granted(dbRole, p))) { if (who.kind === 'own') c.writeOwn = true; else c.writeAll = true; }
    }
  }
  // Tek bir koşulsuz okuma politikası yeter: personel taslakları da görüyorsa "koşullu" değildir.
  for (const role of ROLES) cell[role].cond = cell[role].readAll && !cell[role].readAllUnfiltered;
  return cell;
}

function label(c) {
  if (c.writeAll) return ['w', 'yazar'];
  if (c.readAll && c.writeOwn) return ['c', `${c.cond ? 'koşullu' : 'okur'} · kendi ✎`];
  if (c.readAll) return c.cond ? ['c', 'koşullu'] : ['r', 'okur'];
  if (c.writeOwn) return ['c', 'kendi ✎'];
  if (c.readOwn) return ['c', 'kendi'];
  return ['no', '·'];
}

const GROUP_TITLES = {
  '0001_foundation': 'Kullanıcı & Sistem', '0002_content': 'İçerik', '0003_product_catalog': 'Ürün Kataloğu', '0004_corporate': 'Kurumsal',
  '0005_engagement': 'Etkileşim', '0006_leads': 'Talep', '0007_sales_finance': 'Satış & Finans', '0008_configurator': 'Konfigüratör',
  '0009_platform_services': 'Servis', '0010_analytics': 'Analitik', '0011_slug_resolution': 'Slug çözümleme', '0012_reference_data': 'Referans verisi',
};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const typeOf = (c) => (c.data_type === 'ARRAY' ? `${c.udt_name.replace(/^_/, '')}[]` : c.data_type === 'USER-DEFINED' ? c.udt_name : c.data_type.replace('timestamp with time zone', 'timestamptz').replace('character varying', 'varchar'));
const LOCKED = new Set(['total_cost', 'gross_profit', 'margin_pct', 'unit_cost', 'line_cost', 'line_profit']);

// Migration sırasıyla grupla (0001 → 0012), grup içinde alfabetik
const groups = new Map(files.map((f) => [f.replace('.sql', ''), []]));
for (const [name, info] of [...bornIn].sort()) {
  const key = info.file.replace('.sql', '');
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({ name, ...info });
}

function cellHtml(c) {
  const [cls, text] = label(c);
  return `<td class="${cls}">${text}</td>`;
}

const tableCount = [...bornIn.values()].filter((v) => v.kind === 'r').length;
const sections = [...groups].filter(([, rels]) => rels.length > 0).map(([key, rels]) => `
<section id="${key}">
  <h2><span>${esc(key.slice(0, 4))}</span> ${esc(GROUP_TITLES[key] ?? key)} <small>${rels.length} nesne</small></h2>
  ${rels.map((rel) => {
    const cols = columns.filter((c) => c.table_name === rel.name);
    const a = rel.kind === 'r' ? access(rel.name) : null;
    const pol = policies.filter((p) => p.tablename === rel.name);
    const fk = fks.filter((f) => f.tbl === rel.name);
    const ck = checks.filter((c) => c.tbl === rel.name);
    const ix = indexes.filter((i) => i.tablename === rel.name);
    return `<details class="rel" data-name="${esc(rel.name)}">
      <summary><code>${esc(rel.name)}</code>${rel.kind === 'v' ? '<em>görünüm</em>' : ''}<span class="meta">${cols.length} kolon${pol.length ? ` · ${pol.length} politika` : ''}${fk.length ? ` · ${fk.length} FK` : ''}</span>
        ${a ? `<span class="mini">${ROLES.map((r) => `<i class="${label(a[r])[0]}" title="${r}: ${label(a[r])[1]}"></i>`).join('')}</span>` : ''}</summary>
      <div class="body">
        <table class="cols"><thead><tr><th>Kolon</th><th>Tip</th><th>Boş?</th><th>Varsayılan</th></tr></thead><tbody>
          ${cols.map((c) => `<tr><td><code>${esc(c.column_name)}</code>${LOCKED.has(c.column_name) && rel.kind === 'r' ? ' 🔒' : ''}</td><td>${esc(typeOf(c))}</td><td>${c.is_nullable === 'YES' ? 'evet' : ''}</td><td class="dim">${esc((c.column_default ?? '').slice(0, 60))}</td></tr>`).join('')}
        </tbody></table>
        ${a ? `<h4>Erişim</h4><table class="acc"><thead><tr>${ROLES.map((r) => `<th>${r}</th>`).join('')}</tr></thead><tbody><tr>${ROLES.map((r) => cellHtml(a[r])).join('')}</tr></tbody></table>` : ''}
        ${pol.length ? `<h4>RLS politikaları</h4><ul class="pol">${pol.map((p) => `<li><b>${esc(p.policyname)}</b> <span class="tag">${p.cmd}</span> <span class="tag">${p.roles.join(', ')}</span><pre>${esc(p.qual ?? '')}${p.with_check && p.with_check !== p.qual ? `\nWITH CHECK ${esc(p.with_check)}` : ''}</pre></li>`).join('')}</ul>` : rel.kind === 'r' ? '<p class="closed">Politika yok → API rollerine tamamen kapalı (yalnız güvenilir bağlam / security definer fonksiyon yazar).</p>' : ''}
        ${fk.length ? `<h4>İlişkiler</h4><ul class="plain">${fk.map((f) => `<li>→ <a href="#" data-goto="${esc(f.ref.replace('public.', ''))}"><code>${esc(f.ref)}</code></a> <span class="dim">${esc(f.def)}</span></li>`).join('')}</ul>` : ''}
        ${ck.length ? `<h4>Kısıtlar</h4><ul class="plain">${ck.map((c) => `<li><code>${esc(c.conname)}</code> <span class="dim">${esc(c.def.slice(0, 200))}</span></li>`).join('')}</ul>` : ''}
        ${ix.length ? `<h4>İndeksler</h4><ul class="plain">${ix.map((i) => `<li><code>${esc(i.indexname)}</code> <span class="dim">${esc(i.indexdef.replace(/^CREATE (UNIQUE )?INDEX \S+ ON public\.\S+ USING /, '$1'))}</span></li>`).join('')}</ul>` : ''}
      </div></details>`;
  }).join('')}
</section>`).join('');

const matrix = `<table class="matrix"><thead><tr><th>Tablo</th>${ROLES.map((r) => `<th>${r}</th>`).join('')}</tr></thead><tbody>
${[...groups].filter(([, rels]) => rels.some((r) => r.kind === 'r')).map(([key, rels]) => `<tr class="grp"><td colspan="${ROLES.length + 1}">${esc(GROUP_TITLES[key] ?? key)}</td></tr>` + rels.filter((r) => r.kind === 'r').map((rel) => { const a = access(rel.name); return `<tr data-name="${esc(rel.name)}"><td><a href="#" data-goto="${esc(rel.name)}"><code>${esc(rel.name)}</code></a></td>${ROLES.map((r) => cellHtml(a[r])).join('')}</tr>`; }).join('')).join('')}
</tbody></table>`;

const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>CLK Şema Gezgini</title>
<style>
:root{--bg:#f7f6f4;--fg:#0f1315;--mut:#5c6b75;--line:#d8d3c8;--card:#fff;--acc:#4a6a8c;--r:#dbe7f3;--w:#d6ecd9;--c:#f6ecc9;--no:#f0eeea}
@media (prefers-color-scheme:dark){:root{--bg:#0f1315;--fg:#f0eeea;--mut:#8f9aa3;--line:#2b3a4e;--card:#14181c;--acc:#8fa9c4;--r:#1d3247;--w:#1d3a27;--c:#3d3517;--no:#1a1f24}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.55 ui-sans-serif,system-ui,sans-serif}
header{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line);padding:14px 16px}
header h1{margin:0 0 2px;font-size:19px}header p{margin:0;color:var(--mut);font-size:13px}
.bar{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}input{flex:1 1 220px;padding:8px 10px;border:1px solid var(--line);background:var(--card);color:inherit;font:inherit}
button{padding:8px 12px;border:1px solid var(--line);background:var(--card);color:inherit;font:inherit;cursor:pointer}button[aria-pressed=true]{background:var(--fg);color:var(--bg)}
main{max-width:1180px;margin:0 auto;padding:16px}h2{font-size:17px;margin:28px 0 10px;display:flex;gap:8px;align-items:baseline}h2 span{font:12px ui-monospace,monospace;color:var(--mut)}h2 small{font-weight:400;color:var(--mut);font-size:12px}
h4{margin:16px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut)}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:4px 0 8px}.stats div{background:var(--card);border:1px solid var(--line);padding:10px 12px}.stats b{display:block;font-size:22px}.stats span{color:var(--mut);font-size:12px}
details.rel{background:var(--card);border:1px solid var(--line);margin-bottom:6px}summary{cursor:pointer;padding:9px 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}summary em{font-size:11px;color:var(--acc);font-style:normal;border:1px solid var(--acc);padding:0 5px}
.meta{color:var(--mut);font-size:12px;margin-left:auto}.mini{display:inline-flex;gap:2px}.mini i{width:9px;height:14px;display:block}.body{padding:0 12px 14px;overflow-x:auto}
code{font:13px ui-monospace,SFMono-Regular,monospace}table{border-collapse:collapse;width:100%;font-size:13px}th,td{text-align:left;padding:5px 8px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--mut)}
.dim{color:var(--mut);font-size:12px}.acc td,.matrix td:not(:first-child){text-align:center;font-size:12px;white-space:nowrap}.acc th,.matrix th:not(:first-child){text-align:center;text-transform:none;font-family:ui-monospace,monospace}
td.r,i.r{background:var(--r)}td.w,i.w{background:var(--w)}td.c,i.c{background:var(--c)}td.no,i.no{background:var(--no);color:var(--mut)}
.matrix-wrap{overflow-x:auto;border:1px solid var(--line);background:var(--card)}.matrix tr.grp td{background:var(--bg);font-weight:600;font-size:12px;text-align:left}
.pol{list-style:none;padding:0;margin:0}.pol li{margin-bottom:8px}.tag{font-size:11px;border:1px solid var(--line);padding:0 5px;color:var(--mut)}pre{margin:4px 0 0;padding:8px;background:var(--bg);border:1px solid var(--line);white-space:pre-wrap;word-break:break-word;font:12px ui-monospace,monospace}
.plain{margin:0;padding-left:16px}.closed{color:var(--mut);font-size:13px;border-left:3px solid var(--line);padding-left:10px}a{color:var(--acc)}.legend{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--mut);margin:8px 0}.legend i{display:inline-block;width:12px;height:12px;vertical-align:-2px;margin-right:4px}
[hidden]{display:none!important}
</style></head><body>
<header><h1>CLK Yapı Group — Şema Gezgini</h1><p>Migration'lar boş bir Postgres'e uygulanıp <b>katalogdan</b> üretildi · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC · ${files.length} migration</p>
<div class="bar"><input id="q" type="search" placeholder="Tablo veya kolon ara… (örn. slug, sales, tevkifat→withholding)" aria-label="Ara"><button id="vTables" aria-pressed="true">Tablolar</button><button id="vMatrix" aria-pressed="false">Yetki matrisi</button></div></header>
<main>
<div class="stats"><div><b>${tableCount}</b><span>tablo</span></div><div><b>${[...bornIn.values()].filter((v) => v.kind === 'v').length}</b><span>görünüm</span></div><div><b>${policies.length}</b><span>RLS politikası</span></div><div><b>${fks.length}</b><span>ilişki (FK)</span></div><div><b>${checks.length}</b><span>CHECK kısıtı</span></div><div><b>${indexes.length}</b><span>indeks</span></div><div><b>${functions.length}</b><span>fonksiyon</span></div></div>
<div class="legend"><span><i class="w" style="background:var(--w)"></i>yazar</span><span><i style="background:var(--r)"></i>okur</span><span><i style="background:var(--c)"></i>koşullu / yalnız kendi kaydı</span><span><i style="background:var(--no)"></i>erişemez</span><span>🔒 maliyet/kâr — <code>sales</code> rolüne kapalı</span></div>
<div id="tables">${sections}
<section><h2>Fonksiyonlar <small>${functions.length}</small></h2><div class="matrix-wrap"><table><thead><tr><th>Şema</th><th>Fonksiyon</th><th>Yetki</th></tr></thead><tbody>${functions.map((f) => `<tr><td>${esc(f.schema)}</td><td><code>${esc(f.name)}(${esc(f.args)})</code></td><td>${f.definer ? 'security definer' : ''}</td></tr>`).join('')}</tbody></table></div></section></div>
<div id="matrix" hidden><p class="dim">Politika metinlerinden türetilmiştir. "koşullu" = satır bazlı filtre var (ör. yalnız yayındaki içerik). Satış personeli <code>sales</code> tablosunu değil, maliyet kolonu içermeyen <code>sales_without_cost</code> görünümünü kullanır.</p><div class="matrix-wrap">${matrix}</div></div>
</main>
<script>
const q=document.getElementById('q'),T=document.getElementById('tables'),M=document.getElementById('matrix'),bT=document.getElementById('vTables'),bM=document.getElementById('vMatrix');
function show(m){M.hidden=!m;T.hidden=m;bM.setAttribute('aria-pressed',m);bT.setAttribute('aria-pressed',!m)}
bT.onclick=()=>show(false);bM.onclick=()=>show(true);
q.oninput=()=>{const v=q.value.trim().toLocaleLowerCase('en');document.querySelectorAll('details.rel').forEach(d=>{const hit=!v||d.textContent.toLocaleLowerCase('en').includes(v);d.hidden=!hit;if(v&&hit&&d.dataset.name.includes(v))d.open=true});document.querySelectorAll('.matrix tr[data-name]').forEach(r=>r.hidden=!!v&&!r.dataset.name.includes(v));document.querySelectorAll('#tables section').forEach(s=>{const any=s.querySelector('details.rel:not([hidden])');if(s.querySelector('details.rel'))s.hidden=!any})};
document.addEventListener('click',e=>{const a=e.target.closest('[data-goto]');if(!a)return;e.preventDefault();show(false);q.value='';q.oninput();const d=document.querySelector('details.rel[data-name="'+a.dataset.goto+'"]');if(d){d.open=true;d.scrollIntoView({block:'start',behavior:'smooth'})}});
</script></body></html>`;

mkdirSync(OUT_DIR, { recursive: true });
const out = join(OUT_DIR, 'schema-report.html');
writeFileSync(out, html);
console.log(`✔ ${tableCount} tablo · ${policies.length} politika · ${fks.length} FK → ${out}`);
await db.close();
