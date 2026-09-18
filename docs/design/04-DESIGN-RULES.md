# Tasarım Kuralları — Kararsız Kalınan Noktalar

> `01-DESIGN-SYSTEM.md` tokenları ve ilkeleri verir; bu dosya **uygulamada tereddüt edilen** noktaların kararını tutar.
> Yeni bir bölüm/bileşen yazmadan önce buraya bakılır. Burada cevabı olmayan bir tasarım sorusu çıkarsa **önce kural buraya yazılır, sonra kod**.

## 0. Karar sırası

1. Sitede aynı işi gören bir bölüm var mı? → **Onun düzenini kullan** (başlık, kart, aralık).
2. Yoksa → tokenlardan kur (`01-DESIGN-SYSTEM.md`); ham renk/ölçü yazma.
3. Referans görsel (başka siteden ekran görüntüsü) **yerleşim fikri** verir; **renk, köşe yuvarlaklığı, gölge, başlık hizası oradan alınmaz** — bizim sistemden alınır.
4. Hâlâ belirsizse kuralı bu dosyaya ekle, sonra uygula.

## 1. Bölüm başlığı (ana sayfa ve liste sayfaları)

Tek kalıp: `src/ui/SectionHeading.tsx`.

```
[05] SAHA                      ← numaralı kicker (label-mono), vurgu metin rengi
Sahadan videolar               ← h2, sola hizalı, tek renk (--color-text)
Kısa açıklama (isteğe bağlı)   ← lead, --color-text-muted         [ Tüm … ]  ← sağda ghost buton (varsa)
```

- **Sola hizalı.** Ortalanmış bölüm başlığı yok (istisna: hero ve hata sayfaları).
- **Başlıkta renkli kelime yok** ("Sahadan **Videolar**" gibi iki renkli başlık kullanılmaz).
- **Cümle düzeni:** yalnız ilk harf büyük — "Son yazılar", "Sahadan videolar", "Müşteri değerlendirmeleri". Özel adlar hariç Her Kelime Büyük yazılmaz.
- Kicker tek kelime/kısa: `BLOG`, `SAHA`, `YORUMLAR`. Numara sayfadaki sırayı izler (01, 02 …).
- Bölümün "tümünü gör" eylemi başlığın **sağında ghost buton**; bölümün altına ayrı bağlantı konmaz.
- Bölümler arası ayrım: `border-t border-[var(--color-border)]` + `py-[var(--section-y)]`; başlık ile içerik arası `gap-10`.

## 2. Renk

- Vurgu **çelik mavisi**: çizgi/zemin `--color-accent`, metin `--color-accent-text`. **Altın/sarı vurgu yok.**
- Bir bölümde vurgu rengi en fazla iki öğede (aktif kart çerçevesi + aktif nokta gibi).
- İstisnalar (anlam taşıyan renkler):
  - Puan yıldızı: `#c9962f` (evrensel "yıldız" rengi; yalnız `.star-on`).
  - Kaynak rozetleri (`t-badge-google|manual|visitor|verified`): açık zeminli anlamsal tonlar.
  - "Örnek" rozeti: koyu zemin (`--color-surface-dark`) — gözden kaçmamalı.
- Kart zemini `--color-surface` (beyaz), sayfa zemini `--color-bg` (kâğıt).

## 3. Köşe · Gölge

