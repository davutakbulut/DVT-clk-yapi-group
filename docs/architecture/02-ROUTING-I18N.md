# Routing ve Çok Dillilik

## İki Temel Karar

**1. Klasör adları İngilizce, URL'ler çevrili.**
`app/[locale]/services/[slug]` klasörü, `next-intl` pathnames haritasıyla `/tr/hizmetler/...` ve `/en/services/...` üretir. Türkçe kullanıcı asla İngilizce segment görmez.

*Neden:* Klasör adları `pathnames` anahtarlarıyla birebir eşleşmek zorunda. ASCII İngilizce adlar, macOS (büyük/küçük harfe duyarsız) ile Vercel'in Linux build makinesi (duyarlı) arasındaki kırılmayı önler.

**2. `/admin` locale dışında.**
`app/admin/...`, `app/[locale]/admin/...` değil. next-intl middleware `/admin`'e hiç dokunmaz.

*Neden:* Aksi hâlde `/admin` → `/tr/admin` yönlendirmesi auth kapısıyla çakışır. Panel dili kullanıcı tercihine göre çerezden okunup `NextIntlClientProvider`'a elle verilir.

## Pathnames Haritası

`src/i18n/routing.ts`:

```ts
export const routing = defineRouting({
  locales: ['tr', 'en'],
  defaultLocale: 'tr',
  localePrefix: 'always',
  localeDetection: false,        // ← bilinçli
  pathnames: {
    '/':                          '/',
    '/services':                  { tr: '/hizmetler',        en: '/services' },
    '/services/[slug]':           { tr: '/hizmetler/[slug]', en: '/services/[slug]' },
    '/products':                  { tr: '/urunler',          en: '/products' },
    '/products/category/[slug]':  { tr: '/urunler/kategori/[slug]', en: '/products/category/[slug]' },
    '/products/[slug]':           { tr: '/urunler/[slug]',   en: '/products/[slug]' },
    '/quote-basket':              { tr: '/teklif-sepeti',    en: '/quote-basket' },
    '/solutions/[slug]':          { tr: '/cozumler/[slug]',  en: '/solutions/[slug]' },
    '/pricing/[slug]':            { tr: '/fiyatlar/[slug]',  en: '/pricing/[slug]' },
    '/projects/[slug]':           { tr: '/projeler/[slug]',  en: '/projects/[slug]' },
    '/blog/[slug]':               { tr: '/blog/[slug]',      en: '/blog/[slug]' },
    '/configurator':              { tr: '/konfigurator',     en: '/configurator' },
    // …
  }
} as const);
```

**`as const` zorunlu** — olmadan `pathnames` tip daralması yapmaz, `Link href` otomatik tamamlaması `string`'e düşer ve derleme zamanı güvencesi kaybolur.

**`localeDetection: false` bilinçli:** Açık olsaydı tarayıcısı `Accept-Language: en-US` gönderen bir Türk ziyaretçi `/en`'e düşerdi. TR öncelikli bir marka için yanlış; ayrıca `/` adresini crawler ve edge önbelleği için belirsizleştirir. Kapalıyken `/` her zaman `/tr`'ye yönlendirir; kullanıcı elle dil değiştirdiğinde `NEXT_LOCALE` çerezi devreye girer.

## İstek Nasıl Çözülür

```
1. Tarayıcı  /tr/projeler/fabrika-celik-cati  ister
2. Middleware  tr sütununda /projeler/[slug] ile eşleşir
               → /tr/projects/fabrika-celik-cati  olarak REWRITE eder (yönlendirme değil)
3. Next.js   app/[locale]/(marketing)/projects/[slug]/page.tsx
             params = { locale: 'tr', slug: 'fabrika-celik-cati' }
```

