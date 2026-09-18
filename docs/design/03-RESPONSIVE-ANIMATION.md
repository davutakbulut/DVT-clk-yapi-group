# Responsive ve Scroll Animasyon

Projenin en riskli görsel parçası. Planlanmadan yazılırsa mobilde kırılır.

## Kırılım Noktaları

| Ad | Genişlik | Hedef |
|---|---|---|
| `xs` | 360–479 | küçük telefon (**referans cihaz**) |
| `sm` | 480–767 | büyük telefon |
| `md` | 768–1023 | tablet dikey |
| `lg` | 1024–1119 | tablet yatay / küçük dizüstü |
| **`xl`** | **1120–1439** | **drawer → yatay menü geçişi burada** |
| `2xl` | 1440+ | geniş masaüstü |

**1120px neden geçiş noktası:** Türkçe menü etiketleri uzun ("Çelik Konstrüksiyon Sistemleri"). 1024–1280px arasında ortadaki logoya çarpıyorlar. Daha erken drawer'a düşmek, sıkışık bir menüyü zorlamaktan güvenli.

## Bölüm Davranışı

| Bölüm | Mobil (<768) | Tablet (768–1023) | Masaüstü (1024+) |
|---|---|---|---|
| **Header** | Üst bar (dil + sepet) · hamburger + logo · hesap | Üst bar · hamburger + logo · hesap + CTA | Logo başta · menü yanında · sağda dil + sepet + hesap + CTA (< 1280: dil + sepet üst barda) — K-71 |
| **Video Hero** | `100dvh` · **scrub yok, otomatik oynatma** | scrub, düşük çözünürlük (854p `-g 1`) | Tam scrub (1280p `-g 1`) · CSS sticky sahne, 300dvh |
| Hakkımızda | Tek sütun, görsel üstte | 2 sütun | 2 sütun + kayan sayaçlar |
| Hizmetler | Dikey kart yığını | 2'li ızgara | Yatay carousel (pin + scrub) |
| Projeler / Ürünler | 1 sütun | 2 sütun | 3 sütun, hover zoom |
| Blog | 1 sütun | 2 sütun | 3 sütun |
| Teklif formu | Tek sütun, tam genişlik | Ortalanmış | 2 sütun (bilgi \| form) |
| Yorumlar | Tek kart, kaydırmalı | 1 vurgulu + kenarlar kırpık | 3'lü, orta vurgulu |
| **Fiyat / varyant tablosu** | **Yatay kaydırmalı** | Yatay kaydırmalı | Tam tablo |
| Footer | Akordeon sütunlar | 2×2 | 4 sütun |

**Tablolar neden yatay kaydırmalı:** Teknik özellik ve fiyat tabloları 5–7 sütunlu. Mobilde sıkıştırmak okunmaz hale getirir; kart görünümüne çevirmek ise sütunlar arası karşılaştırmayı imkânsızlaştırır. Yatay kaydırma, veriyi olduğu gibi korur.

## Animasyon Kuralları

### `gsap.matchMedia()` zorunlu

```js
const mm = gsap.matchMedia();

mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
  // pin + scrub video, yatay kaydırma
});

mm.add("(max-width: 1023px)", () => {
  // hafif fade/slide — pin YOK, scrub YOK
});

mm.add("(prefers-reduced-motion: reduce)", () => {
  // animasyon yok, her şey son hâlinde görünür
});
```

**Elle `window.innerWidth` kontrolü yasak.** `matchMedia` kırılım değiştiğinde eski animasyonları otomatik temizler; elle kontrol orientation değişiminde sızıntı yapar ve animasyonlar üst üste binerek yavaşlar.

### Bağlayıcı kurallar

| Kural | Neden |
|---|---|
| **Mobilde `pin` kullanılmaz** | Adres çubuğu gizlenip görününce viewport yüksekliği değişir, pin kayar |
| **`100vh` değil `100dvh`** | Mobil tarayıcı çubuğu yüzünden hero taşar |
| `orientationchange`/`resize` sonrası debounce'lu `ScrollTrigger.refresh()` | Tetikleyici konumları yeniden hesaplanmalı |
| Görseller yüklendikten sonra tekrar `refresh()` | Görsel yüklenmeden hesaplanan konumlar yanlış olur |
| Yalnız `transform` + `opacity` animasyonu | `top/left/width/height` layout thrash yaratır |
| `will-change` yalnız animasyon süresince | Kalıcı bırakmak bellek tüketir |
| **Giriş animasyonu içeriği gizlememeli** | `opacity:0` ile başlayan blok, JS yüklenmezse **kalıcı görünmez** kalır |
| `@media (hover: hover)` | Dokunmatikte hover efekti yapışık kalır |
| `env(safe-area-inset-*)` | iPhone çentiği — WhatsApp butonu ve drawer |

