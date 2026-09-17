# Ortamlar ve Erişim

## Depo

```
GitHub : https://github.com/davutakbulut/DVT-clk-yapi-group
Dal    : main (korumalı) ← feat/faz-NN-konu
```

## Supabase

İki proje (K-47 — Docker'sız akışta yerel veritabanının yerini geliştirme projesi alır):

| Ortam | Proje ref | Not |
|---|---|---|
| **Geliştirme** | `dzgfhmsfvbwsxdddxxhb` | Migration'ların ilk uygulandığı yer · `.env.local` buna bakar |
| **Üretim** | `exifnifijxnrxagkqwam` | Yayına (Faz 12) kadar dokunulmaz |

> ⚠️ **Teyit bekliyor:** Hangi projenin hangi ortam olduğu ürün sahibinden henüz doğrulanmadı; yukarıdaki eşleme çalışma varsayımıdır.

```
Proje ref   : <yukarıdaki tablodan>
URL         : https://<ref>.supabase.co
Publishable : sb_publishable_…   (tarayıcıya iner, tasarım gereği açık)
Secret      : sb_secret_…        ⚠ repoya veya sohbete yazılmaz
DB şifresi  : ⚠ yalnız Vercel ortam değişkenlerinde
```

Kurulum:
```bash
brew install supabase/tap/supabase
supabase login
supabase link --project-ref dzgfhmsfvbwsxdddxxhb     # veritabanı şifresini KENDİ isteminde sorar
npm run db:push                                        # migration'ları uygular
npm run db:types                                       # src/types/database.ts üretir
```

`supabase init` yapılmış durumda (`supabase/config.toml` repoda).

### ⚠️ Bağlantı portu

| Port | Kullanım |
|---|---|
| **6543** (pgBouncer, transaction mode) | **Uygulama** — Vercel sunucusuz fonksiyonları |
| 5432 (doğrudan) | Yalnız migration ve seed |

**Neden:** Vercel'de her istek ayrı bir fonksiyon örneği başlatabilir. 100 eşzamanlı ziyaretçi, 5432'ye 100 doğrudan bağlantı denemesi demektir — Postgres bağlantı limiti çok daha düşük, site "too many connections" ile çöker.

### ⚠️ Plan

Supabase **ücretsiz plan 1 hafta hareketsizlikte projeyi duraklatır** ve bant genişliği sınırlıdır. Canlı kurumsal site için uygun değil.
**Yayına çıkmadan önce Pro plana geçiş gerekiyor.** Geliştirme boyunca ücretsiz plan yeterli.

## Ortam Değişkenleri

```
NEXT_PUBLIC_SITE_URL              canonical ve OG için · sondaki / olmadan
NEXT_PUBLIC_SUPABASE_URL          herkese açık
NEXT_PUBLIC_SUPABASE_ANON_KEY     publishable — açık
SUPABASE_SECRET_KEY               ⚠ yalnız sunucu · RLS'i bypass eder
DATABASE_URL                      ⚠ pooled (6543) · yalnız sunucu
DIRECT_URL                        ⚠ 5432 · yalnız migration
ANTHROPIC_API_KEY                 çeviri · yalnız sunucu
RESEND_API_KEY / SMTP_*           mail · yalnız sunucu
GOOGLE_PLACES_API_KEY + PLACE_ID  yorum senkronu
UPSTASH_REDIS_REST_*              hız sınırı
INDEXNOW_KEY                      indeksleme
CRON_SECRET                       cron uçlarını korur
REVALIDATE_SECRET                 Supabase webhook imzası
```

`.env.local` **asla commit edilmez**; repoda yalnız değersiz `.env.example` durur.

## Ortam Stratejisi

| Ortam | Veritabanı | Kullanım |
|---|---|---|
| **Test** | PGlite (süreç içi) | `npm run test:db` — migration zinciri, RLS, kısıtlar |
| **Geliştirme** | `dzgfhmsfvbwsxdddxxhb` | `db push` · Auth/Storage denemeleri |
| **Üretim** | `exifnifijxnrxagkqwam` | Canlı |

> Vercel önizleme dağıtımları **geliştirme** projesine bağlanmalıdır (Vercel › Environment Variables › Preview). Üretime bağlanırsa önizlemede yapılan bir silme canlı veriyi etkiler.

## CI/CD

**Her PR'da:**
```
lint · typecheck · vitest · build · madge --circular · npm audit · Lighthouse CI
```

**`main`'e merge → Vercel otomatik dağıtım.**

`main` korumalı: doğrudan push kapalı, PR zorunlu, CI geçmeden merge edilemez.

## Önizleme Dağıtımları

`VERCEL_ENV !== 'production'` ise:
- `robots.txt` her şeyi engeller
- `X-Robots-Tag: noindex` başlığı eklenir

**Neden zorunlu:** Aksi hâlde Vercel önizleme adresleri Google'a düşer ve asıl siteyle rekabet eder.

## İlk İş — Güvenlik

1. Planlama sırasında sohbete yazılan **GitHub token'ı ve DB şifresi değiştirilecek**
2. `main` dalı korumaya alınacak
3. GitHub'da **secret scanning + Dependabot** açılacak
4. Supabase'de RLS varsayılan reddet — tablo oluşur oluşmaz politika yazılır

## Yedekleme

- Supabase günlük yedek + PITR (Pro plan)
- **Faz 31'de bir kez geri yükleme tatbikatı** yapılacak, süresi kayda geçecek

> "Hiç denenmemiş yedek, yedek değildir." Geri yükleme prosedürü ilk kez gerçek bir kriz anında denenmemeli.
