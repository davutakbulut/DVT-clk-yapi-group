# Kötüye Kullanım ve Aşırı Yük Dayanıklılığı (K-104)

> Soru: "Birileri siteme gelip çok fazla istek atıp veritabanımı / sunucumu yorabilir mi?"
> Bu doküman 2026-09-24 tarihli tam taramanın bulgularını, alınan önlemleri, kalan riskleri ve **tekrar denetim yöntemini** kaydeder.
> Yeni bir uç nokta, server action ya da RPC ekleyen herkes (insan ya da yapay zeka ajanı) önce §5'teki kontrol listesini uygular.

## 1 · Tehdit modeli

| Saldırgan | Elinde ne var | Hedef |
|---|---|---|
| Anonim ziyaretçi | Tarayıcı, curl, sahte başlıklar | Formlarla e-posta seli, DB'yi şişirme, CPU'yu yorma, diski doldurma |
| Anon anahtarı bilen | `NEXT_PUBLIC_SUPABASE_ANON_KEY` (tarayıcıya iner, **herkese açıktır**) | Next.js'i atlayıp PostgREST'e **doğrudan** RPC çağırma |
| Üye | Geçerli oturum | Kendi kaydına sınırsız mesaj/yazma, şirket e-postasını doldurma |
| Meşru yoğunluk | Botlar, tarayıcı ön yükleme | Yanlış pozitif olmadan hizmet sürekliliği |

Ortam: tek Node süreci (cPanel/Passenger), Supabase (paylaşımlı Auth kotası), Docker'sız. CDN yok; Apache öndedir.

## 2 · Savunma katmanları

```
Tarayıcı ──► Apache/Passenger ──► Next.js (middleware → route/action) ──► PostgREST ──► Postgres (RLS + RPC kapısı + eşik)
                                        ▲ hız sınırı (IP), gövde sınırı, doğrulama       ▲ x-clk-gate başlığı, app_private.throttle, boyut CHECK
Doğrudan anon anahtar ─────────────────────────────────────────────────────────────────► kapı yoksa REDDEDİLİR
```

