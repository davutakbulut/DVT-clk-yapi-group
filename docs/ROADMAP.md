# Yol Haritası — Canlı Durum

> **Bu dosya her fazdan sonra güncellenir.** Projenin güncel durumunu tek bakışta görmek için buraya bakın.

**Son güncelleme:** 2026-09-18
**Şu an:** Faz 5 — Auth + Admin çatısı ⏳ (sırada) · Faz 1–4 PR'da

---

## Temel İlke

**Yatay değil dikey dilim.** Bir özelliğin ön yüzü ve admin karşılığı **aynı fazda** bitirilir. Böylece iş herhangi bir noktada dursa, o ana kadar yapılanların hepsi çalışır, test edilmiş ve canlıdadır.

Her fazın sonunda: **test edildi → commit → PR → CI geçti → merge → Vercel'e dağıtıldı → board'da "Tamamlandı"**

---

## Sürümler

| Sürüm | Fazlar | Ne elde edilir | Durum |
|---|---|---|---|
| **v0.5 Temel** | 0–4 | Altyapı, tasarım sistemi, veritabanı | ✅ Faz 0–4 tamam |
| **v1.0 Yayına Hazır Site** | 5–12 | **Çalışan, yönetilebilen, canlı site** | ⏳ Bekliyor |
| **v1.1 Katalog & İçerik** | 13–17 | Ürünler, çözümler, fiyat rehberi, yorumlar | ⏳ |
| **v1.2 Ticari Yönetim** | 18–22 | CRM, satış, fatura, hakediş, raporlar | ⏳ |
| **v1.3 Ölçüm** | 23–25 | Analitik, sıcaklık haritası, hata takip | ⏳ |
| **v1.4 Konfigüratör** | 26–29 | 3D araç, metraj, fiyat, teklif | ⏳ |
| **v2.0 İleri Seviye** | 30–31 | AI görünürlük, reklam takibi, ince ayar | ⏳ |

🚀 **Faz 12 sonunda site canlıya çıkar.** Sonraki her faz ek değer, zorunluluk değil.

---

## v0.5 — Temel

- [x] **Faz 00** — Kurulum & Dokümantasyon ✅ 2026-09-18
  - [x] Kök klasör `clk-yapi-group` olarak yeniden adlandırıldı
  - [x] Prototipler `_archive/prototypes/` altına taşındı
  - [x] `git init` + `.gitignore` + `.env.example`
  - [x] `README.md` + `CLAUDE.md`
  - [x] `docs/` yapısı — 29 doküman
  - [x] GitHub deposuna ilk push
  - [x] 7 milestone + 6 etiket + 33 issue
  - [x] Project board #5 — tüm issue'lar eklendi
- [x] **Faz 01** — İskelet + i18n ✅ 2026-09-18
  - [x] 5 riskli varsayım deneyle sınandı → `docs/architecture/06-ASSUMPTION-EXPERIMENTS.md` · **K-46** doğdu
  - [x] Next 15.5 · TypeScript strict · Tailwind v4 katmanları · `data-surface` stil izolasyonu
  - [x] next-intl: `localePrefix: always`, `localeDetection: false`, tipli pathnames, tipli mesajlar
  - [x] Middleware kompozisyonu (K-13) — çerez toplama, 10 birim testiyle kilitli
  - [x] Dil değiştirici: sorgu + hash korur, `RouteAlternates` bağlamı, JS'siz çalışır
  - [x] Hata sayfaları: kök 404 · dilli 404 · `[...rest]` yakalayıcı · `error.tsx` · `global-error.tsx`
  - [x] ESLint sınırları (6 kasıtlı ihlalle doğrulandı) · `toLowerCase` yasağı · Supabase import kısıtı
  - [x] `Result<T,E>` · `ModuleBoundary` · modül etiketli logger · `slugify` (K-16)
  - [x] Vitest 36 · Playwright 51 (3 kırılım, axe WCAG 2.1 AA) · Lighthouse 100/100/100
  - [x] CI: lint · typecheck · test · circular · statik tarama · build · audit · e2e · Lighthouse
  - [ ] *Açık:* Varsayım #1'in Vercel kenarında ölçümü — ilk Vercel dağıtımında (`experiments/faz-01/next-canary`)
