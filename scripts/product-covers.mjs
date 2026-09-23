#!/usr/bin/env node
/**
 * Ürün kapak + galeri görselleri — firmanın KENDİ saha fotoğraflarından (assets/). Uydurma/stok görsel yok (K-75, K-77).
 * Eşleme dosyası: { "<slug-tr>": ["kapak.jpg", "galeri1.jpg", …] } (yollar assets/ altındaki klasöre göre).
 *   node --env-file=.env.local scripts/product-covers.mjs <eşleme.json> "<assets klasörü>"
 * Aynı boru hattı (WebP tam boy + 480/960/1440 varyant + blur), media/products/ klasörü, kararlı içerik-hash kimliği → yeniden çalıştırılabilir.
 */
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { BLUR_WIDTH, WEBP_QUALITY, contentHash, imagePaths, planWidths, uuidFromHash } from '../src/lib/mediaPipeline.ts';

const [mapFile, ...dirs] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!mapFile || !url || !secret) {
  console.error('Kullanım: node --env-file=.env.local scripts/product-covers.mjs <eşleme.json> <assets klasörü…>');
  process.exit(1);
}
const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const BUCKET = 'media';
const FOLDER = 'products';
const map = JSON.parse(readFileSync(mapFile, 'utf8'));

function locate(file) {
  for (const d of dirs) {
    try {
      readFileSync(join(d, file));
      return join(d, file);
    } catch {
      /* sıradaki klasör */
    }
  }
  throw new Error(`Dosya bulunamadı: ${file}`);
}
async function put(path, body, contentType) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType, upsert: true, cacheControl: '31536000' });
  if (error) throw new Error(`Yükleme başarısız ${path}: ${error.message}`);
}
async function uploadImage(file, alt) {
  const src = sharp(readFileSync(file)).rotate();
  const meta = await src.metadata();
  const { full, variants } = planWidths(meta.width ?? 0);
  const fullBuf = await src.clone().resize({ width: full, withoutEnlargement: true }).webp({ quality: WEBP_QUALITY }).toBuffer({ resolveWithObject: true });
  const hash = contentHash(fullBuf.data);
  const paths = imagePaths(FOLDER, hash);
  await put(paths.full, fullBuf.data, 'image/webp');
  const variantMap = {};
  for (const w of variants) {
    await put(paths.variant(w), await src.clone().resize({ width: w }).webp({ quality: WEBP_QUALITY }).toBuffer(), 'image/webp');
    variantMap[`w${w}`] = paths.variant(w);
  }
  const blur = await src.clone().resize({ width: BLUR_WIDTH }).webp({ quality: 40 }).toBuffer();
  const id = uuidFromHash(hash);
  const { error } = await supabase.from('media_library').upsert(
    { id, storage_bucket: BUCKET, storage_path: paths.full, file_name: basename(paths.full), mime_type: 'image/webp', size_bytes: fullBuf.data.length, width: fullBuf.info.width, height: fullBuf.info.height, blur_data_url: `data:image/webp;base64,${blur.toString('base64')}`, alt, folder: FOLDER, variants: variantMap },
    { onConflict: 'storage_bucket,storage_path' },
  );
  if (error) throw new Error(`media_library: ${error.message}`);
  return id;
}

for (const [slug, files] of Object.entries(map)) {
  const { data: product } = await supabase.from('products').select('id, name').eq('slug->>tr', slug).maybeSingle();
  if (!product) {
    console.log(`${slug.padEnd(16)} ürün yok, atlandı`);
    continue;
  }
  const name = product.name?.tr ?? slug;
  const ids = [];
  for (const f of files) ids.push(await uploadImage(locate(f), { tr: `${name} — sahadan görünüm`, en: `${product.name?.en ?? name} — on site` }));
  const [cover, ...gallery] = ids;
  const { error } = await supabase.from('products').update({ cover_image_id: cover }).eq('id', product.id);
  if (error) throw new Error(`products: ${error.message}`);
  await supabase.from('product_images').delete().eq('product_id', product.id);
  if (gallery.length) {
    const { error: gErr } = await supabase.from('product_images').insert(gallery.map((media_id, i) => ({ product_id: product.id, media_id, sort_order: i + 1 })));
    if (gErr) throw new Error(`product_images: ${gErr.message}`);
  }
  console.log(`${slug.padEnd(16)} kapak + ${gallery.length} galeri`);
}

// Canlı önbellek: LIVE_URL + CRON_SECRET varsa ürün/medya etiketleri anında düşürülür (yoksa 1 saat içinde kendiliğinden yenilenir)
const live = process.env.LIVE_URL;
const cron = process.env.CRON_SECRET;
if (live && cron) {
  const r = await fetch(`${live}/api/cron/revalidate?tags=products,media`, { headers: { authorization: `Bearer ${cron}` } }).catch(() => null);
  console.log('canlı önbellek:', r ? r.status : 'ulaşılamadı');
}
