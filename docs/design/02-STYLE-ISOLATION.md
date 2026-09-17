# Stil İzolasyonu — Ön Yüz / Admin

**Soru:** Ön yüzde yaptığım değişiklik admin'i bozar mı?
**Cevap:** Hayır — baştan ayrıldılar.

## Dosya Yapısı

```
styles/
├─ tokens.primitive.css   ham değerler (aralık, radius, süre) — PAYLAŞILAN
├─ theme.site.css         ön yüz semantik tokenları  → [data-surface="site"]
├─ theme.admin.css        admin semantik tokenları   → [data-surface="admin"]
└─ globals.css            reset + katman sırası
```

`<html data-surface="site">` ön yüzde, `<html data-surface="admin">` panelde. Semantik tokenlar her iki blokta **ayrı ayrı** tanımlanır.

```css
[data-surface="site"] {
  --color-accent: var(--turq);
  --color-bg: var(--paper);
}
[data-surface="admin"] {
  --color-accent: var(--admin-blue);
  --color-bg: var(--admin-gray-50);
}
```

Ön yüzün marka rengini değiştirmek admin'e dokunmaz.

## Bileşen Ağaçları Ayrı

```
src/modules/<modul>/components/site/     ön yüz
src/modules/<modul>/components/admin/    panel
src/ui/                                  ön yüz tasarım sistemi ilkelleri
src/components/ui/                       shadcn — YALNIZ admin
```

**Ortak buton yok. Kasıtlı.**

Ön yüz butonu markalı, büyük, animasyonlu; admin butonu yoğun, küçük, hızlı. Tek bileşende birleştirmek ikisini de bozar — her yeni varyant koşulu bir diğerini kısıtlar. İki ayrı bileşen, iki ayrı amaca hizmet eder.

## shadcn/ui Yalnız Admin'de

`src/components/ui/` klasörü admin'e aittir. Ön yüz kendi bileşenlerini kullanır.

**Neden:** shadcn bileşenleri kopyalanarak gelir ve güncellenir. Ön yüz onlara bağımlı olsaydı, bir shadcn güncellemesi marka sayfalarını bozabilirdi. Ayrıca shadcn'in nötr tasarım dili, markalı ön yüzle çakışıyor.

## ESLint Sınır Kuralı

```js
// components/admin → components/site  ❌ hata
// components/site  → components/ui    ❌ hata (shadcn admin'e ait)
```

Çapraz import **derleme hatası** verir. Kazara bağımlılık insan gözüne değil makineye bırakılır.

## Tailwind v4 Katmanları

```css
@layer reset, tokens, base, components, utilities;
```

Katman sırası açıkça tanımlanır — özgüllük savaşları ve `!important` ihtiyacı böyle önlenir.

## Gerçekten Paylaşılanlar

Yalnız üç şey:

1. **Token primitive'leri** — aralık ölçeği, radius, süre. Renk ve tipografi paylaşılmaz
2. `lib/` yardımcıları — tarih biçimleme, para birimi, slug üretimi
3. `types/` — veritabanı tipleri, ortak arayüzler

Bunlar tasarımdan bağımsız, saf mantık parçalarıdır.
