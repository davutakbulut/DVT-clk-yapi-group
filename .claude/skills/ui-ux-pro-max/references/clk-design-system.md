# CLK Yapı Group — Tasarım Sistemi (MASTER)

`search.py "steel construction industrial engineering corporate b2b" --design-system --variance 6 --motion 4 --density 3` çıktısı (2026-09-18) marka prototipiyle (`_archive/prototypes/homepage-v3-clk-rebrand.html`) birleştirildi. Marka prototipi kazanır; aracın önerisi yalnız boş bıraktığı eksenlerde uygulanır.

## Ürün ve iş

- Çelik konstrüksiyon (kentsel dönüşüm, İstanbul) · B2B/B2C karma: mülk sahipleri, müteahhitler, mimarlar.
- Sayfanın birincil işi: **güven + teklif talebi**. Kalıp: *Trust & Authority + Conversion* — hero (misyon/güvenilirlik) → kanıt (projeler, belgeler, istatistik) → çözüm özeti → tek net CTA yolu.

## Renk (semantik tokenlar `src/styles/theme.site.css`)

| Rol | Token | Değer | Not |
|---|---|---|---|
| Zemin | `--color-bg` | #F7F6F4 kâğıt | cream değil; nötr sıcak gri |
| Koyu bölüm | `--color-surface-dark` | #1B2A3D antrasit | header, hero, CTA bandı, footer |
| Metin | `--color-text` | #0F1315 | gövde `--color-text-muted` #3A4750 |
| Vurgu | `--color-accent` | #5C7FA3 çelik mavisi | zemin/çizgi; **metin için `--color-accent-text` #4A6A8C (5.21:1)** |
| Koyu zeminde vurgu | `--color-accent-on-dark` | #8FA9C4 | |

Aracın önerdiği "safety orange" ikinci vurgu **reddedildi**: marka tek vurgu renkli; bir bölümde en fazla iki vurgulu öğe.

## Tipografi

- Başlık **Archivo 800, font-stretch %116** (K-72; eski: Syne) (display `clamp(2.5rem … 5.25rem)`, `letter-spacing -0.02em`, `line-height 1.02`) · gövde **Geist** · mono **Geist Mono** yalnız teknik etiket (kicker, tarih, birim).
- Aracın "Plus Jakarta Sans" önerisi reddedildi (markanın fontu var). `latin-ext` zorunlu.
- Satır uzunluğu ≤ 68ch (`--prose-max`), gövde 16 px, satır 1.6.

## Yerleşim

```
HERO      tam ekran (100dvh) · kopya ALT-SOL · kicker → h1 (≤18ch) → lead (≤58ch) → tek CTA
          sahne: scroll-scrub video (masaüstü) / loop (mobil) / koyu desen + kademe motifi (video yok)
HEADER    hero üstünde şeffaf, 32 px kaydırınca antrasit (HeroOverlay)
BÖLÜM     numaralı kicker (01 — HAKKIMIZDA) · başlık sol · 7/5 iki sütun · görsel kaydırılmış tek çizgi çerçeve
KART GRUBU 1px ızgara (gap:1px; background: border) — gölge YOK, radius 0
CTA BANDI antrasit, ortalı, tek buton
```

Hizalama: sol. Ortalama yalnız CTA bandında ve hata sayfalarında.

## Hareket

- Tek orkestre giriş: hero satırları 0.9 s, 80 ms kademeli. Bölüm bazında fade-up **yok**.
- Kullanıcı eylemine yanıt veren geçişler 150–250 ms; `prefers-reduced-motion` globals.css'te süreyi sıfırlar.
- Mobilde ScrollTrigger pin **yasak** (CLAUDE.md); scrub yalnız `(hover: hover) and (min-width: 1024px)`.

## Kaçınılacaklar

Oyuncu ton · gizli referans/belge · mor-pembe AI gradyanı · SaaS kart kiti (yuvarlak kart + gri gölge) · her başlığın üstünde büyük harfli eyebrow (yalnız gerçek sıra/teknik veri) · başlıkta tek kelime renklendirme · buton metnine "→".

## Sayfa: Ana sayfa (Faz 6)

Hero + Hakkımızda + (Faz 7+) hizmet kartları, proje ızgarası, yorum karuseli, CTA bandı. Hero'nun tek "büyük" öğesi: video ya da kademe motifi; başka dekor eklenmez.