### `.js-ready` deseni

```css
.reveal { opacity: 1; }                        /* JS yoksa görünür */
.js-ready .reveal { opacity: 0; }              /* JS varsa animasyona hazır */
```

JavaScript yüklendiğinde `<html>`'e `.js-ready` eklenir. **Bu olmadan:** JS hata verirse veya yavaş yüklenirse içerik kalıcı olarak görünmez kalır — hem kullanıcı hem arama motoru boş sayfa görür.

## Hero Video Stratejisi

| Cihaz | Yaklaşım |
|---|---|
| **Masaüstü** | ffmpeg `-g 1` (her kare keyframe) → `currentTime` scrub, tereyağı gibi |
| Tablet | Aynı, düşük bitrate sürüm |
| **iOS Safari** | Scrub denenir; `requestVideoFrameCallback` ile kare düşüşü ölçülür, eşik altındaysa **otomatik oynatan döngüye düşülür** |
| Düşük bellekli Android | Poster + otomatik oynatma |
| `prefers-reduced-motion` | **Yalnız poster** — video hiç yüklenmez |
| `saveData` | Poster |

**`-g 1` neden gerekli:** Normal videoda keyframe'ler saniyede bir olur; aradaki kareler öncekine göre hesaplanır. `currentTime` ile rastgele bir ana atlamak, tarayıcıyı en yakın keyframe'den itibaren yeniden çözmeye zorlar — scrub takılır. Her kareyi keyframe yapmak dosyayı 3–4 kat büyütür ama 6 saniyelik bir videoda bu kabul edilebilir.

**Masaüstü ve mobil için ayrı encode**, `<source media=...>` ile seçilir.

## İlk Açılış — Loader Yok

```
0 ms    HTML + kritik CSS → header, başlık, CTA, poster ZATEN YERİNDE (ISR)
        ↓ poster görseli LCP olarak sayılır
~200ms  Fontlar devreye girer (self-host + preload, FOUT yok)
arka    Video indirilir; hazır olunca posterin üzerine çapraz geçişle oturur
planda  GSAP + Lenis requestIdleCallback ile yüklenir
```

- Ziyaretçi **hiçbir aşamada boş ekran görmez**
- Video yüklenemezse poster kalır, sayfa tam çalışır
- **Poster = videonun ilk karesi** → geçiş fark edilmez
- Poster `priority` + sabit en-boy oranı → **CLS sıfır**

**Neden loader değil:** Açılış perdesi LCP'yi geciktirir ve arama motoru botunun içeriği beklemesine yol açar. Marka hissi videonun kendisiyle veriliyor; perdeye gerek yok.

## Lenis Yerleşimi

**`(marketing)/layout.tsx` içinde, bir kez.** `template.tsx`'e konursa her gezinmede yeniden bağlanır; üst üste binen RAF döngüleri ~10 gezinmeden sonra ortaya çıkan, teşhisi çok zor bir yavaşlama yaratır.

- Her `pathname` değişiminde: `lenis.scrollTo(0, {immediate:true})` + `ScrollTrigger.refresh()`
- `<Link scroll={false}>` — Next'in kendi scroll geri yüklemesi Lenis'le çakışır
- Drawer açılınca `lenis.stop()`, kapanınca `lenis.start()` — `overflow:hidden` tek başına Lenis'i durdurmaz
- **Konfigüratör route grubunda Lenis yok** — R3F canvas'ıyla çakışıyor

## GSAP Temizliği

`useGSAP` (`@gsap/react`) ile scope kullanılır veya `gsap.context()` + `ctx.revert()`.

**Temizlenmeyen ScrollTrigger'lar**, "siteyi bir süre gezdikten sonra yavaşlıyor" şikâyetinin bir numaralı sebebidir — her gezinmede yenileri eklenir, eskiler ölmez.