- [x] **Faz 02** — Veritabanı ✅ 2026-09-18 *(12 migration `clk-yapi-group` projesine uygulandı)*
  - [x] **Docker'sız akış (K-47):** elle migration → PGlite testleri → geliştirme projesi → üretim
  - [x] 12 migration · **83 tablo + 4 görünüm** · 171 RLS politikası · 129 FK · 226 CHECK · uzantısız
  - [x] Sözleşme prosedürleri (K-48): `secure` · `publishable` · `localized_slug` · `content_policies` · `sortable` · `audited`
  - [x] K-33: maliyet/kâr `sales` rolüne DB seviyesinde kapalı (maliyetsiz görünümler + yazma tetikleyicisi)
  - [x] K-07/K-08 kısıtla zorlanıyor: insan onayı olmadan `en` yayına giremez
  - [x] K-15: `slug_history` tetikleyicisi + `resolve_old_slug` · K-31: tevkifat hesabı CHECK ile kilitli
  - [x] `get_project_by_slug` RPC şablonu — Faz 1 deney #4 (OR → BitmapOr) testle sabitlendi
  - [x] **108 veritabanı testi** (~4 sn): her rol için görmeli / **görmemeli** / yazmalı / yazmamalı
  - [x] Yapısal emniyetler: her tabloda RLS · anonim yazamaz · anonime açık tablolar açık listeyle birebir
  - [x] `npm run db:report` — katalogdan üretilen şema gezgini + yetki matrisi
  - [x] Referans verisi migration'da; gerçek-veri tabloları (fiyat, yorum, proje, ekip, sertifika) **boş**
  - [x] Uzak projeye uygulandı · gerçek API üzerinden anonim anahtarla doğrulandı (hassas tablolar 401, `app_private` 404) · `src/types/database.ts` üretildi
  - [x] `npm run db:push` hedef projeyi izin listesinden doğrulamadan çalışmaz (`scripts/db-push.mjs`)
  - [ ] *Ürün sahibi:* `.env.local` › `SUPABASE_SECRET_KEY` → `create-super-admin.mjs`
  - [ ] *Ürün sahibi:* yanlış projeye (başka uygulama) uygulanan `0001`–`0002`'nin temizliği — betik hazır, karar bekliyor
- [x] **Faz 03** — Medya migrasyonu (162 görsel → WebP → Storage) ✅ 2026-09-18
  - [x] `0013_storage_buckets.sql` — `media` (herkese açık) + `private-documents` (staff) bucket'ları ve `storage.objects` politikaları; PGlite'ta koruma bloğuyla atlanır
  - [x] **K-49** boru hattı: `scripts/media-migrate.mjs` — sharp ile WebP (480/960/1440 varyant + ≤1920 tam boy + 16 px blur), içerik hash'inden kararlı id, yeniden çalıştırılabilir upsert
  - [x] Video: olduğu gibi yüklenir; mp4 süre/boyut kutu yapısından okunur (ffmpeg yok)
  - [x] `src/core/storage` — `publicStorageUrl` · `mediaSrcSet` · `mediaAlt` (3 test) · saf boru hattı parçaları 5 testle kilitli
  - [x] `npm run media:report` — tarayıcıda galeri: klasör, varyant, boyut, alt metni
  - [x] **Uzak projeye yüklendi:** 166 dosya (162 WebP + 4 video) · `media_library` 166 kayıt · 0 yinelenen · ilk koşudaki 3 geçici 504 `--skip-existing` ile tamamlandı
  - [x] Boyut: görseller 41,7 → 35,2 MB tam boy + 39,1 MB varyant · videolar 31,8 MB olduğu gibi (mp4 süre/boyut okundu, webm için null)
  - [x] Yükleme yeniden denemesi (3×) · `--skip-existing` · manifest koşular arası birleştirilir
  - [x] Anonim anahtarla doğrulandı: `media` listelenir + CDN `max-age=31536000`, `private-documents` boş döner, her iki bucket'a yazma RLS'e takılır
  - [ ] *Faz 6'ya devredildi:* video poster kareleri ve mobil/masaüstü ayrı encode (ffmpeg gerektirir)
