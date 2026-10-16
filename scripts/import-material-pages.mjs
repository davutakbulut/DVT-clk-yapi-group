#!/usr/bin/env node
/**
 * Yapı malzemesi ürün sayfaları içe aktarımı (K-114): ürün sahibinin "yeni ürün sayfaları" klasöründeki 17 örnek sayfa →
 * products.options/facts/short_description/seo_description (+ ad), product_variants (ölçü tablosu), product_specs, faqs;
 * sandviç panellerde sayfadaki ürün görseli galeriye (çizim panelinde gösterilir). Çelik hasır mevcut "Çesan" ürününe yazılır.
 *   node --env-file=.env.local scripts/import-material-pages.mjs "yeni ürün sayfaları" [--dry] [--only=tugla,osb]
 * Yeniden çalıştırılabilir: ürün slug'ıyla eşlenir; varyant/özellik/gerçek satırları yenilenir; SSS yalnız hiç yoksa eklenir;
 * görsel içerik-hash kimliğiyle (aynı görsel ikinci kez yüklenmez). Kapaklara dokunulmaz.
 * İçerik = örnek sayfalardaki standart tablo değerleri (K-75: standart değer uydurma sayılmaz). EN: yalnız kısa etiketler makine
 * taslağı; özellik ve SSS metinleri TR (EN sayfada gösterilmez, K-08).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { BLUR_WIDTH, WEBP_QUALITY, contentHash, imagePaths, planWidths, uuidFromHash } from '../src/lib/mediaPipeline.ts';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const dry = args.includes('--dry');
const only = (args.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!dir || !url || !secret) {
  console.error('Kullanım: node --env-file=.env.local scripts/import-material-pages.mjs <klasör> [--dry] [--only=slug,slug]');
  process.exit(1);
}
const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

/** Örnek sayfa → site ürünü (slug TR). `en`: İngilizce ad (verilmezse mevcut korunur). `create`: ürün yoksa açılır. */
const TARGETS = {
  'alcipan-standart': { slug: 'beyaz-alcipan', name: 'Standart Alçıpan', en: 'Standard Plasterboard' },
  'alcipan-yesil': { slug: 'yesil-alcipan', name: 'Nem Dayanımlı Alçıpan', en: 'Moisture-Resistant Plasterboard' },
  'alcipan-kirmizi': { slug: 'kirmizi-alcipan', name: 'Yangına Dayanımlı Alçıpan', en: 'Fire-Resistant Plasterboard' },
  'alcipan-boardex': { slug: 'boardex', name: 'BoardeX', en: 'BoardeX' },
  osb: { slug: 'osb', name: 'OSB' },
  mdf: { slug: 'mdf', name: 'MDF' },
  kontrplak: { slug: 'plywood', name: 'Kontrplak (Plywood)', en: 'Plywood' },
  sunta: { slug: 'sunta', name: 'Sunta' },
  tugla: { slug: 'tugla', name: 'Tuğla' },
  gazbeton: { slug: 'gazbeton', name: 'Gazbeton' },
  bims: { slug: 'bims', name: 'Bims' },
  'tas-yunu': { slug: 'tas-yunu', name: 'Taş Yünü' },
  'cam-yunu': { slug: 'cam-yunu', name: 'Cam Yünü' },
  'sandvic-panel-cati': { slug: 'cati-sandvic-paneli', name: 'Çatı Sandviç Paneli' },
  'sandvic-panel-cephe': { slug: 'cephe-sandvic-paneli', name: 'Cephe Sandviç Paneli' },
  'insaat-demiri': { slug: 'insaat-demiri', name: 'İnşaat Demiri' },
  // Mevcut "Çesan" ürünü (çelik hasırın piyasa adı) doldurulur; adres korunur, ad aramada iki adla da bulunur
  'celik-hasir': { slug: 'cesan', name: 'Çelik Hasır (Çesan)', en: 'Steel Mesh' },
};
/** Kısa etiketlerin İngilizcesi (makine taslağı; panelden düzeltilebilir). */
const EN = {
  'Levha Tipi': 'Board type', Kalınlık: 'Thickness', Ebat: 'Size', 'Kenar Tipi': 'Edge type', Çeşit: 'Type', 'Çekirdek Tipi': 'Core type', 'Yüzey Kaplama / Renk': 'Coating / colour',
  'Hasır Tipi': 'Mesh type', 'Enine Seçenek': 'Transverse option', Tip: 'Type', Çap: 'Diameter', 'Hadve Profili': 'Rib profile', 'Dış Yüzey Sac Kalınlığı': 'Outer sheet thickness', 'İç Yüzey Sac Kalınlığı': 'Inner sheet thickness',
  'Stok kodu': 'Stock code', 'Kalınlık (mm)': 'Thickness (mm)', 'Kalınlık (cm)': 'Thickness (cm)', 'kg/m²': 'kg/m²', 'kg/m² (yüzey)': 'kg/m² (face)', 'Palet (adet)': 'Pallet (pcs)', 'Blok ölçüsü': 'Block size',
  Çekirdek: 'Core', Açıklama: 'Description', 'Çap boy/en (mm)': 'Wire ø long./trans. (mm)', 'Göz boy/en (mm)': 'Mesh long./trans. (mm)', 'Panel ağırlığı (kg)': 'Panel weight (kg)', 'Çap (mm)': 'Diameter (mm)', 'kg/m': 'kg/m', 'Kesit alanı': 'Cross-section area',
  'EPS Çekirdekli': 'EPS core', 'PUR (Poliüretan) Çekirdekli': 'PUR (polyurethane) core', 'PIR (Poliizosiyanurat) Çekirdekli': 'PIR (polyisocyanurate) core', 'Taş Yünü Çekirdekli': 'Stone wool core',
  'Yatay Delikli (Blok) Tuğla': 'Horizontally perforated brick', 'Yığma Tuğla': 'Solid brick', 'Asmolen Tuğla': 'Hollow-pot brick', 'Duvar Bloğu': 'Wall block', Lento: 'Lintel', 'U Blok': 'U block',
  'Boşluklu Bims': 'Hollow pumice block', 'Geçmeli Bims': 'Interlocking pumice block', 'Straforlu Bims (Yalıtımlı)': 'Insulated pumice block', 'Asmolen Bims': 'Hollow-pot pumice block',
  'Q Tipi (Kare Göz)': 'Q type (square mesh)', 'R Tipi (Dikdörtgen)': 'R type (rectangular)', 'TR Tipi (Ters R)': 'TR type (reverse R)', 'Nervürlü (Düz Çubuk)': 'Ribbed (straight bar)', 'Kangal / Rulo (Filmaşin)': 'Coil (wire rod)',
  Standart: 'Standard', 'Yangın sınıfı': 'Fire class', 'λ değeri': 'λ value', 'Servis sıcaklığı': 'Service temperature',
};
const ONE_EN = { Levha: 'One board', Panel: 'One panel', Blok: 'One block' };
const en = (tr) => (tr == null ? undefined : EN[tr] ? { tr, en: EN[tr] } : { tr });
const trOnly = (s) => (s ? { tr: s } : undefined);

