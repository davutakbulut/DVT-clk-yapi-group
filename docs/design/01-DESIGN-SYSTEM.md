# Tasarım Sistemi

Marka kimliği `_archive/prototypes/homepage-v3-clk-rebrand.html` prototipinden devralındı ve sistemleştirildi.

## Renk

**K-113 (2026-10-13): palet logodan türetilir.** Kaynak: ürün sahibinin logo dosyaları (`alternatif logolar/`, üç varyant). Renkler pikselden ölçüldü ve ürün sahibinin ana sayfa prototipindeki CSS değerleriyle eşleştirildi.

### Logo varyantları → marka renkleri

| Varyant | Zemin | Kısa çubuk | Orta çubuk | Uzun çubuk + "CLK" | Ayraç | Alt yazı |
|---|---|---|---|---|---|---|
| **Ana (koyu)** | `#1F2D3E` lacivert | `#95BBE0` | `#B5D8FC` | `#F2F2F2` | `#3E5F80` | `#B5D8FC` |
| Tek renk | `#1E1F21` kömür | beyaz | beyaz | beyaz | beyaz | beyaz |
| Açık | `#F2F2F2` kâğıt | `#5980A7` | `#406180` | `#1E1F21` | `#D3D3D5` | `#406180` |

### Hiyerarşi (logonun çubukları)

Logodaki üç çubuk kısadan uzuna, soluktan parlağa yükselir. Sitedeki renk hiyerarşisi aynı basamakları izler:

| Kademe | Renk | Token | Nerede |
|---|---|---|---|
| 1 · En üst | beyaz `#F2F2F2` | `--color-text` | başlık, gövde metni, **birincil düğme zemini**, logonun uzun çubuğu |
| 2 · Vurgu | gök mavisi `#B5D8FC` | `--color-accent`, `--color-accent-text`, `--mark` | kicker/numara rozeti, bağlantı, seçili çip, ikon, bant içi birincil düğme, logonun orta çubuğu |
| 3 · İkincil vurgu | `#95BBE0` | `--color-accent-2` | ok işaretleri, küçük göstergeler, logonun kısa çubuğu |
| 4 · Yapı | `#3E5F80` · `#33475E` | `--color-border-strong` · `--color-border` | güçlü çizgi (logo ayracı) · ince çizgi |
| 5 · İkincil metin | `#A9BBCE` · `#93A7BC` | `--color-text-muted` · `--color-text-subtle` | açıklama · ipucu |

Zemin kademeleri (derinden yükseğe): `#121B27` en derin (`--color-surface-darker`: ürün şeridi) → `#182433` gömük bant (`--color-surface-dark`, `--navy-dark`: header, footer, hero, çizim paneli, CTA/iletişim bandı) → **`#1F2D3E` sayfa** (`--color-bg`, logo zemini) → `#263850` kart/panel (`--color-surface`) → `#2E4563` yükseltilmiş (`--color-surface-raised`, ikon kutusu).

**Altın (`#f2c230`) kaldırıldı** — logoda yok. Eskiden altın olan yerler (seçili çip, bant düğmesi, madde çizgisi, "devam ediyor" çipi) artık gök mavisi; üstündeki metin `--ink` (`#182433`, 10,6:1).

### Primitive (ham değerler) — `src/styles/tokens.primitive.css`

```css
--brand-navy #1f2d3e   --brand-navy-2 #263850   --brand-navy-3 #182433   --brand-navy-4 #121b27
--brand-sky  #b5d8fc   --brand-sky-2  #95bbe0   --brand-white  #f2f2f2
--brand-divider #3e5f80   --brand-line #33475e
--brand-paper #f2f2f2  --brand-charcoal #1e1f21  --brand-blue #406180  --brand-blue-2 #5980a7   /* açık zeminli logo */
```

Eski adlar (`--paper-dark`, `--surface-dark`, `--steel-pale`, `--mark`, `--turq*`, `--navy-dark`, `--ink` …) bu değerlere bağlandı; bileşenler değişmedi.

### Kontrast (ölçüldü)

| Çift | Oran | Kullanım |
|---|---|---|
| `#F2F2F2` / `#1F2D3E` | 12,5:1 | metin / sayfa |
| `#F2F2F2` / `#263850` | 10,6:1 | metin / kart |
| `#B5D8FC` / `#1F2D3E` | 9,4:1 | vurgu metni / sayfa |
| `#95BBE0` / `#1F2D3E` | 7,0:1 | ikincil vurgu / sayfa |
| `#A9BBCE` / `#263850` | 6,1:1 | ikincil metin / kart |
| `#93A7BC` / `#263850` | 4,8:1 | ipucu / kart (alt sınır) |
| `#182433` / `#B5D8FC` | 10,6:1 | gök mavisi düğme üstünde metin |
| `#406180` / `#F2F2F2` | 5,8:1 | açık zeminde vurgu metni (e-posta, yazdırma, panel) |
| `#5980A7` / `#F2F2F2` | 3,7:1 | açık zeminde **yalnız** çizgi/ikon/büyük metin |

**Kural:** gök mavisi (`#B5D8FC`) **açık/beyaz zemin üstünde metin olarak kullanılmaz** (1,3:1). Beyaz zeminli seçili çipte ikincil bilgi `--brand-blue` ile yazılır. Açık zeminde (e-posta, yazdırma, panel) açık logonun renkleri geçerlidir.

### Semantic (kullanım amaçlı)

Bileşenler **yalnız bunları** kullanır, ham renge doğrudan erişmez:

```css
--color-bg · --color-surface · --color-surface-raised · --color-surface-dark · --color-surface-darker
--color-text · --color-text-muted · --color-text-subtle · --color-text-inverse
--color-accent · --color-accent-hover · --color-accent-text · --color-accent-2
--color-border · --color-border-strong
--color-success · --color-warning · --color-danger · --color-info
```

**Neden bu ayrım:** Marka rengi değişirse tek yerden değişir, bileşenlere dokunulmaz — K-113 bunun kanıtı: palet iki dosyada değişti.

**Uygulama dışı yüzeyler:** e-posta şablonu (`core/mail/render.ts`) ve OAuth ara sayfası açık logo paletini kullanır (kâğıt `#F2F2F2`, mürekkep `#1E1F21`, düğme/bağlantı `#406180`, üst çizgi `#5980A7`). Panel (`theme.admin.css`): birincil `#1F2D3E`, odak halkası `#5980A7`, grafik rampası `#95BBE0 → #1F2D3E`. Favicon: lacivert zemin + üç çubuk.

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

**`font-display: optional` (Faz 4 ölçümü):** `swap` ile h1 önce yedek fontla boyanıp marka fontu gelince yeniden boyanıyor, yavaş 4G'de LCP 3,7 sn'ye kayıyordu. `optional` ile font kısa blok süresinde gelmezse o görünümde metrik uyumlu yedek kalır (FOUT yok, CLS yok); font önbelleğe alınır, sonraki sayfalarda marka fontu görünür. Mono yalnız küçük etiketlerde olduğu için ön yüklenmez. Ağırlıklar: Syne 700/800 · Plex Sans 400/500/600 · Plex Mono 400.

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
