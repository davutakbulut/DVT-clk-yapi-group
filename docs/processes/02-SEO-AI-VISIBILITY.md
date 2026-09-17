# SEO ve Yapay Zeka Görünürlüğü

## Temel

- Her sayfada dinamik `metadata` (title, description, OG, Twitter Card)
- **Otomatik `sitemap.xml`** veritabanından, her URL **tam dil kümesiyle** (`xhtml:link`)
- `robots.txt` — önizleme dağıtımlarında tümü engelli
- **hreflang:** self-referencing + iki yönlü + `x-default` = TR + **çevrilmemiş dil için hiç yazılmaz**
- Canonical **her zaman çevrilmiş dış URL** (middleware'in yeniden yazdığı iç adres değil)
- `trailingSlash: false` açıkça ayarlanır
- Türkçe SEO-dostu slug + `slug_history` → 308
- `next/image` AVIF/WebP · **her görselde per-locale alt metni**
- Core Web Vitals: LCP < 2.0s · CLS < 0.05 · INP < 150ms

**hreflang iki yönlülüğü nasıl garanti ediliyor:** Alternatif diller detay RPC'sinin döndürdüğü **aynı nesneden** gelir. Elle string birleştirme yapılsaydı bir taraf güncellenip diğeri unutulabilirdi; tek kaynaktan türetmek bunu yapısal olarak imkânsız kılar.

## URL Yapısı

```
/tr/blog/celik-konstruksiyon-maliyeti-2026
/en/blog/steel-construction-cost-2026
/tr/blog/kategori/kentsel-donusum
/tr/blog/etiket/tbdy-2018
```

**URL'de tarih yok** (bilinçli). `/blog/2026/09/yazi-adi` biçimi kullanılmaz — içerik güncellendiğinde adres eskimiş görünür ve yazıyı taşımak imkânsızlaşır. Tarih sayfada ve `dateModified` şemasında durur.

## İndeksleme Hiyerarşisi

```
/                                        öncelik 1.0
├─ /hizmetler                    0.9
│  └─ /hizmetler/[slug]          0.8   ← para sayfaları
├─ /urunler                      0.9
│  ├─ /urunler/kategori/[slug]   0.7
│  └─ /urunler/[slug]            0.8
├─ /cozumler/[slug]              0.8   ← yüksek niyetli SEO iniş
├─ /fiyatlar/[slug]              0.8   ← yüksek niyetli
├─ /projeler                     0.8
│  ├─ /projeler/kategori/[slug]  0.6
│  └─ /projeler/[slug]           0.7
├─ /blog                         0.8
│  ├─ /blog/kategori/[slug]      0.6
│  ├─ /blog/etiket/[slug]        noindex, follow  (5 yazıdan azsa)
│  └─ /blog/[slug]               0.7
└─ kurumsal sayfalar             0.5–0.6
```

**Hiçbir sayfa 3 tıktan uzak değil.** Ayrıca `/site-haritasi` HTML sayfası her yayınlanmış sayfaya bağlanır — arama motoru için ikinci keşif yolu.

## Yapılandırılmış Veri (JSON-LD)

| Sayfa | Şema |
|---|---|
| Kök | `Organization` + `GeneralContractor` · adres · telefon · `sameAs` · logo |
| İletişim | `LocalBusiness` — *"çelik konstrüksiyon [şehir]"* aramaları için değerli |
| Tüm iç sayfalar | `BreadcrumbList` |
| Hizmet | `Service` (provider → Organization `@id`) |
| Ürün | `Product` — **fiyat yayınlanmadığı için uydurma `Offer` yazılmaz** |
| Proje | `Article` + `about` |
| Blog | `BlogPosting` — author, datePublished, **dateModified**, `inLanguage` |
| SSS / Çözüm | `FAQPage` |
| **Kariyer ilanı** | `JobPosting` → **Google for Jobs'ta görünür** |
| Yorumlar | `Review` + `AggregateRating` — **yalnız ait olduğu varlık üzerinde** |

**`inLanguage` her parçada zorunlu** — hreflang'in JSON-LD karşılığı, rutin olarak atlanır.

**`AggregateRating` kapsamı:** Ana sayfadaki genel puanı ürün sayfasına koymak Google politikası ihlalidir. Ana sayfa carousel'i şema yaymaz; ürün sayfası yalnız o ürünün yorumlarını işaretler.

## İndeksleme Hızlandırma

- **IndexNow** — yayınla/güncelle anında Bing, Yandex, Seznam'a bildirim. Ücretsiz, tek anahtar dosyası
- **Google Indexing API** — `JobPosting` için resmen destekleniyor, kariyer ilanları anında indekslenir
- **RSS/Atom feed** — `/blog/feed.xml`
- **Search Console + Bing Webmaster doğrulama meta etiketleri** → `site_settings`

**Yayınla butonuna basıldığında:**
```
ISR etiketi temizlenir → sitemap yenilenir → IndexNow tetiklenir → RSS güncellenir
```

## Yapay Zeka Arama Görünürlüğü

Google AI Overviews, ChatGPT Search, Perplexity gibi sistemlerde çıkmak **klasik SEO'dan farklı hazırlık** ister.

### Teknik

- **AI tarayıcılarına `robots.txt`'te açık izin:** `GPTBot` · `ClaudeBot` · `PerplexityBot` · `ChatGPT-User` · `Google-Extended` · `CCBot` · `Applebot-Extended`
  → Engellenirse marka AI cevaplarında **hiç görünmez**. Varsayılan şablonların çoğu engeller; bilinçli olarak açıyoruz
- **`/llms.txt`** — AI sistemleri için site özeti (gelişmekte olan standart)
- **İçerik sunucuda render edilmiş** olmalı — AI tarayıcıları JavaScript çalıştırmaz. ISR/SSR mimarimiz bunu zaten sağlıyor ✅
- Temiz semantik HTML: `<article>`, `<section>`, doğru başlık hiyerarşisi
- Yapılandırılmış veri — AI sistemleri JSON-LD'yi doğrudan okur

### İçerik Biçimi

AI'lar **cevap şeklinde** metni tercih eder:

- **Tanım paragrafı** — her sayfanın başında "X nedir?" sorusunu 2-3 cümlede net cevaplayan blok
- **SSS blokları** — soru-cevap formatı AI alıntılaması için en verimli yapı
- **Tablolar** — karşılaştırma ve teknik özellik tabloları kolay ayrıştırılır (fiyat rehberi ve ürün varyant tablolarımız zaten böyle)
- **Somut sayı ve birim** — "hızlı" değil, "%40-60 daha kısa sürede"
- Madde listeleri, kısa paragraflar

### Güvenilirlik (E-E-A-T)

- **Yazar kimliği** — blog yazılarında gerçek yazar, ünvan, biyografi, `/ekibimiz` bağlantısı, `Person` şeması
- **Yayın + güncelleme tarihi** görünür ve `dateModified` işaretli
- **Kaynak gösterimi** — TBDY 2018, TS EN standartları, yönetmelik atıfları
- **Firma kimliği netliği** — `Organization` + `sameAs` + tutarlı **NAP** (ad, adres, telefon her yerde birebir aynı)
- **Belgeler sayfası** — sertifikalar yetkinlik kanıtı

### Ölçüm

AI kaynaklı trafik `referrer` üzerinden ayrıştırılıp analitikte ayrı raporlanır (chatgpt.com, perplexity.ai, claude.ai).

## İndekslenmeyecekler

| Alan | Yöntem |
|---|---|
| **`/admin/*`** | **`X-Robots-Tag: noindex, nofollow` başlığı** + robots.txt + meta + sitemap'te yok + bağlantı yok |
| `/hesabim/*` · `/giris` · `/kayit` · `/sifre-*` | `noindex, nofollow` |
| `/teklif-sepeti` · `/arama` | `noindex, follow` |
| `/403` · hata sayfaları | `noindex` |
| Önizleme dağıtımları | robots.txt tümünü engeller + `X-Robots-Tag` |
| Çevrilmemiş dil | Sayfa 404 verir, sitemap'e girmez, hreflang yazılmaz |
| Etiket sayfası (<5 yazı) | `noindex, follow` |

> ⚠️ **`robots.txt`'teki `Disallow` indekslemeyi engellemez**, yalnız taramayı engeller. Google başka yerden `/admin` bağlantısı bulursa adresi açıklamasız indeksleyebilir. Güvenilir yöntem **`X-Robots-Tag: noindex` HTTP başlığıdır** — `next.config.ts` üzerinden `/admin/:path*` için ayarlanır.

## Öksüz Sayfa Denetimi

**Hiçbir yerden iç bağlantı verilmeyen sayfa Google tarafından nadiren indekslenir.**

```
/admin/settings/seo → "Öksüz Sayfalar"
  ⚠ /urunler/sandvic-panel     hiçbir yerden bağlantı yok
  ⚠ /blog/eski-bir-yazi        yalnız sitemap'te
```

Yayınlanmış her sayfaya en az bir iç bağlantı gelmesi **Bitti Tanımı'nın parçası**.

## Çift İçerik Koruması (K-25)

Hizmet ve ürün sayfaları aynı konuyu iki açıdan anlatıyor. SEO panelinde iki kontrol:

- **Odak kelime benzersizliği** — aynı anahtar kelime iki sayfada kullanılırsa uyarı
- **İçerik örtüşme oranı** — %60 üstünde uyarı

Bu kontroller olmadan bu yapı riskli olurdu.

## Reklam ve Ölçüm Araçları

GA4 + Google Ads + Meta Pixel, **tamamı çerez onayına bağlı** — onay yoksa script hiç yüklenmez.

**Dönüşüm olayları:** teklif formu · teklif sepeti gönderimi · WhatsApp tıklaması · konfigürasyon kaydetme · telefon tıklaması.

Üçüncü parti script yükü performans bütçesine dahil edilir ve Lighthouse'ta izlenir. Kendi analitiğimiz bunlardan bağımsız çalışır.
