# Ön Yüz Sayfaları

## Route Ağacı

| TR | EN | Tip | Render |
|---|---|---|---|
| `/` | `/` | Ana sayfa (scroll video hero) | ISR |
| `/hizmetler` · `/hizmetler/[slug]` | `/services` · `/services/[slug]` | Hizmet | ISR |
| `/urunler` · `/urunler/kategori/[slug]` · `/urunler/[slug]` | `/products` · … | Ürün kataloğu | ISR |
| `/teklif-sepeti` | `/quote-basket` | Teklif sepeti | Dinamik |
| `/cozumler` · `/cozumler/[slug]` | `/solutions` · … | SEO iniş | ISR |
| `/fiyatlar` · `/fiyatlar/[slug]` | `/pricing` · … | Fiyat rehberi | ISR |
| `/projeler` · `/projeler/kategori/[slug]` · `/projeler/[slug]` | `/projects` · … | Proje | ISR |
| `/blog` · `/blog/kategori/[slug]` · `/blog/etiket/[slug]` · `/blog/[slug]` | `/blog` · … | Blog | ISR |
| `/konfigurator` · `/konfigurator/k/[ref]` | `/configurator` · `/configurator/c/[ref]` | 3D araç | Dinamik |
| `/hakkimizda` · `/ekibimiz` · `/referanslarimiz` · `/belgelerimiz` | `/about` · `/team` · `/references` · `/certificates` | Kurumsal | ISR |
| `/kariyer` · `/kariyer/[slug]` | `/careers` · … | İlan + başvuru | ISR |
| `/iletisim` · `/teklif-al` · `/sss` · `/arama` · `/yorum-birak` · `/site-haritasi` | `/contact` · `/get-quote` · `/faq` · `/search` · `/leave-a-review` · `/sitemap` | Yardımcı | Karma |
| `/gizlilik-politikasi` · `/cerez-politikasi` · `/kvkk-aydinlatma-metni` · `/kullanim-kosullari` | `/privacy-policy` · `/cookie-policy` · `/data-protection` · `/terms-of-use` | Yasal | ISR |
| `/giris` · `/kayit` · `/sifremi-unuttum` · `/sifre-yenile` | `/login` · `/register` · … | Üyelik | Dinamik |
| `/hesabim` · `/hesabim/profil` · `/hesabim/tekliflerim` · `/hesabim/konfigurasyonlarim` | `/account` · … | Üye alanı | Dinamik |

## Ana Sayfa Bölüm Sırası

```
1. HEADER            logo ortada, video üstünde, scroll'da koyulaşır
2. SCROLL VIDEO HERO tam ekran, scroll ile oynar (6-8 sn)
3. HAKKIMIZDA        metin + görsel + istatistikler
4. HİZMETLER         yatay kayan görselli kartlar
5. PROJE GALERİSİ    ızgara → proje detayı
6. BLOG              son yazılar
7. TEKLİF / TALEP    form
8. MÜŞTERİ YORUMLARI carousel (vurgulu orta kart)
9. FOOTER            4 sütun + alt bar
   ⌐ yüzen WhatsApp butonu (sağ alt, her sayfada)
```

## Header

```
Hizmetler▾ Ürünler▾ Projeler▾ Konfigüratör │ LOGO │ Blog Hakkımızda İletişim
                                                    [TR|EN] [👤] [Teklif Al]
```

- Video üzerinde şeffaf başlar, scroll'da antrasit + blur kazanır
- **Hizmetler mega menü:** hizmet ızgarası + "Çözümler" sütunu + "Konfigüratörü Dene" kutusu
- **Ürünler mega menü:** kategoriler + öne çıkan ürünler
- Mobil: logo ortada sabit, sol hamburger → drawer (akordeon), sağda Teklif Al
- Giriş varsa 👤 → Profilim / Tekliflerim / Konfigürasyonlarım / Yönetim Paneli / Çıkış

