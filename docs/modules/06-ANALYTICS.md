# Davranış Analitiği, Sıcaklık Haritası ve Hata Takip

Üçüncü parti servis yok — tüm veri kendi veritabanımızda. ~4 KB izleyici, `requestIdleCallback` ile geciktirilmiş.

## Toplanan Veriler

| Kategori | Ne ölçülür |
|---|---|
| **Tıklama** | Koordinat (viewport'a göre %), element seçicisi, element metni |
| **Öfke tıklaması** | Aynı noktaya 1 sn içinde 3+ tık → *kullanıcı tıkanmış demektir* |
| **Ölü tıklama** | Tıklanabilir olmayan yere tık → *yanlış tasarım sinyali* |
| **Scroll derinliği** | %25/50/75/100 eşikleri |
| **Dikkat süresi** | Bölüm bazında ekranda kalma |
| **Form davranışı** | Hangi alana odaklanıldı, ne kadar kalındı, **hangi alanda terk edildi** |
| **Yolculuk** | Sayfa → sayfa geçiş zinciri, çıkış sayfası |
| **Performans (RUM)** | Gerçek kullanıcıda LCP / CLS / INP / TTFB |
| **Hatalar** | JS hataları, yakalanmamış promise reddi, 404/500 |

## Admin Ekranları

**🔥 Sıcaklık Haritası** — Sayfa + cihaz (📱/📲/🖥 **ayrı ayrı**, düzen farklı olduğu için birleştirilemez) + tarih aralığı. Üç görünüm: tık haritası · scroll haritası (katlama çizgisi) · dikkat haritası.

**🧭 Kullanıcı Yolculuğu** — Sankey diyagramı: giriş → sonraki sayfalar → çıkış. En çok terk edilen sayfa kırmızı.

**📉 Dönüşüm Hunisi** — Admin'den tanımlanır (`Ana Sayfa → Hizmet → Teklif Formu → Gönderildi`), her adımdaki düşüş oranı.

**📝 Form Analizi** — Hangi alanda vazgeçiliyor, hangi alan en çok hata veriyor, ortalama doldurma süresi. *"Kullanıcı nerede tıkanıyor" sorusunun en doğrudan cevabı.*

**🐞 Hata Takip** — JS hataları **parmak izine göre gruplanır** (aynı hata 500 kez düşse tek satır: görülme sayısı, ilk/son görülme, etkilenen kullanıcı, tarayıcı dağılımı, stack trace). Çözüldü işaretlenir; tekrar görülürse yeniden açılır. **Modül etiketi** taşır.

**🔗 Kırık Linkler** — En çok 404 alan URL'ler + referrer. SEO için doğrudan aksiyon listesi.

**⚡ Yavaş Sayfalar** — Gerçek kullanıcı verisiyle Core Web Vitals sıralaması.

**🤖 AI Kaynaklı Trafik** — `referrer` üzerinden ayrıştırılır (chatgpt.com, perplexity.ai, claude.ai) → *"AI aramalarından ne kadar ziyaretçi geliyor"*.

## Veri Hacmi Stratejisi

Ham olay verisi hızla büyür:

- Ham olaylar **60 gün** tutulur, `pg_cron` ile silinir
- Her gece **toplu özet** çıkarılır (`heatmap_aggregates`, `scroll_depth_aggregates`) → sıcaklık haritası ekranı ham veriye değil özete bakar, anında açılır
- Yoğun trafikte örnekleme oranı ayarlanabilir
- Bot trafiği **daha yazılmadan** filtrelenir

## Sunucuyu Boğmama

En riskli parça: her tıklamada istek atan bir izleyici.

- Olaylar tarayıcıda **biriktirilir**, 10 sn'de bir veya sayfa kapanırken `sendBeacon` ile **tek istekte toplu** gönderilir
- Fare hareketi ve scroll örneklenerek alınır
- Yazma tek toplu `insert`

**`sendBeacon` neden:** Sayfa kapanırken normal `fetch` iptal edilir — son olaylar kaybolur. `sendBeacon` tarayıcıya "bunu arka planda gönder, ben kapansam da" der.

## ⚖️ KVKK / GDPR

Bu modül kişisel davranış verisi işler. **Açık rıza şart.**

- Çerez onay bandı **zorunlu** — reddedilirse izleyici **hiç yüklenmez**
- IP adresi maskelenerek saklanır (son oktet sıfırlanır)
- Ziyaretçi kimliği geri döndürülemez şekilde hash'lenir
- **Form alanlarının içeriği asla kaydedilmez** — sadece odaklanma/terk davranışı
- Kullanıcı onayını geri çekebilir
- Çerez politikası ve KVKK metni bu modülü açıkça tanımlar

**Oturum kaydı (session replay) yok** (K-44) — sıcaklık haritası, öfke tıklaması ve form analizi tıkanma noktalarını zaten gösteriyor; depolama maliyeti ve KVKK riski buna değmez.

## Üretim İzleme

`error_logs` sistem *hata verdiğinde* çalışır. Ama sistem **sessizce durursa** kimse fark etmez — en tehlikeli senaryo: mail kuyruğu cron'u çöker, müşteriler teklif onayı maili almaz, günlerce anlaşılmaz.

**Canlılık denetimi (heartbeat):** Her kritik cron çalıştığında kayıt bırakır. Beklenen süre içinde kayıt yoksa uyarı maili + panel bildirimi gider.

Ayrıca harici bir uptime izleme servisi site erişilemezse haber verir.
