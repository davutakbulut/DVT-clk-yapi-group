# Mail Sistemi ve Bildirimler

## Mail Mimarisi

**Resend birincil + SMTP yedek**, `MailProvider` soyutlaması arkasında, **kuyruklu gönderim**.

```
Form gönderildi → lead kaydı yazıldı → kullanıcıya ANINDA yanıt ✅
                        ↓ (domain event)
                 email_queue'ya satır yazıldı
                        ↓ (cron, 1 dk'da bir)
                 Resend denenir
                        ↓ başarısızsa
                 SMTP denenir
                        ↓
                 email_logs'a sonuç yazılır
```

**Neden kuyruk:** Senkron gönderimde Resend 8 saniye yanıt vermezse kullanıcı 8 saniye boş ekrana bakar ve çoğu vazgeçer. Kuyrukla form anında tamamlanır.

**Neden iki sağlayıcı:** Resend çökerse mailler durmaz. Her iki denemenin sonucu loglanır; admin hangi sağlayıcının kullanıldığını görür.

## Tetikleyiciler

| Olay | Alıcı | İçerik |
|---|---|---|
| Yeni teklif talebi | **Müşteri** | "Talebiniz alındı" + ref no |
| Yeni teklif talebi | **Firma** | Talep detayı + admin linki |
| Talep cevaplanınca | Müşteri | Admin'in yazdığı cevap |
| Talep durumu değişince | Atanan kişi | Bildirim |
| Yeni üye kaydı | Üye + Firma | Hoş geldiniz / bilgilendirme |
| Konfigürasyon bağlantısı | Misafir | Erişim bağlantısı |
| İş başvurusu | Aday + İK | "Başvurunuz alındı" / yeni başvuru |
| Vadesi gelen hakediş | Sorumlu | Hatırlatma |
| Bülten kaydı | Abone | Hoş geldiniz |

## Şablonlar

- Veritabanından düzenlenebilir (`email_templates`), React Email ile render edilir
- Değişken listesi her şablonda görünür
- **Test gönder** butonu
- TR/EN ayrı
- **Otomatik çeviri kapalı** — mail şablonları hukuki/ticari metin taşır

Tüm gönderimler `email_logs`'a yazılır: alıcı, konu, şablon, durum, sağlayıcı, hata, ilişkili kayıt.

## ⚠️ Teslimat — DNS Kayıtları

**SPF, DKIM ve DMARC kayıtları olmadan gönderilen mailler spam'e düşer.** Bu, kod tarafında çözülebilecek bir şey değil; domain DNS'inde yapılır.

Faz 16'nın ön koşulu:
1. Resend'de domain doğrulaması
2. SPF kaydı
3. DKIM kaydı
4. DMARC politikası

Bu yapılmadan mail sistemi teknik olarak çalışır ama pratikte işe yaramaz.

## Bildirimler (Realtime)

Supabase Realtime ile panelde anlık bildirim — maili beklemeye gerek kalmaz.

**Tetikleyiciler:** yeni teklif talebi · yeni üye · yeni konfigürasyon · yeni iş başvurusu · onay bekleyen yorum · vadesi gelen hakediş · ödeme gecikmesi · kritik JS hatası.

**Arayüz:** Header'da zil + okunmamış rozeti · açılır liste (son 20) · tıklayınca ilgili kayda gider · "tümünü okundu işaretle" · isteğe bağlı sesli uyarı (kullanıcı bazında) · tarayıcı bildirimi (izin verilirse).

`notifications` tablosu **kullanıcı veya rol hedefli** çalışır — yeni talep bildirimi yalnız `sales` ve `admin` rollerine düşer.

## MSSQL Geçiş Notu

Realtime `core/realtime` soyutlaması arkasında. MSSQL'de karşılığı yok; geçişte SignalR veya yoklama (polling) uygulamasına düşülür. Bildirim işlevi kaybolmaz, yalnız iletim yöntemi değişir.

## Toplu e-posta (K-108)

Panel: **Talep ve Satış → Toplu E-posta** (`/admin/campaigns`). Yalnız `super_admin` ve `admin`.

```
Taslak (içerik + alıcı grupları) → "Alıcıları hesapla" → test iletisi → Başlat / Zamanla
        ↓ start_mail_campaign: alıcı listesi dondurulur (mail_campaign_recipients)
Cron (dakikada bir, /api/cron/mail'in 2. adımı) → saatlik sınırdan kalan hak kadar alıcı
        ↓ her alıcıdan önce engel listesi
SMTP/Resend → email_logs (template_key 'campaign') → alıcı durumu → bitince yöneticiye bildirim
```

| Konu | Nerede |
|---|---|
| Kitle kuralları (kim alır, kim almaz) | `app_private.mail_audience` (0057) — kod değil veritabanı |
| Saatlik sınır / dakikalık adet / alt bilgi / hitap / yanıt adresi | `/admin/campaigns/settings` → `site_settings` `mail.bulk` |
| Gönderilmeyecek adresler | `/admin/campaigns/suppressions` → `mail_suppressions` |
| Bireysel müşteri izni | müşteri kartı → "Ticari ileti izni var" (`customers.marketing_consent`) |
| Hazır şablonlar (K-109) | `/admin/campaigns/templates` → `mail_campaign_templates`; `[köşeli parantez]` = gönderenin dolduracağı alan |
| İşçi | `src/core/jobs/mailCampaigns.ts` |
| Şablon | `src/core/mail/render.ts` › `renderCampaignMail` |

**Operasyon notları**
- **Saatlik sınır hosting'in SMTP sınırının altında tutulur.** Varsayılan 100/saat; hosting firmasından gerçek sınırı öğrenip ayarlayın. Sınır hesap genelidir (talep yanıtları dahil).
- **Geri dönen iletiler (bounce)** gönderen posta kutusuna düşer; otomatik işlenmez. Adresi engel listesine "İleti geri döndü" nedeniyle elle ekleyin.
- **Yasal:** ticari iletilerde gönderenin unvanı, adresi ve MERSİS numarası alt bilgide bulunmalı (ayarlardan yazılır). Bireysel alıcılar için önceden onay şart; İYS kaydı/entegrasyonu bu sürümde yoktur — onaylar İYS'ye ayrıca işlenir.
- **Test:** otomatik testler yalnız `@example.com` adresleri kullanır; bunlar kitleye girmez → E2E gerçek alıcıya kampanya başlatamaz. Yerel doğrulama için SMTP'yi 127.0.0.1'deki bir çöp kutusuna yönlendirin; artıklar `scripts/purge-e2e-data.mjs --apply` ile silinir.
- **Teslim edilebilirlik:** SPF + DKIM + DMARC kayıtları olmadan toplu ileti spam'e düşer (bkz. yukarıda "Teslimat").