**Ortalanmış logo:** `grid-template-columns: var(--nav-edge) 1fr var(--nav-edge)` — `auto 1fr auto` piksel hassasiyetinde ortalamaz.

**Oturum durumu istemci bileşeninde.** Sunucuda render edilirse ya tüm layout dinamikleşir (ISR ölür) ya da bir kullanıcının durumu herkese önbelleklenir. Sabit genişlikli iskeletle düzen kayması önlenir.

**Menü verisi `unstable_cache` + etiket ile önbellekte** — önbellek isabetinde sıfır sorgu. Yedek: RPC hata verirse koda gömülü asgari menü render edilir; site navigasyonsuz kalmaz.

## Footer

| Kurumsal | Hizmetler | Ürün & Proje | İletişim |
|---|---|---|---|
| Hakkımızda | Hizmet listesi | Ürün kategorileri | Adres · Telefon · E-posta |
| Ekibimiz | Fiyat Rehberi | Çözüm sayfaları | Sosyal medya |
| Referanslarımız | | Proje kategorileri | Bülten kaydı |
| Belgelerimiz | | Konfigüratör | Çalışma saatleri |
| Kariyer · İletişim | | Müşteri Yorumları | |

Alt bar: Gizlilik · Çerez · KVKK · Kullanım Koşulları · Site Haritası · © CLK Yapı Group

**Footer'da tüm hizmet listesi olması bilinçli:** Site geneli bir footer bağlantısı, uzun kuyruk sayfalara en ucuz ve en etkili iç bağlantı yoludur.

## İç Bağlantı Akışı

```
ANA SAYFA ──→ Hizmetler · Ürünler · Projeler · Blog · Çözümler · Konfigüratör · Teklif

HİZMET DETAY  ──→ Bu hizmetle yapılan PROJELER (3) · İlgili ÇÖZÜM sayfaları
              ──→ FİYAT REHBERİ · İlgili BLOG (2) · Bu hizmete ait YORUMLAR
              ──→ Konfigüratör CTA + Teklif CTA

ÜRÜN DETAY    ──→ İlgili HİZMET · Aynı kategoriden ÜRÜNLER
              ──→ Kullanıldığı PROJELER · İlgili FİYAT REHBERİ
              ──→ Teklif İste + Teklif Listesine Ekle + WhatsApp

PROJE DETAY   ──→ Kullanılan HİZMET(ler) · Aynı kategoriden projeler (3)
              ──→ Önceki/Sonraki · Bu projenin YORUMU · Teklif CTA

BLOG DETAY    ──→ İlgili HİZMET · İlgili PROJELER · Aynı kategori (3)
              ──→ Önceki/Sonraki · İçindekiler

ÇÖZÜM DETAY   ──→ Temel HİZMET · Örnek PROJELER · İlgili YAZILAR · Konfigüratör
FİYAT REHBERİ ──→ İlgili HİZMET · Konfigüratör · Teklif · WhatsApp
```

**İlgili içerik çözümleme sırası:** ① küratörlü (`content_links`) → ② aynı kategori → ③ ortak etiket → ④ en yeni (modül hiç boş render edilmesin diye doldurma).

Her zaman `p_locale = any(published_locales)` filtresi uygulanır — **İngilizce sayfa asla yalnız-Türkçe bir sayfaya bağlanmaz.** İki dilli sitelerde en sık atlanan hata budur.

## Çözüm Sayfası Şablonu (8 bölüm)

1. Hero — hedef anahtar kelimeli H1 + öz cümle
2. Problem tanımı — "Neden bu ihtiyaç var?"
3. Karşılaştırma tablosu — alternatif yöntemle kıyas
4. Avantaj kartları — 3–6 madde, ikonlu
5. Teknik dayanak — yönetmelik/standart referansları (TBDY 2018 vb.)
6. Örnek projeler — ilgili projelerden galeri
7. SSS — `FAQPage` şeması
8. CTA — teklif + konfigüratör

