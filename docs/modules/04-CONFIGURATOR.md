# 3D Konfigüratör

## Mevcut Durum

`_archive/prototypes/configurator-v4.html` ham bir prototip değil — **Three.js ile parametrik çelik yapı modelleyici**.

| Hazır ✅ | Eksik ❌ |
|---|---|
| 5 parametre (en, boy, saçak h, mahya h, aks aralığı) | **Metraj/ağırlık hesabı yok** |
| Gerçek profil kesitleri: HEB360, IPE500/300, UNP160/200, Ø139.7 boru, L100×100×10 | **Fiyatlandırma yok** |
| Açıklığa göre otomatik sistem seçimi (≤30m düz makas, >30m kafes) | **Kaydetme yok** |
| Aşık/kuşak, çapraz, rüzgar kolonu, moment birleşim + cıvata detayı | **Teklife dönüşüm yok** |
| Panel + kapı toggle, OrbitControls, gölge/ışık | **PDF çıktı yok** |
| Kategoriye göre renklendirme | **Veritabanı bağlantısı yok** |

**Görsel motor hazır, ticari katmanın tamamı sıfırdan yazılacak.**

## Üyelik Kapısı

**3D model, ölçü değiştirme ve metraj/tonaj herkese açık.**
**Fiyat, kaydetme ve PDF üyeye özel.**

```
Misafir → ölçü ayarlar → 3D + metraj anında hesaplanır ✅
        → localStorage'a otomatik taslak (yenilemede kaybolmaz)
        ├─ "Tahmini Bedeli Gör" 🔒
        ├─ "PDF İndir"          🔒
        └─ "Kaydet"             🔒
             → [Giriş] [Üye Ol] [E-posta ile bağlantı al]
                  → anonim kayıt + public_token, bağlantı mail'lenir
                  → aynı e-postayla üye olursa kayıtlar hesaba devredilir
```

**Giriş duvarı karartılmış önizleme şeklinde:** fiyat kutusu blur'lu görünür, üzerinde "Tahmini bedeli görmek için giriş yapın". Değerin var olduğu hissettirilir, kayıt motivasyonu artar. Ziyaretçi ölçüyle oynamaya devam edebilir.

## Özellikler

- **İsimlendirme** — "Depo Projesi A"
- **Versiyonlama** — revizyonlar saklanır, v1/v2 karşılaştırılabilir
- **Kopyalama** — mevcut konfigürasyondan çoğaltma
- **Paylaşım bağlantısı** — `/konfigurator/k/[ref]` salt-okunur
- **PDF çıktı** — 3D görünüm + metraj tablosu + tahmini bedel + yasal uyarı
- **Teklife dönüştür** — `leads` kaydı oluşur, metraj ve fiyat taşınır

## Metraj ve Fiyat Motoru

```
3D geometri → her elemanın uzunluğu → profil kg/m ile çarpım → TOPLAM TONAJ
                                                                    ↓
                        material_prices (₺/kg) + panel m² + işçilik katsayısı
                                                                    ↓
                                                          TAHMİNİ BEDEL
```

`material_prices` **fiyatın tek kaynağıdır** — fiyat rehberi de buradan okur. Fiyat bir yerde güncellenince her yer tutarlı kalır.

> ⚠️ **Yasal uyarı zorunlu:** "Bu bir ön metraj tahminidir; statik hesap ve resmî teklif yerine geçmez." Mevcut prototipte de benzer uyarı var — doğru bir refleks.

## Teknik Kararlar

**Kendi route grubunda, Lenis'siz.** Yumuşak scroll React Three Fiber canvas'ıyla çakışıyor.

**Kendi `error.tsx`'i var:** WebGL desteklenmeyen veya belleği yetersiz cihazda çökmek yerine **statik galeri + iletişim formu** gösterir — hem hata sınırı hem dönüşüm kurtarma.

**Three.js yalnız burada, `dynamic(…, {ssr:false})` ile.** Three.js + R3F ~600 KB; ana sayfaya girerse 150 KB'lık performans bütçesi anında aşılır.

**Durum sorgu dizesinde:** `/tr/konfigurator?w=20&l=40&e=6&r=8&b=6` — paylaşılabilir, satış ekibi link gönderebilir.
Slider sürüklenirken `window.history.replaceState()` kullanılır, `router.replace()` **değil** — ikincisi her karede RSC turu tetikler ve canvas takılır.

## Güvenlik

- `configurations` RLS: üye yalnız **kendi** kayıtlarını görür/düzenler/siler
- Anonim kayıtlara doğrudan tablo erişimi **yok** — yalnız `public_token` alan `security definer` RPC üzerinden
- Paylaşım bağlantısı salt-okunur; fiyat gösterimi ayardan kapatılabilir
- Anonim kaydetme **hız sınırlı** (IP başına saat/gün limiti)
- Üye başına konfigürasyon üst limiti ayardan

## Admin

`/admin/configurator/submissions` — gelen tüm konfigürasyonlar: kim (üye/anonim), ölçüler, tonaj, hesaplanan bedel, teklife dönüştü mü. Detayda 3D önizleme + metraj dökümü + **"Satışa Dönüştür"** (kalemler `sale_items`'a aktarılır).

`/admin/configurator/profiles` · `prices` · `rules` — profil kataloğu (kg/m), fiyat yönetimi (geçmişli), min/max limitler ve sistem seçim kuralları.

## Doğrulama

Faz 27 sonunda **metraj çıktısı bilinen bir yapı için elle kontrol edilir.** Metraj hatası doğrudan yanlış fiyata dönüşür; bu yüzden birim testi zorunlu ve saf fonksiyon olarak yazılır (`domain/`).
