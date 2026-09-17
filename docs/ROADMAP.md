# Yol Haritası — Canlı Durum

> **Bu dosya her fazdan sonra güncellenir.** Projenin güncel durumunu tek bakışta görmek için buraya bakın.

**Son güncelleme:** 2026-09-18
**Şu an:** Faz 0 — Kurulum & Dokümantasyon 🔨

---

## Temel İlke

**Yatay değil dikey dilim.** Bir özelliğin ön yüzü ve admin karşılığı **aynı fazda** bitirilir. Böylece iş herhangi bir noktada dursa, o ana kadar yapılanların hepsi çalışır, test edilmiş ve canlıdadır.

Her fazın sonunda: **test edildi → commit → PR → CI geçti → merge → Vercel'e dağıtıldı → board'da "Tamamlandı"**

---

## Sürümler

| Sürüm | Fazlar | Ne elde edilir | Durum |
|---|---|---|---|
| **v0.5 Temel** | 0–4 | Altyapı, tasarım sistemi, veritabanı | 🔨 Devam ediyor |
| **v1.0 Yayına Hazır Site** | 5–12 | **Çalışan, yönetilebilen, canlı site** | ⏳ Bekliyor |
| **v1.1 Katalog & İçerik** | 13–17 | Ürünler, çözümler, fiyat rehberi, yorumlar | ⏳ |
| **v1.2 Ticari Yönetim** | 18–22 | CRM, satış, fatura, hakediş, raporlar | ⏳ |
| **v1.3 Ölçüm** | 23–25 | Analitik, sıcaklık haritası, hata takip | ⏳ |
| **v1.4 Konfigüratör** | 26–29 | 3D araç, metraj, fiyat, teklif | ⏳ |
| **v2.0 İleri Seviye** | 30–31 | AI görünürlük, reklam takibi, ince ayar | ⏳ |

🚀 **Faz 12 sonunda site canlıya çıkar.** Sonraki her faz ek değer, zorunluluk değil.

---

## v0.5 — Temel

- [ ] **Faz 00** — Kurulum & Dokümantasyon 🔨
  - [x] Kök klasör `clk-yapi-group` olarak yeniden adlandırıldı
  - [x] Prototipler `_archive/prototypes/` altına taşındı
  - [x] `git init` + `.gitignore` + `.env.example`
  - [x] `README.md` + `CLAUDE.md`
  - [x] `docs/` yapısı — 27 doküman
  - [ ] GitHub deposuna ilk push
  - [ ] Project board + 32 issue
- [ ] **Faz 01** — İskelet + i18n · *5 riskli varsayım deneyle doğrulanır*
- [ ] **Faz 02** — Veritabanı (~80 tablo, RLS, ilk super_admin seed)
- [ ] **Faz 03** — Medya migrasyonu (162 görsel → WebP → Storage)
- [ ] **Faz 03B** — İçerik üretimi *(paralel, 4–17 boyunca)*
- [ ] **Faz 04** — Tasarım sistemi · Header · Footer · Hata sayfaları · WhatsApp

## v1.0 — Yayına Hazır Site

- [ ] **Faz 05** — Auth + Admin çatısı · üyelik ekranları · dashboard · medya kütüphanesi
- [ ] **Faz 06** — Ana sayfa: scroll video hero + hakkımızda *(iOS Safari testi)*
- [ ] **Faz 07** — Hizmetler (ön yüz + admin)
- [ ] **Faz 08** — Projeler (ön yüz + admin)
- [ ] **Faz 09** — Blog (ön yüz + admin + canlı SEO paneli)
- [ ] **Faz 10** — Talep + Mail *(kuyruk + canlılık denetimi testi)*
- [ ] **Faz 11** — Kurumsal sayfalar (ekip, referanslar, belgeler, kariyer)
- [ ] **Faz 12** — SEO temeli + **YAYIN** 🚀 *(yayın öncesi tam denetim)*

## v1.1 — Katalog & İçerik

- [ ] **Faz 13** — Ürün kataloğu (ön yüz + admin)
- [ ] **Faz 14** — Teklif sepeti
- [ ] **Faz 15** — Çözüm sayfaları
- [ ] **Faz 16** — Fiyat rehberi + hesaplayıcı
- [ ] **Faz 17** — Müşteri yorumları + Google Places senkronu

## v1.2 — Ticari Yönetim

- [ ] **Faz 18** — Sistem yönetimi (kullanıcı/rol, menü, ayarlar, kill switch, bildirimler)
- [ ] **Faz 19** — Müşteri (CRM)
- [ ] **Faz 20** — Satış & Maliyet
- [ ] **Faz 21** — Fatura & Tahsilat *(tevkifat hesabı elle doğrulanır)*
- [ ] **Faz 22** — Raporlama (9 rapor)

## v1.3 — Ölçüm

- [ ] **Faz 23** — İzleyici altyapısı + çerez onayı
- [ ] **Faz 24** — Sıcaklık haritası + huni + form analizi
- [ ] **Faz 25** — Hata takip + performans izleme

## v1.4 — Konfigüratör

- [ ] **Faz 26** — Three.js → React Three Fiber migrasyonu
- [ ] **Faz 27** — Metraj motoru *(çıktı elle doğrulanır)*
- [ ] **Faz 28** — Fiyat, kaydetme, teklif, PDF
- [ ] **Faz 29** — Konfigüratör admin + satışa dönüştür

## v2.0 — İleri Seviye

- [ ] **Faz 30** — AI görünürlük · IndexNow · RSS · Search Console · GA4/Ads/Pixel
- [ ] **Faz 31** — Erişilebilirlik denetimi · performans ince ayar · **yedek geri yükleme tatbikatı**

---

## Engelleyiciler

| Konu | Etkilediği faz | Durum |
|---|---|---|
| Domain adı | 12, 30 | ⏳ Bekleniyor |
| DNS erişimi (SPF/DKIM/DMARC) | **10** | ⏳ Bekleniyor — *mail teslimatı için zorunlu* |
| Firma iletişim bilgileri | 4 | ⏳ Placeholder ile ilerleniyor |
| Logo dosyası | 4 | ⏳ |
| WhatsApp numarası | 4 | ⏳ |
| Gerçek fiyat verileri | 16 | ⏳ |
| Proje bilgileri (ad, lokasyon, m²) | 8 | ⏳ |
| Google `place_id` | 17 | ⏳ |
| Supabase Pro plana geçiş | **12** | ⏳ *yayın öncesi zorunlu* |
| Hukukçu onayı (KVKK metinleri) | 12 | ⏳ |