## Fiyat Rehberi Şablonu

```
H1: Çelik Konstrüksiyon Ton Fiyatları (2026)
     Son güncelleme: … · Fiyatlara KDV dahil değildir

┌─ FİYAT TABLOSU ──────────────────────────────┐
│ Sistem Türü · Açıklama · Birim Fiyat · 50t · 100t · 200t │
└──────────────────────────────────────────────┘

┌─ HIZLI HESAPLAYICI ──────────────────────────┐
│ Metrajınızı girin: [ ___ ] ton               │
│ → Tahmini aralık (her sistem türü için)      │
│ [Teklif Al]  [WhatsApp'tan Sor]              │
└──────────────────────────────────────────────┘

FİYATI ETKİLEYEN FAKTÖRLER · HESAPLAMA FORMÜLÜ · UYARI
```

Hesaplayıcı **tamamen istemci tarafında** — veri sayfada zaten var, sunucuya gitmez.
Girilen metrajlar analitiğe olay olarak yazılır → *"hangi büyüklükte projeler sorgulanıyor"* raporu.

Her sayfada **"tahmini aralıktır, kesin teklif keşif sonrası verilir"** ibaresi zorunlu alan.

## Müşteri Yorumları Carousel

Ana sayfada footer'dan önce; ayrıca hizmet ve proje detaylarında ilgili yorumlar.

- Embla Carousel · ortadaki kart vurgulu ve altın çerçeveli, yanlar soluk ve küçültülmüş
- Ok butonları + nokta göstergeleri + sürükleme + klavye ok tuşu
- Otomatik kayma: fareyle üzerine gelince durur, `prefers-reduced-motion`'da hiç başlamaz
- Mobilde tek kart tam genişlik
- Üstteki toplu rozet (`4.9 / 5.0 · 127 Değerlendirme`) **yayındaki yorumlardan otomatik hesaplanır**
- Bağlı yorumu olmayan sayfada bölüm **hiç render edilmez**

## Yüzen WhatsApp Bileşeni

**Kapalı:** sağ altta yeşil yuvarlak + koyu hap etiket. N saniye sonra yumuşak giriş.
**Açık:** başlık (avatar, ad, Çevrimiçi rozeti, yanıt süresi) · karşılama mesajı · iletişim satırları · `WhatsApp ile Sohbete Başla` · `Hemen Ara` / `No Kopyala`.

**Sayfa bağlamlı mesaj** — `wa.me/90...?text=` ile bulunulan sayfa mesaja gömülür:

| Sayfa | Mesaj |
|---|---|
| Hizmet detay | `"{{hizmet_adi}}" hizmeti hakkında bilgi almak istiyorum. ({{url}})` |
| Ürün detay | `"{{urun_adi}}" ürünü hakkında bilgi almak istiyorum. ({{url}})` |
| Proje detay | `"{{proje_adi}}" projesi hakkında bilgi almak istiyorum. ({{url}})` |
| Konfigüratör | `Konfigüratörde {{en}}×{{boy}}m bir yapı oluşturdum… ({{url}})` |

Her tıklama dönüşüm olayı olarak kaydedilir.

## Hata Sayfaları

| Kod | Başlık | Animasyon |
|---|---|---|
| **404** | "Bu kat henüz inşa edilmedi" | Çelik iskelet kendini çizer, bir kolon eksik kalır |
| **403** | "Bu şantiyeye giriş izniniz yok" | Bariyer + uyarı bandı |
| **500** | "Yapısal bir hata oluştu" | Kiriş dağılıp birleşir |
| **Bakım** | "Tadilat halindeyiz" | Vinç sallanma |

SVG çizgi animasyonlu, `prefers-reduced-motion` uyumlu. Her birinde arama kutusu + popüler sayfa önerileri + ana sayfa dönüşü. **Metinleri admin'den düzenlenebilir.**
