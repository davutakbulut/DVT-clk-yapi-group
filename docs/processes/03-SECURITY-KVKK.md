# Güvenlik ve KVKK

## Katmanlı Yetki

```
Middleware (yalnız deneyim) → Sunucu bileşeni rol kontrolü (kapı) → RLS (gerçek sınır)
```

**CVE-2025-29927** middleware'in `x-middleware-subrequest` başlığıyla tamamen atlanabildiğini gösterdi. Yamalandı, ama ders kalıcı: **middleware yetkilendirme değildir.**

> ⚠️ MSSQL geçişinde RLS kaybolacak. Bu yüzden **servis katmanındaki yetki kontrolü açık ve eksiksiz** yazılır.

## Önlemler

| Alan | Önlem |
|---|---|
| **RLS** | Her tabloda açık, **varsayılan reddet**. Politikasız tablo erişilemez |
| **Finansal veri** | Maliyet/kâr kolonları `sales` rolüne RLS'te kapalı (görünüm üzerinden) |
| **Service-role anahtarı** | İstekle erişilebilen hiçbir yerde yok — yalnız migration ve seed |
| **XSS** | Tiptap çıktısı **sunucu tarafında** sanitize (izinli etiket listesi). `dangerouslySetInnerHTML` yalnız sanitize edilmiş içerikle |
| **CSRF** | Server Actions origin doğrulaması + form token |
| **Açık yönlendirme** | `returnUrl` izin listesi doğrulaması — çift kod çözme, `//`, `/\`, `%2F`, `@`, kontrol karakterleri reddedilir |
| **Dosya yükleme** | MIME + **sihirli bayt** doğrulaması · boyut limiti · uzantı izin listesi · CV/belge ayrı bucket, public değil, **imzalı URL** |
| **Spam/bot** | Bal küpü alanı + IP hız sınırı (Upstash) + minimum gönderim aralığı · gerekirse Cloudflare Turnstile |
| **Brute force** | Giriş denemesi hız sınırı, art arda hatada geçici kilit |
| **Oturum** | Admin'de 8 saat hareketsizlikte otomatik çıkış + son 15 dk uyarı |
| **MFA** | TOTP altyapısı kurulur, **opsiyonel** · kapalıysa admin rollerinde hatırlatma şeridi |
| **Başlıklar** | CSP · HSTS · X-Content-Type-Options · Referrer-Policy · Permissions-Policy |
| **Sırlar** | `.env` commit edilmez · gerçek değerler Vercel'de · GitHub secret scanning açık |
| **Bağımlılık** | `npm audit` CI'da + Dependabot |
| **Denetim** | `audit_logs` — kim, ne, ne zaman, eski/yeni değer |
| **Yedekleme** | Supabase günlük yedek + PITR · Faz 31'de geri yükleme tatbikatı |

### Sihirli bayt doğrulaması neden gerekli

Dosya uzantısı ve MIME tipi **istemci tarafından gönderilir** ve kolayca sahtelenebilir. `.jpg` uzantılı bir dosya aslında çalıştırılabilir içerik taşıyabilir. Dosyanın ilk baytları (magic bytes) gerçek türünü söyler; uzantıyla eşleşmiyorsa reddedilir.

### İmzalı URL neden gerekli

CV'ler ve teklif ekleri kişisel veri içerir. Public bucket'ta tutulurlarsa URL'yi tahmin eden veya ele geçiren herkes erişir. İmzalı URL süreli erişim verir ve yetki kontrolünden geçer.

## KVKK

### Rıza

- **Çerez onay bandı zorunlu** — analitik, GA4, Ads ve Pixel onaysız **hiç yüklenmez**
- Kategoriler: zorunlu · analitik · pazarlama
- Rıza kaydı saklanır, kullanıcı geri çekebilir

### Veri Minimizasyonu

- IP adresi **maskelenerek** saklanır (son oktet sıfırlanır)
- Ziyaretçi kimliği **geri döndürülemez** şekilde hash'lenir
- **Form alanlarının içeriği asla kaydedilmez** — yalnız odaklanma/terk davranışı

### Saklama Süreleri

| Veri | Süre | Sonra |
|---|---|---|
| Analitik ham olaylar | 60 gün | `pg_cron` ile silinir |
| Analitik özetler | Süresiz | Kişisel veri içermez |
| İş başvurusu + CV | **12 ay** | Otomatik silinir |
| Ticari kayıtlar (fatura, satış) | **5 yıl (VUK)** | Yasal zorunluluk |
| Talepler | 3 yıl | Anonimleştirilir |

### Silme Hakkı ↔ Yasal Saklama Çatışması

**Sorun:** KVKK silme hakkı tanır; VUK ticari kayıtların 5 yıl saklanmasını zorunlu kılar.

**Çözüm — anonimleştirme:**

| Veri | İşlem |
|---|---|
| `profiles` kaydı | **Tamamen silinir** |
| `customers` / `leads` kişisel alanlar | **Maskelenir** (ad, e-posta, telefon, adres) |
| `invoices`, `sales` | **Saklanır** — vergi kimliğiyle, kişisel veri olmadan |

Kullanıcıya bu durum **açıkça bildirilir** ve KVKK aydınlatma metnine yazılır.

### Veri Taşınabilirliği

`/hesabim/profil` → **"Verilerimi indir"** (JSON): profil, talepler, konfigürasyonlar.

### Yasal Metinler

KVKK aydınlatma metni · gizlilik politikası · çerez politikası · kullanım koşulları.

> ⚠️ Taslaklar hazırlanacak, ancak **bir hukukçu gözden geçirmeli.** Bu site kişisel veri işliyor (analitik, form, üyelik, CV) — şablon metin riskli. **VERBİS kaydı** gerekip gerekmediği de kontrol edilmeli.

## Görsel Telifi

`assets/` altındaki 162 fotoğraf **telifsiz** olarak teyit edildi (K-04'ün dışında, ürün sahibi beyanı). Prototiplerdeki Pexels/Unsplash bağlantıları kullanılmayacak.
