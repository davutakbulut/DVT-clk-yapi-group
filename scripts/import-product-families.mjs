#!/usr/bin/env node
/**
 * Ürün aileleri içe aktarımı (K-90): ürün sahibinin örnek ürün sayfaları (_archive/prototypes/urun-sayfalari/*.html + csv/) →
 * products.options/facts/short_description/seo_description, product_variants (ölçü tablosu + geometri), product_specs, faqs.
 *   node --env-file=.env.local scripts/import-product-families.mjs _archive/prototypes/urun-sayfalari [--dry] [--only=hea,ipe]
 * Yeniden çalıştırılabilir: ürün slug'ıyla eşlenir, varyant/özellik satırları yenilenir, SSS yalnız hiç yoksa eklenir.
 * İçerik = örnek sayfalardaki standart tablo değerleri (K-75: standart değeri uydurma sayılmaz). EN: yalnız kısa etiketler (grup/alan
 * adları) makine taslağı; özellik ve SSS metinleri TR kalır (EN sayfada gösterilmez, K-08).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const dry = args.includes('--dry');
const only = (args.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!dir || !url || !secret) {
  console.error('Kullanım: node --env-file=.env.local scripts/import-product-families.mjs <örnek sayfalar klasörü> [--dry] [--only=slug,slug]');
  process.exit(1);
}
const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

/** Örnek aile → site ürünü. `split`: grup koduna göre ayrı ürünlere dağıtılır (sac tipleri zaten ayrı ürün). */
const TARGETS = {
  'kutu-profil': { slug: 'kutu-profil', name: 'Kutu Profil' },
  'boru-profil': { slug: 'boru-profil', name: 'Boru Profil' },
  hea: { slug: 'hea', name: 'HEA Profil' },
  heb: { slug: 'heb', name: 'HEB Profil' },
  hem: { slug: 'hem', name: 'HEM Profil' },
  ipe: { slug: 'ipe', name: 'IPE Profil' },
  npi: { slug: 'ipn', name: 'NPI Profil' },
  npu: { slug: 'upn', name: 'NPU Profil' },
  upe: { slug: 'upe', name: 'UPE Profil' },
  kosebent: { slug: 'l-kosebent', name: 'Köşebent' },
  't-profil': { slug: 't-profil', name: 'T Profil', create: { en: 'T Section', slugEn: 't-section' } },
  lama: { slug: 'lama', name: 'Lama', create: { en: 'Flat Bar', slugEn: 'flat-bar' } },
  'ceta-sac': { slug: 'ceta-sac', name: 'Çeta Sac' },
  'trapez-sac': { slug: 'trapez-sac', name: 'Trapez Sac' },
  sac: { split: { DKP: { slug: 'dkp-sac', name: 'DKP Sac' }, HRP: { slug: 'siyah-sac', name: 'Siyah Sac (HRP)' }, GLV: { slug: 'galvaniz-sac', name: 'Galvaniz Sac' }, BKL: { slug: 'baklava-sac', name: 'Baklavalı Sac' } } },
};
/** Kısa etiketlerin İngilizcesi (makine taslağı niteliğinde; panelden düzeltilebilir). */
const EN = {
  Kare: 'Square', Dikdörtgen: 'Rectangular', 'Eşit kenar': 'Equal leg', 'Eşit olmayan': 'Unequal leg', DKP: 'DKP (cold rolled)', 'HRP (siyah)': 'HRP (hot rolled, black)', Galvaniz: 'Galvanised', Baklavalı: 'Chequered',
  Demir: 'Steel', Alüminyum: 'Aluminium', Paslanmaz: 'Stainless', Trapez: 'Trapezoidal', 'Yüksek hadve': 'High rib', 'Sinüs (oluklu)': 'Sinusoidal (corrugated)', 'Kilit geçme': 'Standing seam', 'Deck (döşeme)': 'Deck (floor)',
  'Kesit tipi': 'Section type', 'Ebat (H × B, mm)': 'Size (H × B, mm)', 'Et kalınlığı (mm)': 'Wall thickness (mm)', 'Dış çap (mm)': 'Outer diameter (mm)', Profil: 'Section', 'Kenar tipi': 'Leg type', 'Kenarlar (a × b, mm)': 'Legs (a × b, mm)',
  'Kalınlık (mm)': 'Thickness (mm)', Genişlik: 'Width', Malzeme: 'Material', Kalite: 'Grade', 'Sac tipi': 'Sheet type', 'Profil tipi': 'Profile type', 'Profil (hadve / faydalı genişlik)': 'Profile (rib / effective width)',
  'Kaplama / renk': 'Coating / colour', 'Bir levha': 'One sheet', 'Levha boyu': 'Sheet length',
  Standart: 'Standard', 'Üretim standardı': 'Manufacturing standard', 'Çelik kalitesi': 'Steel grade', 'Stok boyları': 'Stock lengths', 'Stok boyu': 'Stock length', 'Kalınlık aralığı': 'Thickness range', 'Plaka ebatları': 'Plate sizes',
  'Sac tipleri': 'Sheet types', 'Profil tipleri': 'Profile types', Kaplama: 'Coating',
};
const en = (tr) => (EN[tr] ? { tr, en: EN[tr] } : { tr });

