# Faz 1 — Varsayım Deneyleri

> `02-ROUTING-I18N.md` sonunda listelenen 5 riskli varsayım, kod yazılmadan önce burada kayıtlı deneylerle sınandı.
> **Tarih:** 2026-09-18 · **Betikler:** `experiments/faz-01/` · **Sürümler:** Next 15.5.25 · next-intl 4.14.5 · @supabase/ssr 0.12.7 · PGlite 0.5.8 (Postgres 18.3)

## Özet

| # | Varsayım | Sonuç | Tasarıma etkisi |
|---|---|---|---|
| 1 | Middleware rewrite'ı ISR önbellek isabetini korur | ⚠️ **Kısmen** | **K-46** — `generateStaticParams` yayındaki *tüm* slug'ları döndürür |
| 2 | Geçirgen kök layout + kök `not-found.tsx` Next 15'te çalışır | ✅ Doğrulandı | Tasarım aynen uygulanır |
| 3 | Supabase çerez ön eki `sb-` | ✅ Doğrulandı | Erken çıkış kontrolü **ön ek** ile yazılır (çerez parçalanıyor) |
| 4 | RPC'deki `OR` dallanması ifade indeksini kullanır | ✅ Doğrulandı | Tasarım aynen uygulanır; Faz 2'de DB testiyle sabitlenir |
| 5 | `next/og` varsayılan fontu Türkçe glifleri kapsar | ✅ Doğrulandı | Marka fontu Faz 4'te ayrıca sınanır |

## #1 — Rewrite + ISR ⚠️

**Düzenek:** `experiments/faz-01/next-canary` · `next build && next start` · `x-nextjs-cache` başlığı + sayfaya gömülü render zaman damgası.

| Senaryo | Yol | Sonuç |
|---|---|---|
| Ön-üretilmiş + rewrite | `/tr/projeler/fabrika-celik-cati` | `HIT` ✅ |
| Ön-üretilmiş + rewrite + süre doldu | aynı, `revalidate=5` | `STALE` → arka planda yenilendi → `HIT` ✅ |
| On-demand, rewrite **yok** (kontrol) | `/en/projects/x` · `/tr/blog/x` | `MISS` → `HIT` ✅ |
| On-demand + rewrite | `/tr/projeler/x` | Her istekte yeniden render · `Cache-Control: private, no-store` ❌ |
| On-demand + rewrite, iç yol önceden ısıtılmış | `/tr/projects/x` ısıt → `/tr/projeler/x` | Yine her istekte render ❌ |

**Bulgu:** Rewrite, build'de ön-üretilmiş sayfalarda ISR'ı tümüyle korur. Bozulan tek şey, build anında var olmayan bir slug'ın ilk kez üretilip önbelleğe yazılmasıdır. Kontrol grupları değişkenin dil değil **rewrite** olduğunu gösterir. İç yolu ısıtmak çözmez.

**Dokümandaki B planı ters yöndeydi** ("ön üretimden vazgeç, yalnız on-demand") — bozuk olan on-demand tarafıdır. Yerine K-46 geldi.

**Açık kalan:** Bu sonuç `next start` içindir. Vercel'in kenar yönlendiricisi rewrite'ı fonksiyondan önce uygular ve farklı davranabilir. İlk Vercel dağıtımında kanarya ile `x-vercel-cache` ölçülür; sonuç buraya işlenir. K-46 her iki durumda da doğru çalışır.

## #2 — Geçirgen kök layout ✅

| İstek | Sonuç |
|---|---|
| `/` | 307 → `/tr` |
| `/tr` · `/en` | 200 · `<html lang>` doğru |
| `/tr/olmayan-route` | 404 · **dilli** 404 (`[...rest]` yakalayıcısı üzerinden) |
| `/olmayan-route` | 307 → `/tr/olmayan-route` → dilli 404 |
| `/olmayan.dosya` (matcher dışı) | 404 · **kök** 404, tek `<html>` (çift sarma yok) |
| `/de/herhangi` | 307 → `/tr/de/herhangi` → dilli 404 |

Kök `not-found.tsx` yalnız matcher'ın dışladığı (noktalı) yollarda görünür; kendi `<html>`'ini render etmesi sorun çıkarmıyor.

## #3 — Supabase çerez adı ✅

Ağ taklit edilerek `setSession` çağrıldı, `setAll`'a düşen adlar yakalandı:

```
sb-exifnifijxnrxagkqwam-auth-token.0   (3180 byte)
sb-exifnifijxnrxagkqwam-auth-token.1   (3180 byte)
sb-exifnifijxnrxagkqwam-auth-token.2   (621 byte)
```

**Dikkat edilecek iki şey:**
1. Oturum ~3 KB'ı aşınca çerez `.0 .1 .2` diye **parçalanır**. Erken çıkış kontrolü tam ad eşleşmesiyle yazılırsa büyük oturumlu kullanıcılar "çerezsiz" sayılır → `name.startsWith('sb-') && name.includes('-auth-token')`.
2. Adın ortası proje ref'idir; yerelde (`supabase start`) farklıdır. Kontrol ref'e **sabitlenmez**.

## #4 — İfade indeksi ✅

50.000 satır, locale başına kısmi benzersiz B-tree ifade indeksi, `plan_cache_mode = force_generic_plan` (PL/pgSQL içindeki parametreli sorgunun en kötü hâli):

| Biçim | Plan | Süre |
|---|---|---|
| `OR` dallanması | `BitmapOr` → 2× `Bitmap Index Scan` | 0.16 ms ✅ |
| `OR`, custom plan | `Index Scan` (sabit katlama) | 0.02 ms ✅ |
| `CASE` ifadesi | `Seq Scan`, 49.999 satır elendi | 9.4 ms ❌ |
| `IF` ile bölünmüş tek dal | `Index Scan` | 0.07 ms ✅ |

**Çekince:** PGlite Postgres 18.3'tür; Supabase projesi farklı ana sürümde olabilir. `BitmapOr` eski bir planlayıcı özelliğidir, risk düşük — yine de Faz 2'de aynı `EXPLAIN` gerçek sunucuda bir veritabanı testiyle sabitlenir.

## #5 — `next/og` Türkçe glif ✅

Özel font yüklenmeden `Çelik Konstrüksiyon İşleri · Ş Ğ Ü Ö İ Ç ş ğ ü ö ı ç · IĞDIR ıspanak İSTANBUL ışık` render edildi. Tüm glifler doğru; noktasız `ı` ve noktalı `İ` dahil, tofu yok. Çıktı: `experiments/faz-01/exp5-og-output.png`.

**Çekince:** Bu, varsayılan fontu doğrular. Faz 4'te marka fontu OG görsellerine girerse aynı test o fontla tekrarlanır.

## Deneyleri Yeniden Çalıştırma

```bash
cd experiments/faz-01 && npm install
node exp3-cookie.mjs
node exp4-index.mjs
cd next-canary && npm install && npm run build && npm run start   # :3100
node ../exp125-probe.mjs                                           # ayrı sekmede
```
