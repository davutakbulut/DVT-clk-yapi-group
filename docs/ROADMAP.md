# Yol Haritası — Canlı Durum

> **Bu dosya her fazdan sonra güncellenir.** Projenin güncel durumunu tek bakışta görmek için buraya bakın.

**Son güncelleme:** 2026-09-18
**Şu an:** Faz 10 — Talep + Mail ⏳ (sırada) · Faz 1–9 `feat/faz-02-database` dalında

---

## Temel İlke

**Yatay değil dikey dilim.** Bir özelliğin ön yüzü ve admin karşılığı **aynı fazda** bitirilir. Böylece iş herhangi bir noktada dursa, o ana kadar yapılanların hepsi çalışır, test edilmiş ve canlıdadır.

Her fazın sonunda: **test edildi → commit → PR → CI geçti → merge → Vercel'e dağıtıldı → board'da "Tamamlandı"**

---

## Sürümler

| Sürüm | Fazlar | Ne elde edilir | Durum |
|---|---|---|---|
| **v0.5 Temel** | 0–4 | Altyapı, tasarım sistemi, veritabanı | ✅ Faz 0–4 tamam |
| **v1.0 Yayına Hazır Site** | 5–12 | **Çalışan, yönetilebilen, canlı site** | 🔨 Faz 9 ✅ |
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
  - [x] `create-super-admin.mjs` çalıştırıldı: `dvtakblt@gmail.com` super_admin — *davet e-postası henüz onaylanmadı (ürün sahibi şifre belirleyecek)*
  - [x] Yanlış projeye uygulanan `0001`–`0002` temizlendi; doğrulandı (34 kendi tablosu, bizden 0)
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
  - [x] *Faz 6:* poster kareleri ve mobil/masaüstü video panelden ayrı ayrı seçilir (ffmpeg gerekmez)
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
  - [x] *Faz 6:* header video üstünde şeffaf başlayıp scroll'da koyulaşma ✅
  - [x] *Faz 7:* footer hizmet listesi (yayındaki hizmetler otomatik) ✅

## v1.0 — Yayına Hazır Site

