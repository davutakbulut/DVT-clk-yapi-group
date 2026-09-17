# Tasarım Sistemi

Marka kimliği `_archive/prototypes/homepage-v3-clk-rebrand.html` prototipinden devralındı ve sistemleştirildi.

## Renk

### Primitive (ham değerler)

```css
--ink         #0F1315   en koyu, ana metin
--bar-dark    #14181C   koyu şerit
--charcoal    #1B2A3D   antrasit — başlık, koyu bölüm zemini
--steel       #3A4750   ikincil metin
--steel-light #5C6B75   üçüncül metin, ipucu
--turq        #5C7FA3   marka vurgu rengi
--turq-deep   #4A6A8C   ← metin için koyulaştırılmış varyant
--turq-light  #8FA9C4   koyu zeminde vurgu
--paper       #F7F6F4   ana zemin
--line        #2B3A4E   koyu zeminde çizgi
--line-light  #D8D3C8   açık zeminde çizgi
```

### ⚠️ Kontrast Bulgusu

`--turq` (#5C7FA3), `--paper` (#F7F6F4) üzerinde **3.87:1** kontrast veriyor.

| Kullanım | Gereken | Durum |
|---|---|---|
| Normal metin (< 24px) | 4.5:1 | ❌ **Yetersiz** |
| Büyük metin (≥ 24px veya ≥ 19px bold) | 3:1 | ✅ Geçer |
| İkon, çizgi, buton zemini | 3:1 | ✅ Geçer |

**Kural:** Turkuaz gövde metninde ve küçük etiketlerde **kullanılamaz**. Metin gerektiğinde `--turq-deep` kullanılır; kesin değeri Faz 4'te ölçülerek doğrulanacak (hedef ≥ 4.5:1).

**Neden önemli:** WCAG AA uyumu yasal bir gereklilik değil ama erişilebilirlik denetiminde (axe) hata olarak çıkar ve gerçek kullanıcıları etkiler — düşük kontrastlı metni yaşlı kullanıcılar ve parlak ışıkta telefon bakanlar okuyamaz.

### Semantic (kullanım amaçlı)

Bileşenler **yalnız bunları** kullanır, ham renge doğrudan erişmez:

```css
--color-bg · --color-surface · --color-surface-raised
--color-text · --color-text-muted · --color-text-subtle · --color-text-inverse
--color-accent · --color-accent-hover · --color-accent-text
--color-border · --color-border-strong
--color-success · --color-warning · --color-danger · --color-info
```

**Neden bu ayrım:** Marka rengi değişirse tek yerden değişir, bileşenlere dokunulmaz. Ayrıca `--color-accent-text` (turq-deep) ile `--color-accent` (turq) farklı olabilir — bileşen hangisini kullanacağını bilmek zorunda kalmaz.

## Tipografi

| Rol | Font | Ağırlık | Kullanım |
|---|---|---|---|
| Başlık | **Syne** | 600 / 700 / 800 | h1–h3, marka, istatistik rakamları |
| Gövde | **IBM Plex Sans** | 400 / 500 / 600 | paragraf, buton, form |
| Etiket | **IBM Plex Mono** | 400 / 500 | eyebrow, kicker, teknik veri |

Her ikisi de açık lisanslı (SIL OFL) — ticari kullanımda sorun yok.

### Akışkan ölçek

```css
--fs-display  clamp(2.25rem, 1.2rem + 5.2vw, 4.5rem)     /* h1 */
--fs-h2       clamp(1.75rem, 1.1rem + 2.8vw, 2.75rem)
--fs-h3       clamp(1.25rem, 1.0rem + 1.2vw, 1.75rem)
--fs-body-lg  clamp(1.0625rem, 1rem + 0.3vw, 1.1875rem)
--fs-body     1rem
--fs-sm       0.875rem
--fs-xs       0.8125rem
```

360px → 1920px arası kesintisiz ölçeklenir; kırılım noktasında sıçrama olmaz.

**Satır yüksekliği:** başlık 1.05–1.15 · gövde 1.55–1.65
**Ölçü genişliği:** gövde metninde 65–75 karakter (`--prose-max: 68ch`)

### ⚠️ Türkçe glif zorunluluğu

`next/font` ile **`latin-ext` alt kümesi** yüklenir. Varsayılan `latin` alt kümesi **ş, ğ, İ, ı, ç, ö, ü** harflerini içermez — Türkçe metin kutu (tofu) olarak render edilir.

Self-host edilir: harici istek yok, preload edilebilir, CLS oluşmaz.

## Aralık · Yuvarlaklık · Gölge · Hareket

```css
/* 4 tabanlı ölçek */
4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128

--section-y    clamp(3.5rem, 2rem + 6vw, 7rem)
--gutter       16px (mobil) → 28px (masaüstü)
--content-max  1180px
--prose-max    68ch

/* Radius — keskin, endüstriyel karakter */
0 · 2px · 4px · tam yuvarlak (avatar, rozet)

/* Gölge — 3 seviye, çizgi ağırlıklı tasarımda az kullanılır */

/* Hareket */
--dur-fast  150ms
--dur       250ms
--dur-slow  400ms
--ease-out  cubic-bezier(.22, .61, .36, 1)
```

**Radius 0 neden:** Çelik konstrüksiyon işi; keskin köşeler malzemenin karakterini yansıtıyor. Prototipte de böyle kurulmuş, korundu.

## Hiyerarşi Kuralları

- Sayfada **tek `h1`** — başlık seviyeleri atlanmaz (h2'den h4'e sıçranmaz)
- Bir ekranda **en fazla bir birincil CTA** — ikincil eylemler ghost/outline
- Vurgu rengi bir bölümde **en fazla iki öğede** — fazlası vurgu olmaktan çıkarır
- Bölüm başlıkları numaralı kicker ile: `01 — HİZMETLER`
- `:focus-visible` **her etkileşimli öğede görünür**, zeminden 3:1 kontrastlı

**Odak halkası neden pazarlık konusu değil:** Klavyeyle gezinen kullanıcı (motor engelli, güç kullanıcı, ekran okuyucu) nerede olduğunu yalnız odak halkasından anlar. `outline: none` yazmak erişilebilirliği tek satırda bitirir.