// ── CSV (ürün sahibinin biçimi: k;g;s;v;lbl;dim;kg|kgm2;…;d_*) — src/modules/products/domain/productLines.ts ile aynı kurallar
function splitLine(l) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < l.length; i++) {
    const c = l[i];
    if (c === '"') {
      if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (c === ';' && !q) { out.push(cur.trim()); cur = ''; } else cur += c;
  }
  out.push(cur.trim());
  return out;
}
const PROP_KEYS = ['A', 'Ix', 'Iy', 'Wx', 'Wy', 'ix', 'iy', 'I', 'W', 'i', 'iv', 'ey', 'ex', 'e', 'u', 'we', 'coil', 'h', 'p'];
const num = (v) => { const x = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(x) && x > 0 ? x : null; };
function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim());
  const head = splitLine(lines[0]);
  const rows = [];
  for (const line of lines.slice(1)) {
    const c = splitLine(line);
    const col = (n) => { const i = head.indexOf(n); return i >= 0 ? (c[i] ?? '') : ''; };
    const props = {};
    const dims = {};
    head.forEach((h, i) => {
      const x = c[i] ?? '';
      if (!x) return;
      if (h.startsWith('d_')) { const k = h.slice(2); const nn = Number(x.replace(',', '.')); dims[k] = Number.isFinite(nn) && /^[\d.,-]+$/.test(x) ? nn : x; }
      else if (h === 'U') { const v = num(x); if (v) props.u = v; }
      else if (PROP_KEYS.includes(h)) { const v = num(x); if (v) props[h] = v; }
    });
    if (col('dim')) dims.dim = col('dim');
    const v = num(col('v'));
    const g = (k) => (typeof dims[k] === 'number' ? dims[k] : null);
    rows.push({
      stock_code: col('k') || null, variant_group: col('g') ? { code: col('g') } : {}, size_key: col('s') || null, size_label: col('lbl') || col('s') || col('k'),
      height_mm: g('H') ?? g('h') ?? g('a'), width_mm: g('B') ?? g('b') ?? g('D') ?? g('w') ?? g('we'), thickness_mm: v ?? g('t'), length_mm: null,
      kg_per_m: num(col('kg')), kg_per_m2: num(col('kgm2')), props, dims,
    });
  }
  return rows;
}

