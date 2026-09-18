#!/usr/bin/env node
/**
 * Örnek yorum kartları (K-78) — tasarımı içerikle görebilmek için. Bunlar gerçek müşteri yorumu DEĞİLDİR:
 * `is_sample = true` → sitede "Örnek yorum" rozetiyle görünür, puan ortalamasına ve JSON-LD'ye girmez.
 * Uydurma müşteri adı, firma ya da övgü cümlesi YAZILMAZ (CLAUDE.md › Asla Yapılmayacaklar).
 *
 * Kullanım: node --env-file=.env.local scripts/sample-testimonials.mjs add|remove
 * Gerçek yorumlar gelince: `remove`.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const mode = process.argv[2];
if (!url || !secret || !['add', 'remove'].includes(mode)) {
  console.error('Kullanım: node --env-file=.env.local scripts/sample-testimonials.mjs add|remove');
  process.exit(1);
}
const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const SAMPLES = [
  {
    author_name: 'Örnek Müşteri',
    author_title: { tr: 'Örnek kayıt', en: 'Sample entry' },
    body: {
      tr: 'Bu bir örnek yorum kartıdır. Gerçek müşteri değerlendirmeleri, müşterilerimiz yazdıkça ve onaylandıkça bu alanda yayımlanır.',
      en: 'This is a sample review card. Real customer reviews are published here as our clients write them and they are approved.',
    },
  },
  {
    author_name: 'Örnek Müşteri',
    author_title: { tr: 'Örnek kayıt', en: 'Sample entry' },
    body: {
      tr: 'Örnek metin: bir müşteri yorumu burada bu uzunlukta görünür. Yorumun altında ad, unvan ve tarih; üstünde kaynak rozeti ve puan yer alır.',
      en: 'Sample text: a customer review of this length appears here. Name, title and date sit below; the source badge and rating sit above.',
    },
  },
  {
    author_name: 'Örnek Müşteri',
    author_title: { tr: 'Örnek kayıt', en: 'Sample entry' },
    body: {
      tr: 'Örnek metin: bizimle çalıştıysanız Yorumlar sayfasındaki formdan değerlendirmenizi gönderebilirsiniz; incelendikten sonra burada yayımlanır.',
      en: 'Sample text: if you have worked with us, you can send your review from the form on the Reviews page; it is published here after moderation.',
    },
  },
];

if (mode === 'remove') {
  const { data, error } = await supabase.from('testimonials').delete().eq('is_sample', true).select('id');
  if (error) throw new Error(error.message);
  console.log(`silinen örnek: ${data.length}`);
} else {
  const { count } = await supabase.from('testimonials').select('id', { count: 'exact', head: true }).eq('is_sample', true);
  if (count) {
    console.log(`zaten ${count} örnek var — önce remove`);
    process.exit(0);
  }
  const rows = SAMPLES.map((s, i) => ({ ...s, source: 'manual', rating: 5, original_locale: 'tr', status: 'published', is_sample: true, is_verified: false, sort_order: i + 1 }));
  const { data, error } = await supabase.from('testimonials').insert(rows).select('id');
  if (error) throw new Error(error.message);
  console.log(`eklenen örnek: ${data.length}`);
}
