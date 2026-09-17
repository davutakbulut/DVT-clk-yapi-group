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