// ── HTML: CFG (script sabiti) + görünen içerik (DOM)
const browser = await chromium.launch();
const page = await browser.newPage();
async function readSample(file) {
  const html = readFileSync(file, 'utf8');
  const cfg = JSON.parse(/const CFG=(\{.*?\});\n/s.exec(html)[1]);
  await page.setContent(html.replace(/<script[\s\S]*?<\/script>/g, ''));
  const c = await page.evaluate(() => {
    const t = (s) => document.querySelector(s)?.textContent?.trim() ?? '';
    const facts = [...document.querySelectorAll('.facts > div')].map((d) => ({ value: d.querySelector('strong')?.textContent.trim() ?? '', label: [...d.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('') }));
    const specs = [...document.querySelectorAll('.specs > div')].flatMap((g) => { const group = g.querySelector('h3')?.textContent.trim() ?? ''; const dts = [...g.querySelectorAll('dt')]; const dds = [...g.querySelectorAll('dd')]; return dts.map((dt, i) => ({ group, name: dt.textContent.trim(), value: dds[i]?.textContent.trim() ?? '' })); });
    const faqs = [...document.querySelectorAll('.faq details')].map((d) => ({ q: d.querySelector('summary')?.textContent.trim() ?? '', a: d.querySelector('p')?.textContent.trim() ?? '' }));
    return { lede: t('.lede'), desc: document.querySelector('meta[name=description]')?.content ?? '', facts, specs, faqs, tableNote: [...document.querySelectorAll('#tablo .sub')].map((x) => x.textContent.trim()).pop() ?? '' };
  });
  return { cfg, content: c };
}

const SURF_BY_GROUP = { DKP: ['raw', 'red'], GLV: ['galv'], CTA: ['alu'], CTP: ['ss'] };
function buildOptions(cfg, content, groupFilter) {
  const plate = !!cfg.plate;
  const groups = (cfg.groups ?? []).filter((g) => !groupFilter || g.c === groupFilter).map((g) => ({ code: g.c, label: en(g.l) }));
  const o = {
    draw: cfg.draw, pattern: cfg.pattern ?? null, size_ui: cfg.sizeUI ?? 'select', qty_default: cfg.qtyDefault ?? null, unit: 'adet',
    groups, group_label: cfg.groupLabel ? en(cfg.groupLabel) : undefined, size_label: cfg.sizeLabel ? en(cfg.sizeLabel) : undefined, variant_label: cfg.variantLabel ? en(cfg.variantLabel) : undefined,
    grade_label: cfg.gradeLabel ? en(cfg.gradeLabel) : undefined, length_label: cfg.lenLabel ? en(cfg.lenLabel) : undefined, one_label: cfg.oneLabel ? en(cfg.oneLabel) : undefined,
    table_note: content.tableNote ? { tr: content.tableNote } : undefined,
    lengths_m: (cfg.lengths ?? []).map((l) => l.v), custom_length: !plate,
  };
  if (Array.isArray(cfg.grades)) o.grades = cfg.grades;
  else o.grades_by_group = Object.fromEntries(Object.entries(cfg.grades).filter(([k]) => !groupFilter || k === groupFilter));
  if (cfg.formats) o.formats = Object.fromEntries(Object.entries(cfg.formats).filter(([k]) => !groupFilter || k === groupFilter));
  if (cfg.slug !== 'trapez-sac') {
    if (plate) {
      const codes = groups.map((g) => g.code);
      o.surfaces = ['black', 'galv', 'red'];
      o.surfaces_by_group = Object.fromEntries(codes.filter((c) => SURF_BY_GROUP[c]).map((c) => [c, SURF_BY_GROUP[c]]));
    } else o.surfaces = ['black', 'galv', 'red'];
  }
  for (const k of Object.keys(o)) if (o[k] === undefined || o[k] === null) delete o[k];
  return o;
}
const isCountFact = (f) => /^\d+\s+(ölçü|kalınlık|seçenek)$/i.test(f.value);

async function upsertProduct(target, cfg, content, variants, groupFilter) {
  const facts = content.facts.filter((f) => !isCountFact(f)).map((f) => ({ label: en(f.label), value: groupFilter && f.label === 'Sac tipleri' ? en(cfg.groups.find((g) => g.c === groupFilter)?.l ?? f.value) : en(f.value) }));
  const options = buildOptions(cfg, content, groupFilter);
  const { data: existing, error: e0 } = await supabase.from('products').select('id, name, slug, short_description, seo_description, sort_order').eq('slug->>tr', target.slug).maybeSingle();
  if (e0) throw new Error(e0.message);
  const patch = { name: { ...(existing?.name ?? {}), tr: target.name, ...(target.create ? { en: target.create.en } : {}) }, short_description: { ...(existing?.short_description ?? {}), tr: content.lede }, seo_description: { ...(existing?.seo_description ?? {}), tr: content.desc }, options, facts };
  let id = existing?.id;
  console.log(`${target.slug.padEnd(14)} ${existing ? 'güncelle' : 'oluştur '} · ${variants.length} ölçü · ${content.specs.length} özellik · ${content.faqs.length} SSS${dry ? ' (deneme)' : ''}`);
  if (dry) return;
  if (existing) {
    const { error } = await supabase.from('products').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    if (!target.create) throw new Error(`${target.slug}: ürün yok ve oluşturma tanımı yok`);
    const { data: cat } = await supabase.from('product_categories').select('id').eq('slug->>tr', 'celik-profiller').maybeSingle();
    // sort_order tekil (products_sort_order_uq): sona ekle
    const { data: last } = await supabase.from('products').select('sort_order').order('sort_order', { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    const { data, error } = await supabase.from('products').insert({ ...patch, slug: { tr: target.slug, en: target.create.slugEn }, category_id: cat?.id ?? null, status: 'published', published_locales: ['tr'], published_at: new Date().toISOString(), sort_order: (last?.sort_order ?? 0) + 1 }).select('id').single();
    if (error) throw new Error(error.message);
    id = data.id;
  }
  // Varyantlar: yenile
  let r = await supabase.from('product_variants').delete().eq('product_id', id);
  if (r.error) throw new Error(r.error.message);
  for (let i = 0; i < variants.length; i += 200) {
    r = await supabase.from('product_variants').insert(variants.slice(i, i + 200).map((v, j) => ({ ...v, product_id: id, sort_order: i + j + 1 })));
    if (r.error) throw new Error(r.error.message);
  }
  // Özellikler: yenile
  r = await supabase.from('product_specs').delete().eq('product_id', id);
  if (r.error) throw new Error(r.error.message);
  if (content.specs.length) {
    r = await supabase.from('product_specs').insert(content.specs.map((s, i) => ({ product_id: id, group_name: en(s.group), name: en(s.name), value: { tr: s.value }, unit: null, sort_order: i + 1 })));
    if (r.error) throw new Error(r.error.message);
  }
  // SSS: yalnız hiç yoksa
  const { count } = await supabase.from('faqs').select('id', { count: 'exact', head: true }).eq('entity_type', 'product').eq('entity_id', id);
  if (!count && content.faqs.length) {
    r = await supabase.from('faqs').insert(content.faqs.map((f, i) => ({ entity_type: 'product', entity_id: id, question: { tr: f.q }, answer: { tr: f.a }, status: 'published', published_locales: ['tr'], sort_order: i + 1 })));
    if (r.error) throw new Error(r.error.message);
  }
}

for (const file of readdirSync(dir).filter((f) => f.endsWith('.html')).sort()) {
  const fam = file.replace('.html', '');
  const target = TARGETS[fam];
  if (!target) { console.log(`${fam}: hedef tanımsız, atlandı`); continue; }
  const { cfg, content } = await readSample(join(dir, file));
  const rows = parseCsv(readFileSync(join(dir, 'csv', `${fam}.csv`), 'utf8'));
  if (target.split) {
    for (const [code, t] of Object.entries(target.split)) {
      if (only.length && !only.includes(t.slug)) continue;
      await upsertProduct(t, cfg, content, rows.filter((v) => v.variant_group.code === code), code);
    }
  } else {
    if (only.length && !only.includes(target.slug)) continue;
    await upsertProduct(target, cfg, content, rows, null);
  }
}
await browser.close();

const live = process.env.LIVE_URL;
const cron = process.env.CRON_SECRET;
if (!dry && live && cron) {
  const r = await fetch(`${live}/api/cron/revalidate?tags=products`, { headers: { authorization: `Bearer ${cron}` } }).catch(() => null);
  console.log('canlı önbellek:', r ? r.status : 'ulaşılamadı');
}
