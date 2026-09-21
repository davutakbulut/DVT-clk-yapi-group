# cPanel'e Kurulum (Node.js destekli Linux hosting)

> Hedef: CloudLinux "Setup Node.js App" (Passenger) olan cPanel. Veritabanı ve dosyalar Supabase'de kalır; hosting yalnız siteyi çalıştırır.
> **Sunucuda derleme yapılmaz** (bellek limiti). Paket bilgisayarda üretilir, zip olarak yüklenir.

## Ön koşullar (satın almadan önce doğrulayın)

| Koşul | Neden |
|---|---|
| Node.js **20 veya 22** | Next.js 15 çalışma zamanı |
| En az **2 GB RAM**, 1 tam çekirdek | sayfa üretimi + görsel işleme |
| **3 GB+ disk** | paket açılmış hâli ≈ 125 MB; günlükler ve önbellek büyür |
| SSH (tercihen) | güncelleme tek komut olur; yoksa Dosya Yöneticisi ile de yapılır |
| Alan adı + SSL (AutoSSL/Let's Encrypt) | giriş çerezleri yalnız HTTPS'te güvenli |

## 1 · Paketi üret (bilgisayarda)

```bash
bash scripts/cpanel-package.sh https://www.alanadiniz.com
```

Çıktı `deploy/clk-site.zip` (~36 MB). Alan adı derlemeye gömülür (canonical, site haritası, e-posta bağlantıları) → **alan adı değişirse paket yeniden üretilir**.
Pakette sır yoktur (`.env*` dosyaları silinir; betik sonrası tarama ile doğrulandı).

## 2 · Yükle

cPanel → **Dosya Yöneticisi** → ev dizini (`/home/KULLANICI/`) → `clk-site.zip` yükle → sağ tık **Extract**.
Sonuç: `/home/KULLANICI/clk-site/` → kökte yalnız `app.js` + `cron.sh`, paketin kendisi `app/` alt klasöründe (`server.js`, `node_modules`, `.next-cpanel`, `messages`). CloudLinux, uygulama kökünde gerçek bir `node_modules` klasörüne izin vermez (kendi sanal ortam bağını koyar) — bu yüzden alt klasör.

⚠️ `public_html` içine **açmayın** — kaynak dosyalar web'den indirilebilir olur.

## 2a · Ad sunucuları (DNS)

Alan adı hosting'in ad sunucularını göstermeli, yoksa istekler park sayfasına gider (clkyapigroup.com'da yaşandı: alan adı `us/eu/sg/tr.guzelhosting.com`'daydı → 185.106.208.2; hosting ise `ns1/ns2/ns11/ns12.guzelhosting.com` → 46.45.136.3 bekliyordu). Doğru değerler cPanel → Zone Editor'daki NS kayıtlarıdır. Yayılmadan önce deneme: `curl --resolve alanadi.com:80:SUNUCU_IP http://alanadi.com/tr`.

## 3 · Node.js uygulamasını oluştur

cPanel → **Setup Node.js App** → **Create Application**

| Alan | Değer |
|---|---|
| Node.js version | 22 (yoksa 20) |
| Application mode | Production |
| Application root | `clk-site` |
| Application URL | alan adınız (kök, alt klasör değil) |
| Application startup file | `app.js` |

**"Run NPM Install"a basmayın** — bağımlılıklar paketin içinde; basarsanız paylaşımlı sunucuda gereksiz yere yüzlerce MB kurmaya çalışır.

## 4 · Ayarlar ve sırlar — tek dosya

```bash
bash scripts/cpanel-secrets.sh https://clkyapigroup.com info@clkyapigroup.com
```

`deploy/secrets.env` üretir (Supabase anahtarı `.env.local`'dan, `CRON_SECRET` rastgele, posta şifresi gizli sorulur; hiçbir değer ekrana yazılmaz). Dosyayı `~/clk-site/` içine yükleyin → Setup Node.js App → Restart. `app.js` açılışta okur. Aşağıdaki tablo aynı değişkenlerin panelden girilmesi hâlidir (panel değeri önceliklidir).

### Panelden girmek isterseniz

| Ad | Değer |
|---|---|
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API → secret key |
| `CRON_SECRET` | kendi ürettiğiniz uzun rastgele dize (`openssl rand -hex 32`) |
| `SITE_ENV` | `production` |
| `SITE_INDEXABLE` | yayına hazır olana dek **eklemeyin**; hazır olunca `true` (o zamana dek site Google'a kapalıdır) |
| `MAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | hosting e-posta hesabı (ya da `RESEND_API_KEY`) |
| `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID` | Google yorum eşitleme (isteğe bağlı) |
| `INDEXNOW_KEY` | isteğe bağlı |

`NEXT_PUBLIC_*` değerleri derlemeye gömülüdür, buraya yazılmaz. Kaydet → **Restart**.

## 5 · Supabase tarafı

Supabase → Authentication → URL Configuration: **Site URL** = `https://www.alanadiniz.com`, **Redirect URLs**'e `https://www.alanadiniz.com/**` ekleyin (şifre sıfırlama/giriş bağlantıları için).

## 6 · Zamanlanmış görevler (cPanel → Cron Jobs)

Önce `clk-site/cron.env` dosyasını oluşturun (Dosya Yöneticisi → yeni dosya, izin **600**):

```
SITE_URL=https://www.alanadiniz.com
CRON_SECRET=4. adımdaki ile aynı değer
```

| Zamanlama | Komut |
|---|---|
| `* * * * *` | `bash ~/clk-site/cron.sh mail` |
| `*/5 * * * *` | `curl -fsS -o /dev/null https://www.alanadiniz.com/tr` ← uygulamayı uyanık tutar |
| `20 * * * *` | `bash ~/clk-site/cron.sh indexnow` |
| `*/30 * * * *` | `bash ~/clk-site/cron.sh heartbeat` |
| `15 2 * * *` | `bash ~/clk-site/cron.sh analytics` |
| `0 3 * * *` | `bash ~/clk-site/cron.sh reviews` |
| `30 3 * * *` | `bash ~/clk-site/cron.sh purge` |
| `0 5 * * *` | `bash ~/clk-site/cron.sh reminders` |
| `0 13 * * 1-5` | `bash ~/clk-site/cron.sh rates` |

Hosting "dakikada bir" cron'a izin vermiyorsa `mail` için `*/5` kullanın (e-postalar en çok 5 dk gecikir).

## 7 · Kontrol

- `https://www.alanadiniz.com/tr` açılıyor, `/tr/urunler` ve `/tr/konfigurator` açılıyor
- `/admin` giriş sayfasına yönleniyor; giriş yapılabiliyor
- Panelden bir görsel yüklenebiliyor (sharp çalışıyor)
- `https://www.alanadiniz.com/api/cron/heartbeat` tarayıcıdan **401** veriyor (sırsız erişim kapalı)
- Hata olursa: Setup Node.js App ekranındaki log yolu ya da `clk-site/stderr.log`

## E-posta (clkyapigroup.com)

Posta kutusu: `info@clkyapigroup.com` (cPanel → E-posta Hesapları). Sitenin gönderim ayarları (Setup Node.js App → Environment variables):

| Ad | Değer |
|---|---|
| `MAIL_FROM` | `CLK Yapı Group <info@clkyapigroup.com>` |
| `SMTP_HOST` | `mail.clkyapigroup.com` |
| `SMTP_PORT` | `465` (SSL) |
| `SMTP_USER` | `info@clkyapigroup.com` |
| `SMTP_PASSWORD` | posta kutusu şifresi — **yalnız panele elle girilir**, depoya/sohbete yazılmaz |

Teslim edilebilirlik: cPanel → **Email Deliverability** → clkyapigroup.com → *Repair* (SPF + DKIM kayıtlarını ekler; alan adı hosting'in ad sunucularında olduğu için tek tık). DMARC: Zone Editor → TXT `_dmarc` = `v=DMARC1; p=quarantine; rua=mailto:info@clkyapigroup.com`.
Sitede görünen iletişim e-postası panelden: Ayarlar → İletişim (`contact.email`).

## Güncelleme

1. `bash scripts/cpanel-package.sh https://www.alanadiniz.com`
2. cPanel'de eski `clk-site` klasörünü `clk-site-eski` yapın (`cron.env`'i yenisine kopyalayın), yeni zip'i açın
3. Setup Node.js App → **Restart**
4. Sorun yoksa `clk-site-eski`'yi silin; sorun varsa klasör adlarını geri çevirip Restart (geri dönüş 1 dk)

Veritabanı değişiklikleri (migration) hosting'den bağımsızdır: `npm run db:push -- --yes`.

## Bilinen sınırlar

- Uygulama boşta uyur → ilk istek 3–5 sn (yukarıdaki 5 dk'lık `curl` bunu azaltır)
- Otomatik yayın yok (Vercel'deki gibi push → yayın olmaz); her güncelleme yukarıdaki adımlarla
- Başlangıç dosyasında `HOSTNAME=0.0.0.0` **değiştirilmez**: belirli bir ad verilirse çeviri yolları (`/tr/urunler`) 307 döngüsüne girer
- Paylaşımlı sunucuda komşu sitelerin yükü hızı etkiler; ölçüm kötüyse VPS'e geçiş aynı paketle yapılır (`node app.js` + nginx)