- [ ] **Faz 03B** — İçerik üretimi *(paralel, 4–17 boyunca)*
- [x] **Faz 04** — Tasarım sistemi · Header · Footer · Hata sayfaları · WhatsApp ✅ 2026-09-18
  - [x] Tipografi: Syne · IBM Plex Sans · IBM Plex Mono, `next/font` ile self-host, **`latin-ext`** (Türkçe glifler) · akışkan ölçek tokenları
  - [x] Semantik tokenlar tamamlandı; `--turq-deep` ölçüldü: kâğıt üzerinde **5.21:1** (AA ✓) · birincil buton turq-deep zemin + kâğıt metin
  - [x] `src/ui`: `Button` (primary/ghost, Link ya da button) · `Container` · `SectionHeading` (numaralı kicker) · `BrandMark` (logo gelene kadar kademe ikonu)
  - [x] `core/cache` (`cached` + etiket sözlüğü) · `core/db/createPublicClient` (çerezsiz anonim istemci, önbellek içinde güvenli)
  - [x] `modules/navigation`: menü veritabanından (`menus` + `menu_items`), `unstable_cache` + `menus` etiketi · saf `buildMenuTree` (4 test) · **K-50:** route'u olmayan öğe gösterilmez
  - [x] Header: ortalanmış marka (`1fr · auto · 1fr`), sol/sağ yuvalar, CTA, dil değiştirici, mobil `<dialog>` çekmecesi (odak tuzağı + Esc tarayıcıdan)
  - [x] Footer: menü sütunları + iletişim (yalnız dolu alanlar; **yer tutucu yok**) + yasal bar + telif
  - [x] `modules/site-settings`: `site_settings` → tipli `PublicSettings` (zod, bozuk değer alanı düşürür; 2 test)
  - [x] `modules/whatsapp`: yüzen buton + panel + sayfa bağlamlı `wa.me` mesajı; `is_enabled=false` (numara yok) → hiç render edilmez
  - [x] `modules/static-pages`: 404 başlığı/gövdesi admin'den (`static_pages.error-404`, K-08 dil süzgeci) · SVG çizgi animasyonu (404: eksik kolon · 500: ayrılan kiriş) · `prefers-reduced-motion`
  - [x] `0014_navigation_seed.sql`: header 8 · footer 3 sütun/13 · yasal 5 öğe (yalnız menü boşsa) + **şema düzeltmesi:** `menu_items` sıralama tekilliği `(menu_id, parent_id)` kapsamına alındı
  - [x] Testler: 3 DB testi (0014) · 9 birim · E2E `chrome.spec.ts` (header/footer/404/WhatsApp/mobil çekmece) · 404 başlığı DB ya da nötr metin kabul eder (CI'da Supabase yok)
  - [x] Lighthouse (üretim build, 3 koşu): performans **92–96** · erişilebilirlik **100** · en iyi uygulamalar **100** · CLS 0 · 394 KB. LCP laboratuvarda 2,7 sn (uyarı eşiği 2,0): metin LCP'si ön yüklenen marka fontuna bağlı; `display: optional` + ağırlık kırpma 3,7 → 2,7 sn getirdi. Yerel alt-kümeleme (`next/font/local` + pyftsubset) Faz 31'e not edildi
  - [ ] *Faz 5:* menü/ayar/hata metni admin ekranları (ön yüz ↔ admin matrisi orada kapanır) · header 👤 oturum bileşeni
  - [ ] *Faz 6:* header video üstünde şeffaf başlayıp scroll'da koyulaşma (hero gelince)
  - [ ] *Faz 7:* footer hizmet listesi `entity` bağlantılarıyla

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
