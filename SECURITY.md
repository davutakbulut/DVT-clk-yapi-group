# Güvenlik Politikası

## Bildirim

Bir güvenlik açığı bulduysanız **herkese açık issue açmayın.** Şu kanallardan birini kullanın:

- GitHub **Security → Report a vulnerability** (özel bildirim), veya
- e-posta: **info@clkyapigroup.com** (konu: `[GÜVENLİK] ...`)

Bildirimde yeniden üretim adımları, etkilenen URL/rota ve varsa ekran görüntüsü yeterlidir. 5 iş günü içinde dönüş yapılır; doğrulanan bulgular öncelikle giderilir ve düzeltme notu `docs/CHANGELOG.md`'de yer alır.

## Kapsam

- Canlı site: https://clkyapigroup.com (ön yüz, `/hesabim`, `/admin`, `/api/*`)
- Bu depodaki kod, migration'lar ve RLS politikaları

Kapsam dışı: hizmet reddi (DoS) denemeleri, sosyal mühendislik, üçüncü taraf servislerin (Supabase, Resend, hosting) kendi altyapısı.

## Tasarım ilkeleri (bkz. `docs/processes/03-SECURITY-KVKK.md`)

- **Yetkilendirme üç katman:** middleware (deneyim) → sunucu bileşeni rol kontrolü (kapı) → **Row Level Security (gerçek sınır)**. Her tablo RLS'li; testler yetkisiz rolle çalışır (`npm run test:db`).
- **Service-role anahtarı** istekle erişilebilen hiçbir yerde kullanılmaz (yalnız arka plan işleri ve yerel betikler).
- **Sırlar repoya girmez:** depo herkese açıktır (K-45); `.env.example` yalnız yer tutucu içerir, GitHub secret scanning açıktır, dağıtımda sırlar sunucudaki `secrets.env` dosyasında tutulur.
- Formlarda hız sınırı, bal küpü ve KVKK açık rıza; kişisel veriler talep üzerine anonimleştirilir ya da silinir (`delete_my_account`, KVKK dışa aktarım).
- Bağımlılıklar CI'da `npm audit --omit=dev --audit-level=high` ile denetlenir; Dependabot güncellemeleri haftalık açılır.

## Desteklenen sürümler

Yalnız `main` dalı ve canlıdaki sürüm desteklenir.