- Köşe: `--radius-0 | --radius-1 (2px) | --radius-2 (4px)`. Kart, görsel, video, buton, form → **en fazla 4px**.
- `--radius-full` yalnız: avatar, nokta göstergesi, yuvarlak ikon düğmesi (ok, oynat), hap rozet.
- **İstisna:** yüzen WhatsApp penceresi (mesajlaşma uygulaması alışkanlığı; ürün sahibinin referansıyla yapıldı). Başka hiçbir bileşen bu istisnayı örnek almaz.
- Gölge: tasarım çizgi ağırlıklı. Gölge yalnız **öne çıkan tek öğede** (carousel'in orta kartı, yüzen düğme). Dizideki her karta gölge verilmez; kart sınırı 1px çizgidir.

## 4. Kartlar

- Dikdörtgen, 1px `--color-border`, iç boşluk `--space-6`/`--space-8`; hover'da çizgi koyulaşır, kart zıplamaz.
- Kart ızgarası: `.card-grid` (blog, ürün, proje). Yeni liste için yeni ızgara yazılmaz.
- Görsel oranları: blog/proje kartı 16:10 · ürün 4:3 · **saha videosu 9:16** · avatar 1:1.
- Kart üstü yazı (video alıntısı gibi) yalnız alttan koyu degrade üzerinde, beyaz, `--fs-sm` 600.

## 5. Carousel (yorumlar, saha videoları)

- Yerel `scroll-snap` (K-60); kütüphane yok. Şerit `tabIndex=0`, `position: relative`, kaydırma çubuğu gizli.
- **Masaüstü — dizi (videolar):** kartlar kapsayıcıya hizalı; oklar şeridin **sağ altında**. Tüm kartlar sığıyorsa oklar ve noktalar **gizlenir**.
- **Masaüstü — tek odak (yorumlar):** orta-kart; oklar orta kartın iki yanında yüzer, noktalar altta.
- **Mobil:** orta-kart düzeni — aktif kart ortada, komşular kenardan görünür (soluk; videoda ±5° eğik), altta `‹ noktalar ›`.
- Ok: yuvarlak, 44px (mobil) / 52px (yorumlarda yüzen), 1px çizgi, ikon `--color-accent-text`. Nokta: 24×24 dokunma alanı, aktif olan hap biçimli.
- Aktif olmayan yorum kartı `inert` + `aria-hidden`. Otomatik kayma yalnız yorumlarda; hover/odakta durur, `prefers-reduced-motion`'da hiç başlamaz. Videoda otomatik kayma yok.
- Ağır medya (YouTube iframe, `<video>`) **yalnız tıklanınca** oluşturulur (K-76).

## 6. Butonlar

- Bir ekranda tek birincil (`Button` varsayılan). Bölüm eylemleri `variant="ghost"`.
- `.btn` sınıfı elle yazılmaz; `src/ui/Button.tsx` kullanılır.
- Metin cümle düzeninde: "Yorum yaz", "Tüm yazılar".

## 7. Boş durum ve örnek içerik

- **Uydurma içerik yok** (yorum, proje, fiyat, sertifika — CLAUDE.md). Bu, tasarımı "dolu göstermek" için de geçerlidir.
- Veri **hatasında** bölüm hiç çizilmez (Kural 3). Veri **boşsa** iki seçenek:
  1. Bölüm gizlenir (varsayılan), ya da
  2. Dürüst bir davet kartı (yorumlar: "İlk değerlendirmeyi siz yazın").
- Tasarımı içerikle görmek gerekiyorsa **etiketli örnek**: yorumlarda `is_sample` → kartta "Örnek yorum" rozeti, ortalamaya ve JSON-LD'ye girmez (K-78). Örnekler betikle eklenir/silinir, migration'la üretime taşınmaz.
- Stok görsel/video "bizim işimiz" diye sunulmaz. Saha videoları firmanın kendi fotoğraf/çekimlerinden (K-77).

## 8. Mobil

- Yatay taşma sıfır: ızgara çocuklarında `min-width: 0`, tek sütunda `minmax(0, 1fr)`; `overflow-x: auto` kutusu `position: relative`.
- `<select>` kabına sığar (`width:100%; min-width:0`) — uzun seçenek metni sayfayı genişletmesin.
- `100dvh` (asla `100vh`), mobilde ScrollTrigger `pin` yok, dokunma hedefi ≥ 24×24 (tercihen 44).
- Her yeni bölüm `e2e/mobile-overflow.spec.ts` ve axe denetiminden geçer.

## 9. Yönetim paneli

- Panel ayrı tema (`theme.admin.css`, shadcn tokenları); site kuralları 1–5 panele uygulanmaz.
- Sayfa kalıbı: `AdminPageHeader` → "Yeni …" formu → `<details>` listesi → sil formu. Menüde doğru gruba eklenir (`admin-shell/nav.ts`).

## Kontrol listesi (yeni bölüm)

```
□ SectionHeading (numara + kicker + sola hizalı, cümle düzeni başlık)
□ Ham renk yok; vurgu = --color-accent / --color-accent-text
□ Köşe ≤ 4px (yuvarlak yalnız avatar/nokta/ikon düğmesi)
□ Gölge yalnız öne çıkan tek öğede
□ Eylem sağda ghost buton
□ Boş durumda uydurma içerik yok
□ Mobilde taşma yok · axe temiz · klavye ile gezilebilir
```