- [x] **Faz 05** — Auth + Admin çatısı · üyelik ekranları · dashboard · medya kütüphanesi ✅ 2026-09-18
  - [x] `core/auth`: `getCurrentUser` (getUser + profil, istek başına önbellek) · `requireRole` (K-14 kapısı, açık rol listesi) · `safeReturnUrl` (açık yönlendirme savunması, 18 test)
  - [x] `core/db/createServerClient` (çerezli, RLS'li) · `createBrowserClient` (yalnız oturum durumu) · service-role istek yolunda YOK
  - [x] Middleware: oturumsuz `/admin` ve üye alanı → `/tr/giris?next=…` (yalnız deneyim; 4 yeni test)
  - [x] Üyelik ekranları: giriş · kayıt · şifremi unuttum · şifre yenile · hesabım (TR/EN route'ları, Server Action + `useActionState`, JS'siz çalışır) · `/auth/callback` PKCE
  - [x] Header hesap menüsü (istemci, `/api/me`'den; ISR'ı bozmaz, K-52): misafir → Giriş, üye → Hesabım / Yönetim Paneli / Çıkış
  - [x] `/admin` çatısı: `data-surface="admin"` + shadcn (yalnız admin, değişkenler `theme.admin.css`'te kapsamlı) · sol menü + mobil menü · rol süzgeçli kayıt listesi · 403 içeriği · noindex meta
  - [x] Dashboard: `admin_dashboard_counts` RPC (0015, invoker) · son hatalar · hızlı erişim
  - [x] **Faz 4 admin karşılıkları kapandı:** `/admin/menus` (öğe CRUD, üst/alt, sol/sağ, CTA, dil, `reorder_menu_items` tek RPC) · `/admin/settings` · `/admin/settings/whatsapp` · `/admin/pages/errors` (K-08 onay kutusu)
  - [x] `/admin/media`: yükleme (sihirli bayt + MIME uyumu + 25 MB, sharp ile aynı WebP boru hattı, kullanıcının oturumuyla Storage'a) · alt metni TR/EN · sil (varyantlarla) · klasör süzgeci
  - [x] `/admin/users`: liste · rol/aktiflik (yalnız super_admin; son super_admin korunur) · davet = OTP giriş bağlantısı (service-role'süz, K-51)
  - [x] Modül public API'si üçe ayrıldı: `index.ts` (istemciye inebilir) + `server.ts` (yalnız sunucu) + `actions.ts` (Server Action, doğrudan) — ESLint sınırı üçünü de tanır (K-51)
  - [x] `src/instrumentation.ts` — üretim hata yığınları loglanır; Faz 5'te iki üretim-yalnız hatayı bu yakaladı (RSC'ye fonksiyon prop, barrel action)
  - [x] `scripts/create-e2e-user.mjs`: ayrı E2E admin hesabı, rastgele şifre yalnız `.env.local`'da
  - [x] Testler: 189 birim/DB · E2E **91 geçti** (3 kırılım; `admin.spec.ts` 8 senaryo: kapı, açık yönlendirme, panel/menü/ayar/medya/üye, hesap menüsü, axe) — hesap yoksa atlanır
  - [x] Lighthouse (site, 3 koşu): performans 89–96 · erişilebilirlik 100 · en iyi uygulamalar 100 · CLS ≈ 0 · 431 KB — eşik üstünde, LCP uyarısı Faz 4'teki gibi
  - [ ] *Ürün sahibi:* Supabase Dashboard › Auth › URL Configuration: Site URL + Redirect `…/auth/callback` (davet/şifre bağlantıları için) · davet e-postasını onaylayıp şifre belirle
  - [ ] *Sonraki fazlar:* 8 saat hareketsizlik çıkışı + MFA (Faz 12 güvenlik denetimi) · giriş hız sınırı (Upstash, Faz 10) · TanStack Table liste ekranları (Faz 7'den itibaren)
- [x] **Faz 06** — Ana sayfa: scroll video hero + hakkımızda ✅ 2026-09-18
  - [x] `src/modules/home`: `HeroSection` (video → `HeroVideo` scroll-scrub/loop/poster; video yoksa koyu sahne + kademe motifi) · `AboutSection` (Markdown gövde, kaydırılmış çerçeveli görsel, 1px ızgaralı istatistikler) · `HeroOverlay` (header hero üstünde şeffaf, 32 px'te koyulaşır; sabitleme CSS `body:has(.hero)` → JS'siz de doğru)
  - [x] Admin: `/admin/pages/home` — `HeroForm` (video/poster medya kütüphanesinden, TR/EN metin, CTA yolu, tek aktif) + `AboutForm` (Markdown, görsel, istatistik satırları, K-08 yayın alanları) · `ADMIN_NAV` › home (editör+)
  - [x] Ortak içerik altyapısı (Faz 7+ için): `core/content` (`isVisibleIn` · `alternatesFromRow` · `publishedSlugs` · `publishSchema` · `publishColumns` · `slugMap`) · `admin-shell` ortak form parçaları (`LocalizedField` · `MediaSelect` · `PublishFields` · `StatusBadge` · `AdminPageHeader`) · `CACHE_TAGS` tüm içerik tabloları
  - [x] **K-53** `lib/markdown`: güvenli Markdown → HTML (izinli etiketler, kaçırılmış metin, güvenli href) · `markdownToText` · `readingMinutes` — 10 test
  - [x] `0016_home_seed.sql`: hero + hakkımızda başlangıç metni (yalnız boşsa; sayısal iddia yok; EN makine taslağı onaysız → yalnız TR yayında) — 4 DB testi; uzak projeye uygulandı
  - [x] **K-54** Tasarım desteği depoda: `.claude/skills/ui-ux-pro-max` (GitHub'ın en çok yıldızlı tasarım skill'i, kural indeksi + CLK tasarım sistemi MASTER) · `.claude/skills/frontend-design` (Anthropic)
  - [x] Testler: 201 birim/DB · E2E `home.spec.ts` (hero tek h1, header sabit/koyulaşma, axe, K-08 EN görünmez, admin form kaydet)
  - [ ] *Ürün sahibi:* hero videosu + poster kareleri medya kütüphanesine yüklenip `/admin/pages/home`'dan seçilecek (ffmpeg yok, poster ayrı yüklenir) · iOS Safari'de scrub/loop gözle kontrol
  - [ ] *Faz 10:* hero CTA `/get-quote` route'u gelince buton kendiliğinden görünür
- [x] **Faz 07** — Hizmetler (ön yüz + admin) ✅ 2026-09-18
  - [x] Route'lar: `/hizmetler` · `/hizmetler/[slug]` (EN `/services/…`) — `generateStaticParams` yayındaki slug'larla (K-46), eski slug → 308 (K-15), bilinmeyen → dilli 404, EN onaysız → 404 (K-08)
  - [x] `0017_services.sql`: `get_service_by_slug` RPC (0011 şablonu: alternates, cover, images, ilgili projeler, SSS — hepsi dil süzgeçli) · `reorder_content(p_table, p_ids)` izinli tablo listesiyle · 4 başlangıç hizmeti (**K-55**, yalnız TR yayında)
  - [x] `src/modules/services`: `ServicesList` · `ServiceDetail` (başlık bandı + kapak, Markdown gövde, numaralı süreç adımları, galeri, ilgili projeler, SSS `<details>`, teklif CTA route gelince) · `ServicesSection` (ana sayfa 02, koyu bant) · `ServiceCard` (1px ızgara, gölge yok) · `ServiceIcon` (lucide, emoji yok)
  - [x] SEO: `core/seo` — `JsonLd` (`<` kaçırılır), `breadcrumbList`, `organizationId`; hizmet sayfasında `Service` + `BreadcrumbList`, `inLanguage`, hreflang yalnız yayındaki dile, OG görseli, `noindex`/canonical override
  - [x] Footer "Hizmetler" sütunu yayındaki hizmetlerle otomatik dolar (uzun kuyruk iç bağlantı); dil değiştirici `RouteAlternates` ile karşı slug'a gider
  - [x] Admin `/admin/services`: liste (durum rozeti, öne çıkan, ↑↓ tek RPC, sil) · `/new` · `/[id]` — `ServiceForm`: içerik, süreç adımları (satır | satır), ikon, kapak, galeri (çoklu seçim), SEO alanları, yayın (slug TR otomatik / EN elle, K-08 onay)
  - [x] Testler: `processSteps` 3 · DB 5 (RPC dil süzgeci, SSS sızmaz, reorder RLS + izinsiz tablo, slug_history) · E2E `services.spec.ts` (liste axe, detay JSON-LD/hreflang/dil düğmesi, 404'ler, öksüz sayfa yok, admin oluştur→düzenle→sil)
  - [ ] *Sonraki:* SSS admin ekranı (`/admin/faq`, Faz 11) · `content_links` küratörlü ilgili içerik (Faz 9) · liste ekranında TanStack Table (kayıt sayısı büyüyünce)
- [x] **Faz 08** — Projeler (ön yüz + admin) ✅ 2026-09-18
  - [x] Route'lar: `/projeler` · `/projeler/kategori/[slug]` · `/projeler/[slug]` (EN `/projects/…`); kategori süzgeci bağlantı çipleriyle (JS'siz), kategori sayfasının hreflang'i aynı id'nin karşı dildeki slug'ından
  - [x] Detay: `get_project_by_slug` (0011) → künye (yalnız dolu alanlar: konum, işveren, m², ton, tarihler), kapak, Markdown gövde, galeri, kullanılan hizmetler, aynı kategoriden 3, önceki/sonraki, CTA; JSON-LD `Article` + `BreadcrumbList`
  - [x] `0018_project_categories_seed.sql`: 4 kategori (taksonomi, K-55) — projeler BOŞ başlar; 3 DB testi (taslak projenin ilişkisi/görseli sızmaz, RPC kategori+hizmet döner, reorder)
  - [x] Admin `/admin/projects` (liste `ContentTable` — admin-shell'de ortak: ad · slug · ek sütun · durum · ↑↓ · sil) · `/new` · `/[id]` (`ProjectForm`: içerik, künye, medya/galeri, kategori ve hizmet onay kutuları, SEO, yayın) · `/admin/project-categories` (satır içi CRUD + sıralama)
  - [x] Ana sayfa 03 proje galerisi (proje varsa); E2E `projects.spec.ts` (liste axe, kategori sayfası + 404, admin oluştur→yayınla→sitede künye/JSON-LD/hizmet bağlantısı→sil→404)
  - [ ] *Faz 17:* proje detayında ilgili yorumlar · *Faz 19–20:* `client_id`/`sale_id` bağlantısı (tamamlanan satış → referans proje)
- [x] **Faz 09** — Blog (ön yüz + admin + canlı SEO paneli) ✅ 2026-09-18
  - [x] Route'lar: `/blog` · `/blog/kategori/[slug]` · `/blog/etiket/[slug]` (5 yazıdan azsa noindex, 02-SEO) · `/blog/[slug]`; URL'de tarih yok
  - [x] Detay: başlık bandı (kategori · tarih · okuma süresi · yazar) → kapak → **içindekiler** (Markdown başlık id'leri, `extractHeadings`) + gövde → etiketler → yazar kutusu (yalnız yayındaki ekip üyesi, E-E-A-T) → aynı kategoriden 3 → önceki/sonraki → **yorumlar** (onaylı liste `published_comments` görünümünden + ziyaretçi formu: bal küpü, RLS yalnız `pending`, IP maskelenip özetlenir); JSON-LD `BlogPosting` (author, datePublished, dateModified, inLanguage) + `BreadcrumbList`
  - [x] `0019_blog.sql`: `get_blog_post_by_slug` RPC · anonim yorum INSERT politikası (dar kolon listesi, yalnız yoruma açık yayındaki yazı) · 3 kategori (taksonomi, K-55) — 4 DB testi
  - [x] Admin `/admin/blog` (liste) · `/new` · `/[id]`: `PostForm` + **canlı SEO paneli** (`analyzeSeo`, 17 madde, TR/EN sekmesi, skor; diğer yazıların odak kelimeleri ve girişleriyle benzersizlik/örtüşme; 4 test) · zamanlanmış yayın (`published_at` ileri tarih, K-07 gizler) · okuma süresi otomatik · her kayıtta `content_revisions` anlık görüntüsü · `/admin/blog/taxonomy` (kategori/etiket CRUD) · `/admin/blog/comments` (bekleyen/onaylı/red/spam süzgeci, tek tık moderasyon)
  - [x] Ana sayfa 04 son yazılar; E2E `blog.spec.ts` (liste axe, 404, admin: SEO paneli → yayınla → sitede TOC/BlogPosting → ziyaretçi yorumu → onayla → görünür → sil)
  - [ ] *Sonraki:* Tiptap/Draft Mode önizleme (v1'de Markdown, K-53) · RSS (Faz 30) · `content_links` küratörlü ilgili içerik · yorum yanıtı admin'den (şimdilik yalnız moderasyon)
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