> ⚠️ **En kritik sonuç:** next-intl yalnız **sabit segmentleri** çevirir. `[slug]` değeri olduğu gibi geçer ve **asla çevrilmez**. Framework `fabrika-celik-cati` ↔ `factory-steel-roof` eşleşmesini bilmez. Ürettiğiniz her bağlantı, doğru dildeki slug'ı **veritabanından almış olmalı**.

Bonus: İç yol `/tr/projects/...` doğrudan istenirse next-intl 307 ile `/tr/projeler/...`'ye yönlendirir — çift içerik koruması ücretsiz gelir.

## Slug Çözümleme (JSONB)

### Şema

```sql
slug              jsonb not null,   -- {"tr":"fabrika-celik-cati","en":"factory-steel-roof"}
published_locales text[] not null default '{}',
```

### İndeks — locale başına B-tree ifade indeksi

```sql
create unique index projects_slug_tr_uq on projects ((slug->>'tr'))
  where slug->>'tr' is not null;
create unique index projects_slug_en_uq on projects ((slug->>'en'))
  where slug->>'en' is not null;
```

**Neden GIN değil:** GIN benzersizlik uygulayamaz. İki projenin aynı Türkçe slug'ı almasını yalnız bu indeks engeller. Ayrıca tek anahtar eşitliği için B-tree daha hızlı ve daha küçüktür.

**Birebir ifade kuralı:** Postgres, ifade indeksini yalnız sorgudaki ifade indekstekiyle **metin olarak aynı** olduğunda kullanır.

```sql
slug->>'tr'           ✅ indeks kullanılır
slug->'tr'::text      ❌ kullanılmaz
(slug#>>'{tr}')       ❌ kullanılmaz
lower(slug->>'tr')    ❌ kullanılmaz
```

### RPC ile çözümleme

Tek gidişte içerik + alternatif diller + ilgili kayıtlar alınır.

> ⚠️ **`CASE` ifadesi indeksi bozar.** Bunun yerine `OR` dallanması yazılır — Postgres bunu iki ifade indeksi üzerinde BitmapOr'a çevirebilir:

```sql
where (p_locale = 'tr' and p.slug->>'tr' = p_slug)
   or (p_locale = 'en' and p.slug->>'en' = p_slug)
```

`EXPLAIN (ANALYZE, BUFFERS)` ile doğrulanır ve bir veritabanı testiyle sabitlenir. Sessiz tam tablo taramasına düşmenin en olası yeri burasıdır.

### Slug geçmişi → 308

```sql
create table slug_history (
  entity_type text, entity_id uuid, locale text, old_slug text,
  unique (entity_type, locale, old_slug)
);
```

`AFTER UPDATE` tetikleyicisi slug değiştiğinde kayıt bırakır. Sayfa önce güncel slug'ı arar, bulamazsa geçmişe bakar ve `permanentRedirect` (308) uygular.

### Çeviri yoksa ne olur

| Durum | Davranış |
|---|---|
| `/en/projects/<tr-slug>` — EN hiç çevrilmemiş | **404** |
| EN satırı var ama `en` ∉ `published_locales` | **404** |
| `/en/projects/<eski-en-slug>` | **308** (slug_history) |
| Dil değiştirici, EN karşılığı olmayan sayfada | `/en/projects` (bölüm listesi) + bilgilendirme |
| `hreflang` — çevrilmemiş dil | **Hiç yazılmaz** |

**Neden Türkçe içeriği İngilizce URL'de göstermiyoruz:** Klasik ince içerik / çift içerik cezası. Ayrıca hreflang kümesini geçersiz kılar.

## `generateStaticParams` + ISR

```ts
// app/[locale]/layout.tsx
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// app/[locale]/(marketing)/projects/[slug]/page.tsx
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams({ params: { locale } }) {
  const rows = await fetchPublishedProjects();   // anon key + public RLS politikası
  return rows
    .filter(r => r.published_locales.includes(locale) && r.slug?.[locale])
    .map(r => ({ slug: r.slug[locale] }));
}
```

