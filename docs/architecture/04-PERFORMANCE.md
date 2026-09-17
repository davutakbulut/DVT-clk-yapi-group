# Performans Mimarisi

**Hedefler:** LCP < 2.0s · CLS < 0.05 · INP < 150ms (Google eşiğinin altında, tampon bırakarak)

## Temel İlke

> En hızlı istek, hiç yapılmayan istektir.

Sayfaların çoğu **ISR ile önceden üretilmiş**. Önbellek isabetinde sunucuda kod çalışmaz, veritabanına gidilmez — CDN'den statik HTML döner. Asıl kazanç burada; diğer optimizasyonlar bunun üzerine eklenir.

## Render Katmanı

| Kural | Detay |
|---|---|
| Tüm içerik sayfaları **ISR + statik render** | Her sayfa ve layout'ta `setRequestLocale` |
| ⚠️ **`setRequestLocale` unutulursa** | O sayfa sessizce dinamikleşir ve ISR ölür — derleme kontrolüyle denetlenir |
| Veri okumaları `unstable_cache` + etiket | Önbellek isabetinde **sıfır sorgu** |
| Yayınla → etiket temizlenir | Zamana bağlı bekleme yok, içerik anında güncel |

### Etiket sözlüğü

```
project:${id} · service:${id} · post:${id} · product:${id}
projects:list · services:list · posts:list · products:list
menu:header · menu:footer
sitemap
```

Geçersizleştirme hem admin server action'ından hem Supabase webhook'undan tetiklenir — böylece veritabanına dışarıdan yapılan değişiklik de önbelleği tazeler.

## Veritabanı

| Kural | Neden |
|---|---|
| Detay sayfası **tek RPC** | İçerik + çeviriler + ilgili projeler + yorumlar tek gidişte. N+1 yasak |
| `select *` yasak | Liste ekranlarında ağır JSONB gövde alanları gereksiz yere çekilir |
| Sunucu tarafı sayfalama | 5.000 satır tarayıcıya indirilmez; uzun listelerde imleç tabanlı |
| **pgBouncer havuzlu port (6543)** | Sunucusuz fonksiyonlar 5432'ye doğrudan bağlanırsa havuz tükenir |
| Her slug ve filtre kolonunda indeks | `EXPLAIN` ile doğrulanır |

**pgBouncer neden kritik:** Vercel'de her istek ayrı bir fonksiyon örneği başlatabilir. 100 eşzamanlı ziyaretçi = 100 doğrudan bağlantı denemesi. Postgres varsayılan bağlantı limiti çok daha düşük; havuz kullanılmazsa site "too many connections" hatasıyla çöker. Bu, serverless + Postgres'in klasik tuzağıdır.

## Görsel

- `next/image` · AVIF → WebP → JPEG sırası · responsive `srcset` · blur placeholder
- **162 görsel Faz 3'te WebP'ye çevrilip birden fazla boyutta üretilir** — kaynak dosyalar 1–3 MB, sıkıştırılmadan kullanılırsa LCP mahvolur
- Katlama üstündeki görsellerde `priority`, altındakiler lazy
- Her görselin genişlik/yükseklik oranı sabit → **CLS sıfır**
- Vercel'in görsel optimizasyon kotasına bağımlılık yok — boyutlar build zamanında hazır

## Font

`next/font` ile self-host · `latin-ext` alt kümesi · `display: swap` · hero fontu preload.

**`latin-ext` neden zorunlu:** Varsayılan `latin` alt kümesi ş, ğ, İ, ı, ç, ö, ü harflerini içermez — Türkçe metin kutu (tofu) olarak render edilir.

**Self-host neden:** Google Fonts'a harici istek = ek DNS + TLS el sıkışması + üçüncü parti bağımlılık. Self-host ile font aynı origin'den gelir ve preload edilebilir.

## JavaScript

| Kural | Değer |
|---|---|
| İlk yük bütçesi | **< 150 KB gzip** — aşılırsa CI uyarır |
| **Three.js + R3F** | **Yalnız konfigüratörde**, `dynamic(…, {ssr:false})` — tek başına ~600 KB |
| GSAP eklentileri | Sayfa bazında yüklenir |
| Tiptap | Yalnız admin blog editöründe |
| Üçüncü parti script | Yok (analitik kendi, ~4 KB, `requestIdleCallback` ile geciktirilmiş) |

## Ağır İşler İstek İçinde Çalışmaz

```
Form gönderildi → lead kaydı yazıldı → kullanıcıya ANINDA "teşekkürler" ✅
                          ↓ (olay)
                   email_queue'ya satır yazıldı
                          ↓ (cron, arka planda)
                   Resend denenir → başarısızsa SMTP → email_logs'a yazılır
```

**Neden:** Yavaş veya çöken bir mail sağlayıcısı kullanıcının formunu bekletmemeli. Senkron gönderimde Resend 8 saniye yanıt vermezse kullanıcı 8 saniye boş ekrana bakar ve çoğu vazgeçer.

### Zamanlanmış işler

| İş | Nerede | Sıklık |
|---|---|---|
| Mail kuyruğunu boşaltma | Vercel Cron | 1 dk |
| Google yorum senkronu | Vercel Cron | günlük |
| TCMB kuru | Vercel Cron | iş günü |
| Sıcaklık haritası özeti | Vercel Cron | gece |
| Eski analitik verisi temizliği | `pg_cron` | gece |
| Bayat fiyat rehberi uyarısı | Vercel Cron | haftalık |
| Vadesi gelen hakediş bildirimi | Vercel Cron | günlük |

**Canlılık denetimi:** Her cron çalıştığında kayıt bırakır. Beklenen süre içinde kayıt yoksa uyarı maili + panel bildirimi gider. Aksi hâlde mail kuyruğu sessizce durur ve günlerce fark edilmez.

## Analitik İzleyicisi

En riskli parça: her tıklamada istek atan bir izleyici yoğun günde sunucuyu boğar.

- Olaylar tarayıcıda **biriktirilir**, 10 saniyede bir veya sayfa kapanırken `sendBeacon` ile **tek istekte toplu** gönderilir
- Fare hareketi ve scroll örneklenerek alınır
- Yoğun trafikte örnekleme oranı ayardan düşürülebilir
- Yazma tek toplu `insert`; okuma ekranları **ham veriye değil gece üretilen özete** bakar
- Bot trafiği daha yazılmadan filtrelenir

## Bütçeler (CI uyarır)

```
İlk yük JS              < 150 KB gzip
Sayfa başına sorgu      ≤ 2 (önbellek ıskasında)
TTFB (önbellek isabet)  < 100 ms
LCP                     < 2.0 s
Sunucu fonksiyon süresi < 1 s (p95)
```

## Ölçüm

- **Lighthouse CI** derleme hattında, eşik altına düşerse uyarı
- **Kendi RUM'umuz** canlıda gerçek kullanıcı LCP/CLS/INP'sini toplar → `/admin/analytics` "Yavaş Sayfalar" ekranı

Sentetik test (Lighthouse) ile gerçek kullanıcı verisi (RUM) birlikte kullanılır — laboratuvarda hızlı görünen bir sayfa yavaş bağlantıda yavaş olabilir.
