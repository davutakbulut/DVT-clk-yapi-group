#!/usr/bin/env node
/**
 * Ürünlerin eksik içeriğini doldurur (K-115): kısa açıklama, SEO açıklaması, gerçekler, teknik özellikler, SSS, form kartları,
 * açıklama ve kullanım alanları. Veri: scripts/data/product-content-{a,b,c}.mjs.
 *   node --env-file=.env.local scripts/fill-product-content.mjs [--dry] [--only=eps,xps]
 * YALNIZ BOŞ ALANLAR yazılır — panelde girilmiş içerik ezilmez. İstisnalar: kısa açıklama ürün adının aynısıysa ya da birden çok
 * ürünün paylaştığı ortak sac metniyse; HEA'nın yer tutucu kullanım metni ("Çelik Konstrüksiyonlar"). Metinler TR (EN: K-07/K-08
 * gereği insan onaylı çeviri bekler; mevcut EN alanlarına dokunulmaz).
 */
import { createClient } from '@supabase/supabase-js';
import { CONTENT_A } from './data/product-content-a.mjs';
import { CONTENT_B } from './data/product-content-b.mjs';
import { CONTENT_C, TEXTS } from './data/product-content-c.mjs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const only = (args.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error('Kullanım: node --env-file=.env.local scripts/fill-product-content.mjs [--dry] [--only=slug,slug]');
  process.exit(1);
}
const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const FULL = { ...CONTENT_A, ...CONTENT_B, ...CONTENT_C };
const EN = { Malzeme: 'Material', Form: 'Form', Uygulama: 'Application', Ölçüler: 'Dimensions', Ambalaj: 'Packaging', Teslim: 'Delivery', Ölçü: 'Size', Seçim: 'Selection', Teklif: 'Quotation', Standart: 'Standard', Kalınlık: 'Thickness', Kullanım: 'Use', Tür: 'Type', Türler: 'Types', Görev: 'Function', Konum: 'Position', Rulo: 'Roll', Levha: 'Board', Taşıyıcı: 'Carrier', Yüzey: 'Surface', Birleşim: 'Joining', Özellik: 'Property', Bileşen: 'Components', Sınıflar: 'Classes', Çeşit: 'Variety', Gramaj: 'Mass per area', Üretim: 'Manufacture', Çalışma: 'Principle', Taraf: 'Side', Uyum: 'Compatibility', 'λ değeri': 'λ value', 'Basma dayanımı': 'Compressive strength', 'Tane boyu': 'Grain size', 'Dayanım sınıfı': 'Strength class', Dayanım: 'Strength', 'Ek özellik': 'Extra property', 'Uyumlu levha': 'Compatible board' };
const en = (tr) => (EN[tr] ? { tr, en: EN[tr] } : { tr });
const GENERIC_SAC = 'Soğuk haddelenmiş DKP, sıcak haddelenmiş HRP';
const empty = (lt) => !lt || !String(lt.tr ?? '').trim();

const slugs = [...new Set([...Object.keys(FULL), ...Object.keys(TEXTS)])].filter((s) => !only.length || only.includes(s));
let changed = 0;
for (const slug of slugs) {
  const full = FULL[slug];
  const text = TEXTS[slug] ?? {};
  const { data: p, error } = await supabase.from('products').select('id, name, short_description, seo_description, facts, description, usage_areas, options').eq('slug->>tr', slug).maybeSingle();
  if (error) throw new Error(`${slug}: ${error.message}`);
  if (!p) { console.log(`${slug.padEnd(30)} ürün yok, atlandı`); continue; }
  const [{ count: specCount }, { count: faqCount }, { count: varCount }] = await Promise.all([
    supabase.from('product_specs').select('id', { count: 'exact', head: true }).eq('product_id', p.id),
    supabase.from('faqs').select('id', { count: 'exact', head: true }).eq('entity_type', 'product').eq('entity_id', p.id),
    supabase.from('product_variants').select('id', { count: 'exact', head: true }).eq('product_id', p.id),
  ]);
  const patch = {};
  const done = [];
  const shortNew = full?.short ?? text.short;
  const shortTr = String(p.short_description?.tr ?? '').trim();
  // Ad benzeri yer tutucu: boş, ürün adının aynısı ya da cümle olmayan kısa metin ("PU Esaslı Sürme Yalıtım")
  const placeholder = !shortTr || shortTr === String(p.name?.tr ?? '').trim() || (shortTr.length < 60 && !/[.!?]/.test(shortTr));
  if (shortNew && (placeholder || (text.short && shortTr.startsWith(GENERIC_SAC)))) { patch.short_description = { ...(p.short_description ?? {}), tr: shortNew }; done.push('kısa'); }
  if (full?.seo && empty(p.seo_description)) { patch.seo_description = { ...(p.seo_description ?? {}), tr: full.seo }; done.push('seo'); }
  if (full?.facts && !(p.facts ?? []).length) { patch.facts = full.facts.map(([l, v]) => ({ label: en(l), value: { tr: v } })); done.push('gerçek'); }
  const desc = full?.desc ?? text.desc;
  if (desc && empty(p.description)) { patch.description = { ...(p.description ?? {}), tr: desc }; done.push('açıklama'); }
  const usage = full?.usage ?? text.usage;
  if (usage && (empty(p.usage_areas) || (text.usageReplace && String(p.usage_areas?.tr ?? '').trim() === text.usageReplace))) { patch.usage_areas = { ...(p.usage_areas ?? {}), tr: usage }; done.push('kullanım'); }
  const opts = p.options ?? {};
  if (full?.forms && !varCount && !(opts.forms ?? []).length) {
    patch.options = { ...opts, unit: opts.unit ?? 'adet', forms: full.forms.map(([t, f, u]) => ({ title: { tr: t }, form: { tr: f }, use: { tr: u } })), ...(full.cta ? { forms_cta: { title: { tr: full.cta[0] }, text: { tr: full.cta[1] } } } : {}) };
    done.push('form kartları');
  }
  const specRows = full?.specs && !specCount ? full.specs.flatMap(([g, rows]) => rows.map(([n, v]) => ({ g, n, v }))) : [];
  if (specRows.length) done.push(`${specRows.length} özellik`);
  const faqRows = full?.faq && !faqCount ? full.faq : [];
  if (faqRows.length) done.push(`${faqRows.length} SSS`);
  console.log(`${slug.padEnd(30)} ${done.length ? done.join(' · ') : '— (dolu)'}${dry ? ' (deneme)' : ''}`);
  if (dry || !done.length) continue;
  changed++;
  if (Object.keys(patch).length) {
    const r = await supabase.from('products').update(patch).eq('id', p.id);
    if (r.error) throw new Error(`${slug}: ${r.error.message}`);
  }
  if (specRows.length) {
    const r = await supabase.from('product_specs').insert(specRows.map((s, i) => ({ product_id: p.id, group_name: en(s.g), name: en(s.n), value: { tr: s.v }, unit: null, sort_order: i + 1 })));
    if (r.error) throw new Error(`${slug} özellik: ${r.error.message}`);
  }
  if (faqRows.length) {
    const r = await supabase.from('faqs').insert(faqRows.map(([q, a], i) => ({ entity_type: 'product', entity_id: p.id, question: { tr: q }, answer: { tr: a }, status: 'published', published_locales: ['tr'], sort_order: i + 1 })));
    if (r.error) throw new Error(`${slug} SSS: ${r.error.message}`);
  }
}
console.log(`${changed} ürün güncellendi${dry ? ' (deneme — yazılmadı)' : ''}`);