- **`generateStaticParams` yayındaki TÜM slug'ları döndürür, alt küme değil (K-46).** Rewrite edilen yolda on-demand ISR önbelleğe yazmıyor; build'de üretilmeyen sayfa her istekte render edilir
- Dönen `slug` o dilin kendi slug'ıdır ve **iç yola** verilir (`/tr/projects/...`); middleware rewrite'ı dış adresten oraya düşer
- Build'de Supabase oturumu yok → anon key + `status = 'published'` RLS politikası kullanılır. **Service-role anahtarı build'e verilmez**
- Next 15 varsayılan fetch önbelleğini kaldırdı — her okuma `unstable_cache` ile açıkça etiketlenir
- Zaman tabanlı yerine **etiket tabanlı geçersizleştirme** tercih edilir: kurumsal içerik nadiren değişir ama değiştiğinde anında yayınlanmalı

## Dil Değiştirici

### Sorun

`usePathname()` **iç** yolu, mevcut dilin slug'ı doldurulmuş hâlde döner: `/projects/fabrika-celik-cati`. Bunu `{locale:'en'}` ile değiştirmek `/en/projects/fabrika-celik-cati` verir — segmentler doğru, **slug yanlış**, sonuç 404.

### Çözüm

Dinamik slug'a sahip her sayfa, karşı dildeki slug'ı bir bağlama (context) yayınlar:

```tsx
<RouteAlternates value={{
  tr: alternates.tr ? getPathname({ href: {pathname:'/projects/[slug]', params:{slug:alternates.tr}}, locale:'tr' }) : null,
  en: alternates.en ? getPathname({ href: {pathname:'/projects/[slug]', params:{slug:alternates.en}}, locale:'en' }) : null,
  fallback: { tr: getPathname({href:'/projects', locale:'tr'}), en: getPathname({href:'/projects', locale:'en'}) }
}}>
```

Alternatifler, detay RPC'sinin döndürdüğü **aynı** nesneden gelir. Bu, hreflang'in iki yönlü tutarlılığını yapısal olarak garantiler.

### Davranış kuralları

- **Sorgu dizesi korunur** — özellikle konfigüratörde (`?w=20&l=40`)
- **Hash korunur** — ana sayfa çapaları
- `NEXT_LOCALE` çerezi next-intl `Link`/`router` ile otomatik yazılır — elle `<a href>` kullanılmaz, yoksa tercih kaybolur
- Pasif dil **gizlenmez, devre dışı gösterilir** (`aria-disabled` + ipucu) — gizlemek header genişliğini oynatır
- `useTransition` ile bekleme durumu gösterilir; dil değişimi tam bir RSC gezinmesidir, soğuk ISR ıskasında 300–800 ms sürebilir

## Middleware Kompozisyonu

**Bu projenin en riskli dosyası.** Hata biçimi ince: next-intl kendi `NextResponse`'unu döndürür ve o yanıtı döndürürseniz, Supabase'in **başka bir yanıt nesnesine** yazdığı yenilenmiş oturum çerezleri sessizce kaybolur. Belirti: kullanıcılar saatte bir, rastgele görünen şekilde çıkış yapar.

### Kural

> Supabase istemcisinin yanıt nesnesine yazmasına izin verilmez. Çerezler bir **diziye toplanır**, en sonda dönülen yanıta basılır.

```
1. /auth/*                → her ikisini de atla (PKCE kod değişimi)
2. Supabase getUser()     → DALLANMADAN ÖNCE; çerezler toplanır, yazılmaz
3a. /admin/* · /hesabim/* → auth kapısı; intl middleware ÇALIŞMAZ (admin için)
3b. diğerleri             → intlMiddleware() rewrite/redirect üretir
4. toplanan çerezler      → dönülen yanıta basılır (redirect olsa bile)
```

**İki değişmez:** Supabase dallanmadan **önce** (kullanıcıyı bilmek gerekir), çerez basma **sonra** (next-intl yönlendirmesi bile yenilenmiş oturumu taşımalı).

