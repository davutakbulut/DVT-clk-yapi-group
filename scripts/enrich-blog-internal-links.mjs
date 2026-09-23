#!/usr/bin/env node
/**
 * Blog içerik zenginleştirme + iç bağlantı (K-96): mevcut yazılara ilk geçtiği yerde ürün/hizmet/çözüm/konfigüratör/yazı bağlantısı,
 * sonuna bağlamlı "ilgili" bölümleri ekler; okuma süresini günceller. Uydurma sayı/proje/fiyat YOK (K-75) — eklenen metin genel ve
 * sitedeki gerçek sayfalara işaret eder.
 *   node --env-file=.env.local scripts/enrich-blog-internal-links.mjs [--dry]
 * Yeniden çalıştırılabilir: zaten bağlantılı terimlere ve "<!-- k96 -->" işaretli bölümlere dokunmaz.
 */
import { createClient } from '@supabase/supabase-js';
const dry = process.argv.includes('--dry');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const MARK = '<!-- k96 -->';

/** slug → { terms: [[regex, url]] (ilk eşleşme bağlanır), append: markdown } */
const PLAN = {
  'celik-konstruksiyon-yapi-nedir': {
    terms: [
      [/H profiller \(HEA, HEB\)/, null, (m) => `H profiller ([HEA](/tr/urunler/hea), [HEB](/tr/urunler/heb))`],
      [/I profiller \(IPE\)/, null, () => `I profiller ([IPE](/tr/urunler/ipe))`],
      [/U \/ C \/ Z profillerdir/, null, () => `[U](/tr/urunler/upn) / C / Z profillerdir`],
      [/boru, köşebent/, null, () => `[boru](/tr/urunler/boru-profil), [köşebent](/tr/urunler/l-kosebent)`],
      [/trapez sac, sandviç panel/, null, () => `[trapez sac](/tr/urunler/trapez-sac), [sandviç panel](/tr/urunler/cati-sandvic-paneli)`],
      [/Bir sanayi yapısına/, null, () => `Bir [sanayi yapısına](/tr/hizmetler/endustriyel-tesis-ve-depo)`],
    ],
    append: `
## Profil seçimi ve ağırlık hesabı

Aynı görevi gören profiller arasında seçim, açıklığa ve yüke göre kesit değerleriyle yapılır. Sitemizdeki ürün sayfalarında her ölçünün kg/m ağırlığı ve kesit değerleri (A, Ix, Wx…) tablo hâlinde verilir; boy ve adet girerek toplam ağırlığı hesaplayabilir, seçimi teklif sepetine ekleyebilirsiniz: [HEA](/tr/urunler/hea), [HEB](/tr/urunler/heb), [IPE](/tr/urunler/ipe), [kutu profil](/tr/urunler/kutu-profil), [köşebent](/tr/urunler/l-kosebent).

Yapının tamamı için kaba bir ön boyutlandırma ve metraj almak isterseniz [çelik konstrüksiyon konfigüratörü](/tr/konfigurator) ile açıklık, boy ve saçak yüksekliğini girerek eleman listesine ulaşabilirsiniz.

## İlgili yazılar

- [Kentsel dönüşümde çelik karkas: dar parselde süreç nasıl işler?](/tr/blog/kentsel-donusumde-celik-karkas-sureci)
- [Çelik yapı tasarımında temel mevzuat: TBDY 2018, Çelik Yapılar Yönetmeliği ve EN 1090](/tr/blog/celik-yapi-tasariminda-temel-mevzuat)
- Hizmetler: [Endüstriyel tesis ve depo](/tr/hizmetler/endustriyel-tesis-ve-depo) · [Çelik çatı ve cephe sistemleri](/tr/hizmetler/celik-cati-ve-cephe-sistemleri)

Projeniz için taşıyıcı sistem seçeneklerini konuşmak isterseniz [teklif isteyin](/tr/teklif-al).
`,
  },
  'kentsel-donusumde-celik-karkas-sureci': {
    terms: [
      [/dar parselde çelik karkasla yeniden yapım/, null, () => `[dar parselde çelik karkasla yeniden yapım](/tr/cozumler/dar-parselde-hizli-yeniden-yapim)`],
      [/Türkiye Bina Deprem Yönetmeliği ve Çelik Yapılar Yönetmeliği'ne/, null, () => `[Türkiye Bina Deprem Yönetmeliği ve Çelik Yapılar Yönetmeliği](/tr/blog/celik-yapi-tasariminda-temel-mevzuat)'ne`],
      [/trapez sac üzeri beton/, null, () => `[trapez sac](/tr/urunler/betonalti-trapez-saci) üzeri beton`],
      [/İskelet tamamlandıktan/, null, () => `[İskelet](/tr/blog/celik-konstruksiyon-yapi-nedir) tamamlandıktan`],
      [/cephe ve tesisat işleri/, null, () => `[cephe](/tr/hizmetler/celik-cati-ve-cephe-sistemleri) ve tesisat işleri`],
    ],
    append: `
## Süreyi kısaltan iki hazırlık

- **Erken metraj:** Mimari kurgu netleşir netleşmez [konfigüratörle](/tr/konfigurator) kaba eleman listesi ve tonaj alınırsa, statik proje ve atölye planlaması aynı anda başlar.
- **Profil ve sac seçimi:** Kolon, kiriş ve döşeme sacı için ölçü tabloları ürün sayfalarında hazırdır: [HEA](/tr/urunler/hea), [IPE](/tr/urunler/ipe), [kutu profil](/tr/urunler/kutu-profil), [betonaltı trapez sacı](/tr/urunler/betonalti-trapez-saci).

## İlgili yazılar ve hizmetler

- [Çelik konstrüksiyon yapı nedir? Taşıyıcı sistemin temel elemanları](/tr/blog/celik-konstruksiyon-yapi-nedir)
- [Çelik yapı tasarımında temel mevzuat](/tr/blog/celik-yapi-tasariminda-temel-mevzuat)
- [Kentsel dönüşüm çelik karkas hizmeti](/tr/hizmetler/kentsel-donusum-celik-karkas) · [Dar parselde hızlı yeniden yapım](/tr/cozumler/dar-parselde-hizli-yeniden-yapim)

Parselinizin ölçüleriyle ön görüşme için [teklif formunu](/tr/teklif-al) doldurabilirsiniz.
`,
  },
  'celik-yapi-tasariminda-temel-mevzuat': {
    terms: [
      [/Hafif çelik çatılarda/, null, () => `[Hafif çelik çatılarda](/tr/hizmetler/celik-cati-ve-cephe-sistemleri)`],
      [/S235, S275 ve S355 adlarındaki/, null, () => `[S235, S275 ve S355](/tr/urunler/hea) adlarındaki`],
      [/moment aktaran çerçeveler/, null, () => `[moment aktaran çerçeveler](/tr/blog/celik-konstruksiyon-yapi-nedir)`],
      [/Taşıyıcı elemanların yangına dayanım/, null, () => `Taşıyıcı elemanların [yangına dayanım](/tr/blog/kentsel-donusumde-celik-karkas-sureci)`],
    ],
    append: `
## Malzeme kalitesini ürün sayfasında görün

Ürün sayfalarımızda her profil için stok kaliteleri (ör. S235JR, S275JR, S355JR) ve EN 10204 3.1 sertifika bilgisi teknik özelliklerde yer alır; ölçü tablosundan kalite ve boy seçerek teklif sepetine ekleyebilirsiniz: [HEA](/tr/urunler/hea), [HEB](/tr/urunler/heb), [IPE](/tr/urunler/ipe), [kutu profil](/tr/urunler/kutu-profil), [boru profil](/tr/urunler/boru-profil).

## İlgili yazılar ve hizmetler

- [Çelik konstrüksiyon yapı nedir? Taşıyıcı sistemin temel elemanları](/tr/blog/celik-konstruksiyon-yapi-nedir)
- [Kentsel dönüşümde çelik karkas: dar parselde süreç nasıl işler?](/tr/blog/kentsel-donusumde-celik-karkas-sureci)
- [Çelik yapı güçlendirme](/tr/hizmetler/celik-yapi-guclendirme) · [Endüstriyel tesis ve depo](/tr/hizmetler/endustriyel-tesis-ve-depo)

Şartnamenizi bu başlıklara göre birlikte gözden geçirmek için [teklif isteyin](/tr/teklif-al).
`,
  },
};

function linkFirst(body, terms) {
  let out = body;
  let added = 0;
  for (const [re, , repl] of terms) {
    // Başlıklar ve mevcut bağlantılar dışında ilk eşleşme
    const lines = out.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (l.startsWith('#') || !re.test(l)) continue;
      const m = re.exec(l);
      const before = l.slice(0, m.index);
      if ((before.match(/\[/g) || []).length > (before.match(/\]\(/g) || []).length) continue; // bağlantı metni içinde
      lines[i] = l.slice(0, m.index) + repl(m[0]) + l.slice(m.index + m[0].length);
      added++;
      break;
    }
    out = lines.join('\n');
  }
  return { out, added };
}

const { data: posts, error } = await supabase.from('blog_posts').select('id, slug, body, reading_minutes');
if (error) throw new Error(error.message);
for (const p of posts) {
  const plan = PLAN[p.slug?.tr];
  if (!plan) continue;
  const body = p.body?.tr ?? '';
  if (body.includes(MARK)) { console.log(`${p.slug.tr}: zaten zenginleştirilmiş, atlandı`); continue; }
  const { out, added } = linkFirst(body, plan.terms);
  // Kapanış notu (*Bu yazı genel…*) en sonda kalsın: ekler ondan önce
  const noteIdx = out.lastIndexOf('\n*Bu yazı');
  const next = noteIdx > 0 ? `${out.slice(0, noteIdx)}\n${MARK}${plan.append}\n${out.slice(noteIdx + 1)}` : `${out}\n${MARK}${plan.append}`;
  const words = next.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  const linkCount = (next.match(/\]\(\/tr\//g) || []).length;
  console.log(`${p.slug.tr.padEnd(44)} satır içi +${added} · toplam iç bağlantı ${linkCount} · ${words} kelime · ${minutes} dk${dry ? ' (deneme)' : ''}`);
  if (dry) continue;
  const { error: e2 } = await supabase.from('blog_posts').update({ body: { ...p.body, tr: next }, reading_minutes: { ...(p.reading_minutes ?? {}), tr: minutes } }).eq('id', p.id);
  if (e2) throw new Error(e2.message);
}
const live = process.env.LIVE_URL, cron = process.env.CRON_SECRET;
if (!dry && live && cron) { const r = await fetch(`${live}/api/cron/revalidate?tags=blog`, { headers: { authorization: `Bearer ${cron}` } }).catch(() => null); console.log('canlı önbellek:', r ? r.status : 'ulaşılamadı'); }
