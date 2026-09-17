# Hata İzolasyonu

**Hedef:** Yorumlar bölümü patlarsa sadece o bölüm kaybolsun; sayfa ve site ayakta kalsın.

## Katman 1 — Bölüm Sınırları

Her ana sayfa bölümü ve modül girişi kendi sınırıyla sarılır:

```tsx
<ModuleBoundary module="testimonials" fallback={null}>
  <TestimonialsSection />
</ModuleBoundary>
```

`ModuleBoundary` = React error boundary + Suspense + modül etiketli loglama.

| Sınır | Kapsamı |
|---|---|
| `app/[locale]/error.tsx` | **Tüm sayfayı** hata ekranına çevirir |
| `<ModuleBoundary>` | Yalnız o bloğu değiştirir |

İkisi birlikte kullanılır. Bölüm sınırı olmadan tek bir modülün hatası tüm sayfayı düşürür.

## Katman 2 — Bozulma Sözleşmesi

Her bölüm, verisi gelmediğinde ne yapacağını **önceden tanımlar**:

| Bölüm tipi | Veri gelmezse |
|---|---|
| **Header / Footer** | Asla boş kalmaz — önbellekteki son menü, o da yoksa koda gömülü asgari menü. Site navigasyonsuz kalmaz |
| **İçerik bölümü** (yorumlar, blog, ürün önerisi) | **Hiç render edilmez**, sessizce kapanır. Ziyaretçi hata kutusu görmez |
| **Sayfanın ana içeriği** (ürün detayı) | `notFound()` → düzgün 404, beyaz ekran değil |
| **Konfigüratör** (WebGL) | Statik galeri + iletişim formu — hem hata kurtarma hem dönüşüm kurtarma |
| **Form gönderimi** | Net hata mesajı + **girilen veri kaybolmaz**, yeniden dene |

**Header/Footer istisnası neden var:** Menü verisi gelmezse site kullanılamaz hale gelir. Bu yüzden onlar için üç kademeli düşüş var: önbellek → koda gömülü asgari menü → (asla boş değil). Bu, "sıfır statik veri" kuralının bilinçli tek istisnası.

## Katman 3 — Streaming + Suspense

Her bölüm kendi `Suspense` sınırında. Yavaş bir modül sayfanın geri kalanını **bekletmez**; hata veren modül sayfayı **boşaltmaz**. Hero ve üst içerik anında gelir, alttaki bölümler hazır oldukça akar.

## Katman 4 — Modül Kapatma Anahtarı

`module.config.ts` içindeki `enabled` bayrağı `site_settings`'ten okunur.

```
/admin/settings/modules
  ☑ Ürün Kataloğu      ☑ Konfigüratör     ☐ Google Yorum Senkronu  ⚠ hata veriyor
  ☑ Blog Yorumları     ☑ Sıcaklık Haritası
```

Kapatılan modülün route'ları 404 verir, bileşenleri render edilmez, olay dinleyicileri devre dışı kalır.

**Neden değerli:** Canlıda bir modül sorun çıkardığında dağıtım beklemeden izole edilir. Gece 23:00'te çöken bir özelliği kapatıp sabah sakin sakin düzeltmek mümkün olur.

## Katman 5 — Dış Servis Yalıtımı

Google Places, TCMB kuru, Resend, SMTP, Claude API — hiçbiri bizim kontrolümüzde değil.

| Önlem | Kural |
|---|---|
| **Zaman aşımı** | Sınırsız `await` yasak — 5–10 sn tavan |
| **Devre kesici** | Üst üste N hata → o servise M dakika hiç gidilmez |
| **Önbellekli son değer** | TCMB kuru gelmezse en son çekilen kur kullanılır, "kur X tarihli" notu düşülür |
| **Kısmi çalışma** | Google yorumları gelmezse elle girilen yorumlar gösterilmeye devam eder |

**Devre kesici neden gerekli:** Yanıt vermeyen bir servise her istekte 10 saniye beklemek, sunucu fonksiyonlarını kilitler ve site geneline yayılır. Kesici devreye girince o servis "yok" kabul edilir ve sistem hızla çalışmaya devam eder.

## Katman 6 — Görünürlük

`error_logs` kaydına **modül etiketi** yazılır:

```
/admin/logs
  testimonials    47 hata   son: 2 dk önce   ⚠
  configurator     3 hata   son: 1 saat önce
```

Sorunlu modül kapatma anahtarıyla izole edilip düzeltilir. Etiket olmadan "bir yerlerde hata var" bilgisi işe yaramaz.

## Hata Sayfası Dosya Yerleşimi

```
app/global-error.tsx                 kök çökme — i18n YOK, metin gömülü, stiller satır içi
app/not-found.tsx                    dilsiz 404
app/[locale]/error.tsx               ön yüz 500
app/[locale]/not-found.tsx           ön yüz 404
app/[locale]/[...rest]/page.tsx      eşleşmeyen /tr/* → notFound()
app/[locale]/(marketing)/403/page.tsx
app/admin/error.tsx · not-found.tsx · 403/page.tsx
```

### Bilinmesi gereken tuzaklar

**`error.tsx` kendi segmentinin `layout.tsx`'ini yakalamaz.**
`app/[locale]/layout.tsx` içinde fırlatılan hata, `app/[locale]/error.tsx`'i atlayıp köke gider. Bu yüzden `[locale]/layout.tsx` mümkün olduğunca ince tutulur; veri çekimi `(marketing)/layout.tsx`'e iner.

**`global-error.tsx` kısıtlı.**
`'use client'` zorunlu · kendi `<html>`/`<body>`'sini render eder · **next-intl bağlamına erişemez** (`useTranslations` fırlatır) → metin iki dilde gömülü, stiller satır içi. Yalnız üretim derlemesinde aktiftir; `next build && next start` ile test edilir.

**`[...rest]` yakalayıcı route şart.**
`/tr/olmayan-sayfa` hiçbir route'a uymaz → Next kök `not-found.tsx`'e düşer (dilsiz, menüsüz). Yakalayıcı route bunu `notFound()` çağırarak dilli 404'e yönlendirir.

**403 gerçek route ile kurulur.**
Next 15'in `forbidden()` API'si `experimental.authInterrupts` arkasında. Deneysel olduğu için `/tr/403` ve `/admin/403` gerçek sayfa olarak yapılır; middleware `rewrite` ile oraya yönlendirir.

**`error.tsx` 200 döner.**
Hata UI'si gösterir ama HTTP durumu 200'dür — arama motoru için sorun. Gerçek 500 gerekiyorsa hata sunucu bileşeninde yakalanıp `notFound()` veya yönlendirme ile çözülür.
