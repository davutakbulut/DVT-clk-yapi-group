#!/usr/bin/env node
/**
 * Ürün ve kategori adlarını başlık düzenine çevirir (K-94): "BETONALTI TRAPEZ SACI" → "Betonaltı Trapez Sacı".
 * Türkçe büyük/küçük harf kuralı (İ→i, I→ı) ve İngilizce ayrı; kısaltmalar (MDF, OSB, XPS, HEA, PVC, HDPE…) olduğu gibi kalır.
 *   node --env-file=.env.local scripts/title-case-product-names.mjs [--dry]
 * Yalnız TAMAMI büyük harf olan adlara dokunur; panelde elle düzenlenmiş karışık adlar korunur.
 */
import { createClient } from '@supabase/supabase-js';
const dry = process.argv.includes('--dry');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const ACRONYMS = new Set(['MDF', 'OSB', 'XPS', 'EPS', 'PVC', 'TPO', 'EPDM', 'HDPE', 'DKP', 'HRP', 'HEA', 'HEB', 'HEM', 'IPE', 'IPN', 'UPE', 'UPN', 'NPI', 'NPU', 'CTP', 'PU', 'T', 'L', 'U', 'I', 'C', 'Z', 'BIMS']);
const SMALL = { tr: new Set(['ve', 'ile', 'veya']), en: new Set(['and', 'or', 'of', 'the', 'on', 'in', 'for']) };
const FIX = { TRAPEZIODAL: 'Trapezoidal', SANDWİCH: 'Sandwich' };
function titleCase(text, locale) {
  const lc = (w) => w.toLocaleLowerCase(locale === 'tr' ? 'tr-TR' : 'en-US');
  const uc = (w) => w.toLocaleUpperCase(locale === 'tr' ? 'tr-TR' : 'en-US');
  return text
    .split(/(\s+|\(|\)|\/|-)/)
    .map((part, i, arr) => {
      if (!part || /^(\s+|\(|\)|\/|-)$/.test(part)) return part;
      if (FIX[part]) return FIX[part];
      if (ACRONYMS.has(part)) return part;
      const word = lc(part);
      const first = arr.slice(0, i).every((x) => !x || /^(\s+|\(|\)|\/|-)$/.test(x));
      if (!first && SMALL[locale]?.has(word)) return word;
      return uc(word.slice(0, 1)) + word.slice(1);
    })
    .join('');
}
const isAllCaps = (s) => typeof s === 'string' && s.trim() && s === s.toLocaleUpperCase('tr-TR') && /[A-ZÇĞİÖŞÜ]{2,}/.test(s);

for (const table of ['products', 'product_categories']) {
  const { data, error } = await supabase.from(table).select('id, slug, name');
  if (error) throw new Error(error.message);
  for (const row of data) {
    const next = { ...row.name };
    let changed = false;
    for (const locale of ['tr', 'en']) {
      const v = row.name?.[locale];
      if (isAllCaps(v)) { const t = titleCase(v, locale); if (t !== v) { next[locale] = t; changed = true; } }
    }
    if (!changed) continue;
    console.log(`${table} ${String(row.slug?.tr ?? row.id).padEnd(30)} ${row.name.tr} → ${next.tr}${next.en !== row.name.en ? ` | ${row.name.en} → ${next.en}` : ''}`);
    if (!dry) {
      const { error: e2 } = await supabase.from(table).update({ name: next }).eq('id', row.id);
      if (e2) throw new Error(e2.message);
    }
  }
}
// E2E artığı ürünler (products.spec silme adımına ulaşamamış koşular)
const { data: leftovers } = await supabase.from('products').select('id, slug').like('slug->>tr', 'e2e-urun-%');
for (const p of leftovers ?? []) {
  console.log('E2E artığı silindi:', p.slug.tr);
  if (!dry) await supabase.from('products').delete().eq('id', p.id);
}
const live = process.env.LIVE_URL, cron = process.env.CRON_SECRET;
if (!dry && live && cron) { const r = await fetch(`${live}/api/cron/revalidate?tags=products`, { headers: { authorization: `Bearer ${cron}` } }).catch(() => null); console.log('canlı önbellek:', r ? r.status : 'ulaşılamadı'); }