### 2.1 RPC kapısı (`x-clk-gate`)
- Sunucu istemcileri (`createServerClient`, `createPublicClient`, `createServiceClient`) her PostgREST isteğine `x-clk-gate: RPC_GATE_SECRET` başlığını ekler (`src/core/db/gateHeaders.ts`).
- Veritabanında `public.rpc_gate_ok()` bu başlığı `app_private.config('rpc_gate')` ile karşılaştırır. **Yazma RPC'leri**, `post_comments` INSERT politikası ve CV yükleme politikası kapıdan geçmeyeni reddeder (`42501 rpc_gate`).
- Kapı **yapılandırılmamışsa açık kalır** (kurulum sırası bozulmasın diye). service_role muaftır (arka plan işleri).
- Kurulum sırası (ters sıra canlı formları kırar!):
  1. `bash scripts/cpanel-secret-set.sh RPC_GATE_SECRET` → sunucu `secrets.env` + yeniden başlatma (değer `.env.local`'dan; yoksa önce `set-rpc-gate.mjs` üretir)
  2. Dağıtım (kod başlığı gönderiyor olmalı)
  3. `node --env-file=.env.local scripts/set-rpc-gate.mjs` → sır veritabanına yazılır, kapı kapanır
  - Geri alma: `scripts/set-rpc-gate.mjs --off`
- Sır 32 bayt rastgele (base64url); repoya girmez; `.env.example`'da yalnız yer tutucu.

### 2.2 Veritabanı içi eşikler (`app_private.throttle`)
Uygulama süreçlerinden bağımsız sabit pencere sayacı; aşımda `P0429 rate_limited`. Sarmalayıcı fonksiyonlar (0052) gövdeleri değiştirmeden `_impl` fonksiyonlarını çağırır:

| Fonksiyon | Kapı | Boyut | Eşik |
|---|---|---|---|
| `submit_lead` | ✓ | 32 KB | global 60/10 dk · e-posta başına 3/saat |
| `submit_job_application` | ✓ | 32 KB | global 30/saat · e-posta 2/gün |
| `submit_testimonial` | ✓ | 8 KB | global 30/saat |
| `save_configuration` | ✓ | 64 KB | global 300/10 dk |
| `ingest_analytics` | ✓ | 256 KB | global 3000/10 dk |
| `report_error` | ✓ | 16 KB (context > 4 KB düşürülür) | global 600/10 dk |
| `record_redirect_hit` | ✓ | 500 karakter | global 600/10 dk |
| `set_configuration_sharing` | ✓ | — | global 300/10 dk |
| `search_site` | ✓ | sorgu 2–60 karakter, limit ≤ 50 | (uygulama: IP 60/dk) |
| `customer_lead_message` | ✓ | — | üye başına 5/saat |

`_impl` fonksiyonlarının anon/authenticated yetkisi yoktur; `alter default privileges … revoke execute on functions from anon, authenticated` ile **yeni fonksiyonlar varsayılan olarak kapalı** açılır (grant açıkça yazılır).

### 2.3 Uygulama katmanı
- **İstemci IP'si** her yerde `clientIp()` ile (`src/core/request/clientIp.ts`): X-Forwarded-For'un **sondan** `TRUSTED_PROXY_HOPS` adresi. Baştaki değeri almak, her istekte farklı başlıkla sınırı aşmaya yetiyordu (canlıda doğrulandı: 65 istekte 429 yok). IPv6 /64'e indirgenir.
- **Hız sınırlayıcı** (`src/core/rate-limit`): anahtar SHA-1 ile kısaltılır, en çok 20 000 giriş (en eski atılır), süpürme 10 sn'de bir; Upstash hata/kota bitiminde açık kalmaz, süreç içi sayaca düşer.
- **Gövde sınırı** gövde okunmadan (`bodyTooLarge`, Content-Length): analytics 64 KB, errors/csp 16 KB, redirects/hit 4 KB. Zod: olay `payload` ≤ 1 KB, `utm` ≤ 10 anahtar, hata `context` ≤ 2 KB, CSP directive ≤ 200.
- **Analitik e2e atlaması** (`?e2e_track=1`) yalnız `SITE_ENV !== 'production'`.
- **Auth** (Supabase'in IP sınırı sunucu IP'sine işler → ortak kota): giriş IP 10/5 dk + e-posta 8/15 dk; kayıt IP 5/saat; şifre sıfırlama e-posta 3/saat + IP 10/saat (sessiz); hesapta şifre 5/saat, e-posta değişimi 3/saat, talebe mesaj 5/saat.
- **Oturum çerezi** yalnız kendi proje ref'iyle sayılır (`sb-<ref>-auth-token`); rastgele çerez artık her istekte Auth'a gitmez.
- **Arama**: sorgu başına `unstable_cache` yok (her sorgu diske dosya yazıyordu) → 300 girişlik süreç içi LRU, 5 dk; `/arama` sayfası da IP 60/dk.
- **`cached()` hata sonucunu saklamaz**: geçici DB sorunu 1 saat boyunca 404/boş menü olarak donmaz.
- **Slug sayfaları**: `isPublicSlug()` (CHECK deseni + ≤120) DB'ye gitmeden 404; kategori/etiket rotaları `dynamicParams=false` (bilinmeyen slug diske 404 yazdırmaz). Detay sayfalarında geçerli desenli rastgele slug hâlâ 2 DB çağrısı + disk 404 girişi bırakır → §4 açık madde.
- **İzleyici**: boş paket gönderilmez, 10 sn → 30 sn, son gönderim tek.
- **Görsel eniyileyici kapalı** (`images.unoptimized`): `/_next/image?url=` üzerinden rastgele rota render ettirilemez.
- **Cron uçları**: sabit zamanlı sır karşılaştırması (`secretMatches`); `/api/redirects/hit` yalnız middleware'in gönderdiği kapı başlığıyla.
- **Bakım** (`run_maintenance`, günlük): eşik pencereleri 1 gün, `error_logs` 90 gün, `notifications` 90 gün, gönderilmiş/başarısız `email_queue` 90 gün, analitik ham veri 60 gün.
- **Boyut CHECK'leri**: `profiles` (saved_basket ≤ 16 KB, ad ≤ 120, telefon ≤ 32, prefs ≤ 4 KB), `configurations` (params ≤ 16 KB, ad ≤ 120), `configuration_items`, `post_comments` (ad ≤ 80, e-posta ≤ 200). Yalnız `saved_basket`/`last_seen_at` değişince `audit_logs` satırı yazılmaz.

## 3 · Uç nokta envanteri

| Yol | Kim | Hız sınırı | Gövde | Önbellek | DB maliyeti |
|---|---|---|---|---|---|
| `POST /api/analytics/collect` | anon (onay çerezi) | IP 120/dk | 64 KB | — | `ingest_analytics` (kapı+eşik) |
| `POST /api/errors` | anon | IP 60/dk | 16 KB | — | `report_error` (kapı+eşik) |
| `POST /api/csp-report` | anon | IP 30/dk | 16 KB | — | `report_error` |
| `GET /api/search` | anon | IP 60/dk | — | LRU 5 dk + `s-maxage` | `search_site` (kapı) |
| `GET /api/redirects` | anon | — | — | 5 dk | küçük liste |
| `POST /api/redirects/hit` | middleware (kapı başlığı) | DB global 600/10 dk | 4 KB | — | 1 UPDATE |
| `GET /api/me` | herkes | — | — | no-store | çerez yoksa 0; geçerli ref'li çerezde Auth + profil |
| `GET /api/account/export` | üye | — | — | no-store | 5 sorgu (RLS, kendi satırları) |
| `GET /api/cron/*` | CRON_SECRET | — | — | — | sınırlı iş (mail 20, hatırlatma 200) |
| `/auth/callback` | anon | Supabase | 8 KB* | no-store | 1 Auth çağrısı |
| Server action: talep, başvuru, yorum(müşteri), konfigürasyon kaydet | anon | IP 5/10 dk · 3/saat · 3/saat · 10/10 dk + bal küpü | zod | — | RPC (kapı+eşik) |
| Server action: giriş / kayıt / sıfırlama | anon | bkz. §2.3 | zod | — | Supabase Auth |
| Server action: blog yorumu | anon | IP 5/saat | zod | — | INSERT (kapı politikası) |
| `[slug]` detay sayfaları | anon | — | — | ISR 1 saat | bilinen: 0 · bilinmeyen (geçerli desen): 2 çağrı + disk 404 |
| `/arama` | anon | IP 60/dk | — | LRU | `search_site` |
| `/konfigurator/k/[token]` | anon | IP 60/dk | — | — | 1 RPC (UUID denetimi önce) |
| `[...rest]` 404 | anon | — | — | dinamik (disk yok) | 0 (ayar/menü istek içinde tekil) |

\* Next.js gövde üst sınırı; uygulama ayrıca doğrular.

## 4 · Bilinen açık maddeler (öncelik sırasıyla)
1. **Geçerli desenli rastgele slug** detay sayfalarında ISR 404 girişi olarak diske yazılır (~300 KB/URL). Çözüm adayı: middleware'in `/api/public-slugs` (5 dk önbellek) listesiyle bilinmeyen slug'ı dinamik 404'e yeniden yazması; ya da disk önbelleğini manifest dışı dosyalardan arındıran gece işi.
2. **Supabase Auth CAPTCHA** (Turnstile) açık değil: `/auth/v1/signup|recover` doğrudan anon anahtarla çağrılabilir; uygulama sınırları yalnız kendi formlarını korur. Ürün sahibi: Supabase panelinde Auth → Attack protection → CAPTCHA.
3. **Süreç başına sayaç**: Passenger birden çok süreç açarsa uygulama sınırı süreç sayısı kadar gevşer (DB eşikleri buna bağlı değil). Upstash (ücretsiz katman) eklenirse tutarlı olur.
4. Hol konfigüratörü doğrudan tablo yazımı (üye, kendi satırı): sürüm sayısı sınırsız (boyut kısıtlı). Sürüm başına üst sınır (50) eklenmeli.
5. `audit_logs` ve `email_logs` saklama süresi: iş kararı (VUK 5 yıl mali kayıtlar için; denetim izi için belirlenmedi).
6. Hosting güvenlik duvarı (Imunify360/ModSecurity) ayarları uygulama dışındadır; IP başına eşzamanlı bağlantı sınırı hosting panelinden kontrol edilmeli.

## 5 · Yeni uç nokta / RPC eklerken kontrol listesi
```
□ Anonim çağrılabiliyorsa: kapı (perform app_private.require_gate()) + app_private.throttle(...) + pg_column_size sınırı
□ grant execute AÇIKÇA yazıldı (varsayılan artık kapalı); _impl deseni gerekiyorsa 0052'deki gibi
□ Route handler: bodyTooLarge() gövde okunmadan; rateLimit() anahtarı clientIp() ile; her zaman sabit yanıt (204/401)
□ Server action: zod max uzunluklar; rateLimit(); bal küpü (form); hata anahtarı 'rateLimited'
□ Kullanıcı girdisiyle anahtarlanan unstable_cache YOK (sınırlı LRU kullan)
□ Yeni tablo: metin/jsonb boyut CHECK'i; büyüyen tablo için run_maintenance'a temizlik
□ supabase/tests/abuse.test.ts'e senaryo; scripts/abuse-probe.sh ile canlıda doğrula
```

## 6 · Denetim ve doğrulama
- **Birim/DB**: `npx vitest run supabase/tests/abuse.test.ts` (kapı, eşik, sarmalayıcı, boyut, izin listesi, bakım) · `src/core/request/__tests__/clientIp.test.ts` · `src/core/auth/__tests__/authCookie.test.ts`
- **Canlı sonda**: `bash scripts/abuse-probe.sh https://clkyapigroup.com` — 9 adım: sabit/sahte IP ile 429, analitik/hata uçları, cron 401, 1 MB gövde, 404 maliyeti, hit ucu 401, doğrudan RPC reddi. Beklenen sonuçlar betiğin içinde.
- **Tarama geçmişi**: 2026-09-24 — 3 paralel inceleme (API rotaları · server action + RPC · sayfa maliyeti). Bulgular ve düzeltmeler: `docs/02-DECISIONS.md` K-104, `docs/CHANGELOG.md`.
