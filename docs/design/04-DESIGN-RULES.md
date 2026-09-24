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

- **Koyu palet (K-91):** sayfa zemini `--color-bg` (#12161c), kart/panel `--color-surface` (#1a1f27), koyu bant (header, footer, çizim paneli) `--color-surface-dark` (#0e1622); metin `--color-text` (#ecebe7), ikincil `--color-text-muted`.
- Vurgu **açık çelik** `--color-accent` / `--color-accent-text` (#b9c6d8). **Altın** (`--mark`, #f2c230) yalnız seçicide: seçili çip, 2B/3B düğmesi, çizim ölçü okları — başka bileşende kullanılmaz. Koyu bantlar (header/footer) sayfa zemini rengindedir, lacivert yok; lacivert (`--navy-dark`) yalnız çizim paneli.
- "Metin rengi zemin" (aktif çip, birincil buton) üstündeki metin **`--color-bg`**'dir, `--color-text-inverse` değil (koyu temada ikisi aynı açık renk olur).
- Bir bölümde vurgu rengi en fazla iki öğede (aktif kart çerçevesi + aktif nokta gibi).
- İstisnalar (anlam taşıyan renkler):
  - Puan yıldızı: `#c9962f` (evrensel "yıldız" rengi; yalnız `.star-on`).
  - Kaynak rozetleri (`t-badge-google|manual|visitor|verified`): açık zeminli anlamsal tonlar.
  - "Örnek" rozeti: koyu zemin (`--color-surface-dark`) — gözden kaçmamalı.
- Kart zemini `--color-surface`, sayfa zemini `--color-bg`; ham hex yazılmaz. `--color-accent` / `--color-border` adları shadcn temasıyla çakışır → site tokenları `base` katmanında kalır (K-91), yeni token eklerken katmanı değiştirme.

## 3. Köşe · Gölge

- Köşe: `--radius-0 | --radius-1 (2px) | --radius-2 (4px)`. Kart, görsel, video, buton, form → **en fazla 4px**.
- `--radius-full` yalnız: avatar, nokta göstergesi, yuvarlak ikon düğmesi (ok, oynat, sosyal medya), hap rozet.
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
- **Yoğunluk (K-92):** ≤ 640 px'de tokenlar kendiliğinden daralır (`--section-y`, `--fs-*`, header); yeni bileşende mobil için ayrı boşluk yazma, tokenı kullan. Kartlar 2 sütun, çipler tek satır kaydırmalı; gövde metni 16 px'in altına inmez, dokunma hedefi ≥ 36 px.

## 8b. Ürün sayfası (K-90)

- Başlık koyu bant DEĞİL: kırıntı → aile çubuğu (`.fams`, aynı kategori, geçerli `aria-current`) → `.product-head` (her kelime ayrı satırda büyük başlık + giriş) → `.product-facts`.
- Seçici paneli koyu çizim + açık yüzey panel; seçili çip altın zemin + mürekkep metin; segment (grup) metin-rengi zemin.
- 3B yalnız düğmeyle yüklenir; three.js ilk yüke girmez (K-24).

## 8a. Araç sayfaları (konfigüratör)

- Asıl içerik (3D tuval) mobilde ekranı kaplar; ayar/ayrıntı **sağdan açılan panelde** (en çok %86 genişlik, karartma, Esc/dışarı dokunma/✕ kapatır, kapalıyken `inert`). Tuval üstünde tek satır özet + paneli açan düğme.
- Geri bağlantısı bir üst düzeye gider (konfigüratör → seçim sayfası → ana sayfa), doğrudan ana sayfaya değil.

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

## 8c · Hizmetler & Projeler sayfaları (K-106)

- **Hero:** mono etiket (eyebrow) + 2–3 satırlı büyük başlık (`clamp(2.6rem, 7vw, 6rem)`, satır sonu veriden `\n`) + sağda dar açıklama; mobilde alt alta. Metin `site_settings` `services.page` / `projects.page`.
- **Teknik çizim zemini** (`.tech-art`): `--navy-dark` + 28 px ızgara, çizgi rengi `--steel-pale`; kapak görseli varsa onu, yoksa `drawing_key` ile şema. Anahtar kümesi DB CHECK ve `src/ui/TechDrawing.tsx` ile aynı: konut · cati · kentsel · endustri · betonarme · epoksi · alcipan · tadilat · peyzaj · proje.
- **Hizmet grupları:** çelik (3 sütun kart), mühendislik (geniş iki sütunlu kart), inşaat (kompakt satır, 72 px çizim). Öne çıkanlar altın kısa çizgi ile (`.inc li::before`). Bağlantı satırı: "Detaylar →" + soluk "Projeleri gör".
- **Proje kartı:** aşama çipi sol üstte (tamamlandı yeşil, devam ediyor altın, tasarım lacivert), kategori mono etiket, başlık, konum, özet, yıl/alan/çelik/süre metası (mono değerler, bilinmeyen `—`), "Projeyi incele →". İlk kart "Tümü"de 2 sütun.
- **Süzgeç:** kategori çipleri adet rozetli (seçili: mürekkep zemin, altın adet), durum sekmeleri alt çizgili, sayaç mono. Mobilde çipler yatay kaydırma (K-92).
- **CTA bandı:** ızgaralı lacivert zemin, altın birincil düğme (`.btn-mark`), açık çelik çerçeveli telefon düğmesi. Altın yalnız burada ve seçili çip adedinde.
- Referanstan alınan: yerleşim, bölüm sırası, bilgi mimarisi. Alınmayan: açık "kâğıt" zemin, köşe yarıçapı, Archivo yazı tipi (04-DESIGN-RULES §2).
