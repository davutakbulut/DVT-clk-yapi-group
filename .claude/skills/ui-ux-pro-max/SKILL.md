---
name: ui-ux-pro-max
description: "UI/UX design intelligence for web, mobile, and desktop. Use when designing, building, reviewing, or fixing interfaces: pages, components, design systems, accessibility, interaction, responsive layout, typography, color, charts, and stack-specific UI implementation. This repo carries the rule index (references/quick-reference.md) and the design system decided for CLK Yapı Group (references/clk-design-system.md)."
source: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (NextLevelBuilder, MIT) — GitHub'ın en çok yıldızlı tasarım skill'i (~127k ★, Eylül 2026)
---

# UI/UX Pro Max — Design Intelligence (repo kopyası)

Bu klasör üst kaynağın **kural metinlerini** taşır; Python arama motoru ve CSV veritabanı (79 stil, 192 palet, 74 font çifti, 119 UX kuralı, 25 grafik, 22 stack) depoya alınmadı. Tam sürüm için Claude Code'da:

```
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```

## Ne zaman uygulanır

Görev **arayüz yapısı, görsel tasarım kararı, etkileşim kalıbı ya da kullanıcı deneyimi kalitesi** içeriyorsa: yeni sayfa, bileşen üretimi/yeniden yazımı, renk/tipografi/aralık/yerleşim seçimi, UX/erişilebilirlik/tutarlılık incelemesi, gezinme/animasyon/duyarlı davranış, algılanan kalite. Salt arka uç, API/veritabanı, görsel olmayan performans ve altyapı işlerinde atlanır — görünüş, his, hareket ya da etkileşim değişmiyorsa.

## Öncelik sırasına göre kural kategorileri

*1→10 sırasıyla hangi kategoriye önce bakılacağına karar verilir. Tam kural listesi `references/quick-reference.md` içindedir; her seferinde değil, gerektiğinde okunur.*

| Öncelik | Kategori | Etki | Olmazsa olmaz | Kaçınılacak |
|---|---|---|---|---|
| 1 | Erişilebilirlik | KRİTİK | Kontrast 4.5:1, alt metin, klavye, aria etiketleri | Odak halkasını kaldırmak, etiketsiz ikon buton |
| 2 | Dokunma & Etkileşim | KRİTİK | 44×44 px, 8 px+ boşluk, yükleme geri bildirimi | Yalnız hover'a dayanmak, 0 ms durum geçişi |
| 3 | Performans | YÜKSEK | WebP/AVIF, lazy load, yer ayırma (CLS < 0.1) | Layout thrashing, CLS |
| 4 | Stil seçimi | YÜKSEK | Ürün tipine uygun stil, tutarlılık, SVG ikon | Flat/skeuomorphic karışımı, emoji ikon |
| 5 | Yerleşim & Duyarlılık | YÜKSEK | Mobile-first, viewport meta, yatay kaydırma yok | Yatay kaydırma, sabit px genişlik, zoom kapatma |
| 6 | Tipografi & Renk | ORTA | 16 px taban, 1.5 satır yüksekliği, semantik token | 12 px altı gövde, gri üstüne gri, bileşende ham hex |
| 7 | Animasyon | ORTA | Bağlama göre süre, anlam taşıyan hareket | Tek süre, width/height animasyonu, reduced-motion yok |
| 8 | Form & Geri bildirim | ORTA | Görünür etiket, alanın yanında hata, yardımcı metin | Yalnız placeholder etiket, yalnız üstte hata |
| 9 | Gezinme | YÜKSEK | Öngörülebilir geri, alt gezinme ≤5, derin bağlantı | Aşırı yüklü gezinme, bozuk geri |
| 10 | Grafik & Veri | DÜŞÜK | Lejant, tooltip, erişilebilir renk | Anlamı yalnız renkle vermek |

## Akış

1. **Gereksinim:** ürün tipi, hedef kitle, stil anahtar kelimeleri, stack (bu depo: Next.js 15 + Tailwind v4; site yüzeyi `src/ui`, admin yüzeyi shadcn).
2. **Tasarım sistemi:** yeni sayfa/bölümde önce `references/clk-design-system.md` okunur (kararlaştırılmış palet, tipografi, yerleşim, kaçınılacaklar). Master varsa ezilmez; sayfa özel kural gerekiyorsa aynı dosyaya "Sayfa: …" bölümü eklenir.
3. **Ayrıntı:** ilgili kategoriyi `quick-reference.md`'den tara; tek bir gözlemlenebilir sonucu hedefle ("hata özeti odak", "chip taşması") — genel bir kuralı özel bir etkileşim için kabul etme.
4. **Teslim öncesi kontrol:** emoji ikon yok · tıklanabilirde cursor-pointer · 150–300 ms hover geçişi · açık temada 4.5:1 · klavye odağı görünür · reduced-motion · 375/768/1024/1440 duyarlı.

Arama sonuçları öneridir; kullanıcının ve deponun kurallarını (CLAUDE.md) asla geçersiz kılmaz. Proje verisi sorgulara yazılmaz.