### `returnUrl` doğrulaması

Açık yönlendirme saldırısına karşı **izin listesi** yaklaşımı:

- Tek ve çift URL kod çözme uygulanır (`%252F%252Fevil.com` yakalanır)
- Reddedilenler: `//` ile başlayan (protokol-göreli), `/\`, `/%2F`, `/%5C`, `@` içeren (userinfo hilesi), kontrol karakteri içeren
- `new URL(value, SENTINEL)` ile normalize edilip origin'in değişmediği doğrulanır
- Yalnız `/admin`, `/hesabim`, `/account` önekleri kabul edilir
- **Hem yazarken hem okurken** doğrulanır — değer kullanıcı kontrolündeki sorgu dizesinden geçer
- Başarısızlıkta `/admin`'e düşülür; ham değer **asla HTML'e yansıtılmaz**

### Matcher

```ts
export const config = {
  matcher: ['/((?!_next/static|_next/image|_vercel|favicon\\.ico|.*\\..*).*)']
};
```

`.*\..*` uzantılı dosyaları dışlar — **hero videosuna her Range isteğinde Supabase auth turu atılmasını önler.** Aynı desen, URL'sinde nokta bulunan sayfaları da dışlar; slug'lar `^[a-z0-9-]+$` `CHECK` kısıtıyla ASCII tutulduğu için bu projede güvenlidir.

### Middleware yetkilendirme değildir

CVE-2025-29927 middleware'in `x-middleware-subrequest` başlığıyla tamamen atlanabildiğini gösterdi. Yamalandı, ama ders kalıcı:

| Katman | Rolü |
|---|---|
| Middleware | **Yalnız deneyim** — düzgün yönlendirme, panel iskeletinin görünmemesi |
| `app/admin/layout.tsx` | **Asıl kapı** — sunucu bileşeninde `getUser()` + rol sorgusu |
| **RLS** | **Gerçek sınır** — middleware ve layout tamamen atlansa bile boş sonuç döner |

Ayrıca: service-role anahtarı istekle erişilebilen hiçbir yerde kullanılmaz; `/api/admin/*` route handler'ları kendi auth kontrolünü yapar.

## Faz 1'de Doğrulanan Varsayımlar

Bu tasarımda kesinliği garanti edilemeyen 5 nokta kod yazılmadan önce deneyle sınandı (2026-09-18). **Ayrıntı ve ham çıktılar:** [`06-ASSUMPTION-EXPERIMENTS.md`](06-ASSUMPTION-EXPERIMENTS.md)

| # | Konu | Sonuç | Tasarıma etkisi |
|---|---|---|---|
| 1 | Middleware rewrite'ı ISR önbellek isabetini koruyor mu | ⚠️ **Kısmen** — ön-üretilmiş sayfalar `HIT`, on-demand üretilenler rewrite üzerinden **hiç önbelleğe girmiyor** | **K-46:** `generateStaticParams` yayındaki tüm slug'ları döndürür. Vercel kenarında ayrıca ölçülecek |
| 2 | Geçirgen kök layout + kök `not-found.tsx` Next 15'te çalışıyor mu | ✅ | — |
| 3 | Supabase çerez ön eki (`sb-`) doğru mu | ✅ — ama çerez `.0 .1 .2` diye parçalanıyor | Erken çıkış kontrolü tam adla değil **ön ek + `-auth-token`** ile yazılır; proje ref'ine sabitlenmez |
| 4 | RPC'deki OR dallanması ifade indeksini kullanıyor mu | ✅ generic plan'da bile `BitmapOr` (0.16 ms); `CASE` 58× yavaş | Faz 2'de DB testiyle sabitlenir |
| 5 | `next/og` fontu Türkçe glifleri kapsıyor mu | ✅ `ı` / `İ` dahil | Marka fontu Faz 4'te ayrıca sınanır |