// ── HTML: CFG/DATA (script sabitleri) + görünen içerik (DOM)
const browser = await chromium.launch();
const page = await browser.newPage();
async function readPage(file) {
  const html = readFileSync(file, 'utf8');
  const cfgM = /const CFG=(\{.*?\});\n/s.exec(html);
  const dataM = /const DATA=(\[.*?\]);\n/s.exec(html);
  const cfg = cfgM ? JSON.parse(cfgM[1]) : null;
  const data = dataM ? JSON.parse(dataM[1]) : [];
  await page.setContent(html.replace(/<script[\s\S]*?<\/script>/g, ''));
  const c = await page.evaluate(() => {
    const t = (s, root = document) => root.querySelector(s)?.textContent?.trim() ?? '';
    const facts = [...document.querySelectorAll('.facts > div')].map((d) => ({ value: d.querySelector('strong')?.textContent.trim() ?? '', label: [...d.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('') }));
    const specs = [...document.querySelectorAll('.specs > div')].flatMap((g) => { const group = g.querySelector('h3')?.textContent.trim() ?? ''; const dts = [...g.querySelectorAll('dt')]; const dds = [...g.querySelectorAll('dd')]; return dts.map((dt, i) => ({ group, name: dt.textContent.trim(), value: dds[i]?.textContent.trim() ?? '' })); });
    const faqs = [...document.querySelectorAll('.faq details')].map((d) => ({ q: d.querySelector('summary')?.textContent.trim() ?? '', a: d.querySelector('p')?.textContent.trim() ?? '' }));
    const forms = [...document.querySelectorAll('.woolcard')].map((w) => ({ title: t('h3', w), form: t('.wform', w), use: t('.wuse', w) }));
    const cta = document.querySelector('.cta') ? { title: t('.cta h3'), text: t('.cta p') } : null;
    return { lede: t('.lede'), desc: document.querySelector('meta[name=description]')?.content ?? '', facts, specs, faqs, forms, cta, tableNote: [...document.querySelectorAll('#tablo .sub')].map((x) => x.textContent.trim()).pop() ?? '' };
  });
  return { cfg, data, content: c };
}

function buildOptions(cfg, content) {
  const o = { unit: 'adet' };
  if (content.forms.length) {
    o.forms = content.forms.map((f) => ({ title: { tr: f.title }, form: trOnly(f.form) ?? {}, use: trOnly(f.use) ?? {} }));
    if (content.cta) o.forms_cta = { title: trOnly(content.cta.title) ?? {}, text: trOnly(content.cta.text) ?? {} };
  }
  if (!cfg) return o;
  const plate = !!cfg.plate;
  const mesh = cfg.draw === 'mesh';
  Object.assign(o, {
    draw: cfg.draw, size_ui: cfg.sizeUI ?? 'select', qty_default: cfg.qtyDefault ?? null,
    groups: (cfg.groups ?? []).map((g) => ({ code: g.c, label: en(g.l), ...(g.fam ? { family: g.fam } : {}), ...(g.area ? { area: true } : {}), ...(g.quoteOnly ? { quote_only: true } : {}) })),
    group_label: en(cfg.groupLabel), size_label: en(cfg.sizeLabel), variant_label: en(cfg.variantLabel), grade_label: en(cfg.gradeLabel),
    // "Bir levha / Bir panel / Bir blok" (örnek sayfanın birim adı); çubukta varsayılan "Bir boy"
    one_label: plate && cfg.lengths?.[0]?.l ? { tr: `Bir ${cfg.lengths[0].l.toLocaleLowerCase('tr')}`, ...(ONE_EN[cfg.lengths[0].l] ? { en: ONE_EN[cfg.lengths[0].l] } : {}) } : undefined,
    table_note: trOnly(content.tableNote),
    lengths_m: plate ? [] : (cfg.lengths ?? []).map((l) => l.v), custom_length: !plate,
    formats: cfg.formats ?? undefined,
    families: cfg.families ? cfg.families.map((f) => ({ code: f.c, label: en(f.l) })) : undefined,
    family_label: en(cfg.famLabel), default_family: cfg.defaultFam ?? null, default_group_by_family: cfg.defaultGByFam ?? undefined,
    variant_family: cfg.variantFam ?? null, default_group: cfg.defaultG ?? null, default_size: cfg.defaultS ?? null, variant_suffix: cfg.variantSuffix ?? null,
    hide_grade: cfg.hideGrade ? true : undefined, grade_note: trOnly(cfg.gradeNote),
    extras: cfg.extras ? cfg.extras.map((e) => ({ id: e.id, label: en(e.label), ...(Array.isArray(e.options) ? { options: e.options } : { options_by_group: e.options }), ...(e.note ? { note: { tr: e.note } } : {}), ...(e.fam ? { family: e.fam } : {}) })) : undefined,
    pallet_mode: cfg.palletMode ? true : undefined, area_default: cfg.areaDefault ?? null, quote_note: trOnly(cfg.quoteNote),
    swatches: cfg.swatches, core_colors: cfg.coreColors, ral_colors: cfg.ralColors, corrugated: cfg.corrugated ? true : undefined, drawing_photo: cfg.staticImage ? true : undefined,
    // Hasırda "kg" panel ağırlığıdır (kg/m değil) → dims.kg
    cols: (cfg.cols ?? []).map(([k, l, dd, h]) => ({ key: mesh && k === 'kg' ? 'd.kg' : k, label: en(l), ...(dd !== null && dd !== undefined ? { decimals: dd } : {}), ...(h ? { hidden: true } : {}) })),
    value_props: (cfg.props ?? []).map(([k, l, u, dd]) => ({ key: k, label: en(l), unit: u, decimals: dd })),
  });
  if (Array.isArray(cfg.grades)) o.grades = cfg.grades;
  else if (cfg.grades) o.grades_by_group = cfg.grades;
  for (const k of Object.keys(o)) if (o[k] === undefined || o[k] === null) delete o[k];
  return o;
}

function buildVariants(cfg, data) {
  if (!cfg) return [];
  const mesh = cfg.draw === 'mesh';
  const seen = new Map();
  for (const r of data) seen.set(r.k, (seen.get(r.k) ?? 0) + 1);
  return data.map((r) => {
    const d = r.d ?? {};
    const dims = {};
    for (const [k, v] of Object.entries(d)) dims[k] = typeof v === 'boolean' ? (v ? 1 : 0) : v;
    if (r.dim) dims.dim = r.dim;
    if (r.fam) dims.fam = r.fam;
    if (r.palet) dims.palet = r.palet;
    if (r.gozdim) dims.gozdim = r.gozdim;
    if (r.alan) dims.alan = r.alan;
    if (mesh && r.kg) dims.kg = r.kg;
    // Aynı stok kodu iki satırda (hasırda iki göz ölçüsü) → göz ölçüsüyle ayrılır (stock_code tekil)
    const code = seen.get(r.k) > 1 ? `${r.k}-${String(r.gozdim ?? r.g ?? '').replace('/', 'X')}` : r.k;
    const num = (x) => (typeof x === 'number' && x > 0 ? x : null);
    return {
      stock_code: code, variant_group: r.g ? { code: r.g } : {}, size_key: r.s ?? null, size_label: r.lbl,
      thickness_mm: num(r.v) ?? num(d.t), width_mm: num(d.B) ?? num(d.D), height_mm: num(d.H), length_mm: null,
      kg_per_m: mesh ? null : num(r.kg), kg_per_m2: num(r.kgm2), props: {}, dims,
    };
  });
}

// ── Görsel (sandviç panel): sayfadaki ürün görseli → media_library + product_images (galeri başı)
async function put(path, body, contentType) {
  const { error } = await supabase.storage.from('media').upload(path, body, { contentType, upsert: true, cacheControl: '31536000' });
  if (error) throw new Error(`Yükleme başarısız ${path}: ${error.message}`);
}
async function uploadDataUrl(dataUrl, alt) {
  const buf = Buffer.from(dataUrl.split(',', 2)[1], 'base64');
  const src = sharp(buf).rotate();
  const meta = await src.metadata();
  const { full, variants } = planWidths(meta.width ?? 0);
  const hash = contentHash(buf);
  const paths = imagePaths('products', hash);
  const fullBuf = await src.clone().resize({ width: full, withoutEnlargement: true }).webp({ quality: WEBP_QUALITY }).toBuffer({ resolveWithObject: true });
  await put(paths.full, fullBuf.data, 'image/webp');
  const variantMap = {};
  for (const w of variants) {
    const vb = await src.clone().resize({ width: w }).webp({ quality: WEBP_QUALITY }).toBuffer();
    const p = paths.variant(w);
    await put(p, vb, 'image/webp');
    variantMap[String(w)] = p;
  }
  const blur = await src.clone().resize({ width: BLUR_WIDTH }).webp({ quality: 40 }).toBuffer();
  const id = uuidFromHash(hash);
  const { error } = await supabase.from('media_library').upsert(
    { id, storage_bucket: 'media', storage_path: paths.full, file_name: basename(paths.full), mime_type: 'image/webp', size_bytes: fullBuf.data.length, width: fullBuf.info.width, height: fullBuf.info.height, blur_data_url: `data:image/webp;base64,${blur.toString('base64')}`, alt, folder: 'products', variants: variantMap },
    { onConflict: 'storage_bucket,storage_path' },
  );
  if (error) throw new Error(`media_library: ${error.message}`);
  return id;
}

const isCountFact = (f) => /^\d+\s+(ölçü|kalınlık|seçenek|çeşit|tip)$/i.test(f.value);

async function upsertProduct(target, page0) {
  const { cfg, data, content } = page0;
  const options = buildOptions(cfg, content);
  const variants = buildVariants(cfg, data);
  const facts = content.facts.filter((f) => f.value && !isCountFact(f)).map((f) => ({ label: en(f.label) ?? {}, value: { tr: f.value } }));
  const { data: existing, error: e0 } = await supabase.from('products').select('id, name, slug, short_description, seo_description').eq('slug->>tr', target.slug).maybeSingle();
  if (e0) throw new Error(e0.message);
  console.log(`${target.slug.padEnd(22)} ${existing ? 'güncelle' : 'oluştur '} · ${variants.length} ölçü · ${content.specs.length} özellik · ${content.faqs.length} SSS · ${facts.length} gerçek${content.forms.length ? ` · ${content.forms.length} form kartı` : ''}${cfg?.staticImage ? ' · görsel' : ''}${dry ? ' (deneme)' : ''}`);
  if (dry) return;
  const patch = {
    name: { ...(existing?.name ?? {}), tr: target.name, ...(target.en ? { en: target.en } : {}) },
    short_description: { ...(existing?.short_description ?? {}), tr: content.lede },
    seo_description: { ...(existing?.seo_description ?? {}), tr: content.desc },
    options, facts,
  };
  let id = existing?.id;
  if (existing) {
    const { error } = await supabase.from('products').update(patch).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    if (!target.create) throw new Error(`${target.slug}: ürün yok ve oluşturma tanımı yok`);
    const { data: cat } = await supabase.from('product_categories').select('id').eq('slug->>tr', target.create.category).maybeSingle();
    const { data: last } = await supabase.from('products').select('sort_order').order('sort_order', { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    const { data: row, error } = await supabase.from('products').insert({ ...patch, slug: { tr: target.slug, en: target.create.slugEn }, category_id: cat?.id ?? null, status: 'published', published_locales: ['tr'], published_at: new Date().toISOString(), sort_order: (last?.sort_order ?? 0) + 1 }).select('id').single();
    if (error) throw new Error(error.message);
    id = row.id;
  }
  let r = await supabase.from('product_variants').delete().eq('product_id', id);
  if (r.error) throw new Error(r.error.message);
  for (let i = 0; i < variants.length; i += 200) {
    r = await supabase.from('product_variants').insert(variants.slice(i, i + 200).map((v, j) => ({ ...v, product_id: id, sort_order: i + j + 1 })));
    if (r.error) throw new Error(`${target.slug} varyant: ${r.error.message}`);
  }
  r = await supabase.from('product_specs').delete().eq('product_id', id);
  if (r.error) throw new Error(r.error.message);
  if (content.specs.length) {
    r = await supabase.from('product_specs').insert(content.specs.map((s, i) => ({ product_id: id, group_name: en(s.group), name: en(s.name), value: { tr: s.value }, unit: null, sort_order: i + 1 })));
    if (r.error) throw new Error(r.error.message);
  }
  const { count } = await supabase.from('faqs').select('id', { count: 'exact', head: true }).eq('entity_type', 'product').eq('entity_id', id);
  if (!count && content.faqs.length) {
    r = await supabase.from('faqs').insert(content.faqs.map((f, i) => ({ entity_type: 'product', entity_id: id, question: { tr: f.q }, answer: { tr: f.a }, status: 'published', published_locales: ['tr'], sort_order: i + 1 })));
    if (r.error) throw new Error(r.error.message);
  }
  if (cfg?.staticImage) {
    const mediaId = await uploadDataUrl(cfg.staticImage, { tr: `${target.name} — kesit ve yüzey görünümü`, en: `${target.en ?? target.name} — section and face view` });
    const { data: imgs } = await supabase.from('product_images').select('media_id, sort_order').eq('product_id', id).order('sort_order');
    if (!(imgs ?? []).some((x) => x.media_id === mediaId)) {
      const rest = (imgs ?? []).map((x) => x.media_id);
      await supabase.from('product_images').delete().eq('product_id', id);
      r = await supabase.from('product_images').insert([mediaId, ...rest].map((media_id, i) => ({ product_id: id, media_id, sort_order: i + 1 })));
      if (r.error) throw new Error(`product_images: ${r.error.message}`);
    }
  }
}

for (const file of readdirSync(dir).filter((f) => f.endsWith('.html')).sort()) {
  const key = file.replace('.html', '').replace(/\s*\(\d+\)$/, '');
  const target = TARGETS[key];
  if (!target) { console.log(`${key}: hedef tanımsız, atlandı`); continue; }
  if (only.length && !only.includes(target.slug) && !only.includes(key)) continue;
  await upsertProduct(target, await readPage(join(dir, file)));
}
await browser.close();

const live = process.env.LIVE_URL;
const cron = process.env.CRON_SECRET;
if (!dry && live && cron) {
  const res = await fetch(`${live}/api/cron/revalidate?tags=products`, { headers: { authorization: `Bearer ${cron}` } }).catch(() => null);
  console.log('canlı önbellek:', res ? res.status : 'ulaşılamadı');
}
