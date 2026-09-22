# Değişiklik Günlüğü

Bu projedeki tüm önemli değişiklikler burada kaydedilir.
Format [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/), sürümleme [SemVer](https://semver.org/lang/tr/).

---

## [Yayınlanmadı]

### Canlıya alındı — clkyapigroup.com (cPanel) · 2026-09-22
- Site `https://clkyapigroup.com` üzerinde çalışıyor (Node 22, Passenger); Let's Encrypt SSL (dns-01; alan adı + www + mail); ad sunucuları hosting'e çevrildi
- **Düzeltme (K-83):** başarılı girişte 502 → oturum çerezi `tokens-only`
- `scripts/cpanel-secrets.sh`: tek `secrets.env` dosyası (değerler ekrana yazılmaz); `app.js` açılışta okur, `cron.sh` aynı dosyayı kullanır
- 9 zamanlanmış görev (cPanel cron), DMARC kaydı (SPF ve DKIM hosting tarafından hazır), Supabase Site URL + Redirect URLs
- http → https 301 (`app.js`, statik dosyalar dahil); `secrets.env` sunucuda (0600) — cron uçları sırla 200, sırsız 401
- `scripts/cpanel-deploy.sh`: API anahtarıyla tek komut canlı güncelleme (yedekli, doğrulamalı)
- **İndekse açıldı:** `scripts/cpanel-settings.env` (gizli olmayan canlı ayarlar: `SITE_INDEXABLE=true`, IndexNow anahtarı) derlemeye ve pakete girer; robots.txt açık, X-Robots-Tag kalktı, 66 URL'lik site haritası
- **E-posta:** SMTP doğrulandı (form → müşteri + firma e-postası gönderildi). Hosting cron'u en sık 15 dk → `app.js` kuyruğu dakikada bir tetikler; `cron.sh` hataları `~/logs/clk-cron.log`'a yazar
- **Koruma:** kuyruk, teste ayrılmış adreslere (example.com, .test…) göndermez, iptal eder — canlıya geçişte birikmiş 100+ E2E e-postası gitmeye başlamıştı (37'si iptal edildi)
- **Auth e-postaları (K-84):** geri dönüş adresi düzeltildi (0.0.0.0:3000 → site adresi), tek kullanımlık bağlantılar onay düğmesiyle; Supabase şablonları Türkçe, gönderici `info@clkyapigroup.com` (özel SMTP)
- **Canlı önbellek:** `cacheMaxMemorySize: 0` (Passenger çok süreçli) → panel kayıtları anında görünür
- **E2E artıkları:** `scripts/purge-e2e-data.mjs` + Playwright `globalTeardown` — her koşu sonunda test kayıtları silinir; birikmiş 300+ kayıt temizlendi
- Düzeltilen testler: `admin.spec` menüler (gizli `<option>` eşleşmesi), `leads.spec` şablon (çift eşleşme)

### Eklendi — cPanel/VPS dağıtım paketi (K-82)
- `scripts/cpanel-package.sh <alan adı>` → `deploy/clk-site.zip` (~36 MB): bağımsız derleme, sırsız, Linux sharp ikilileri, `app.js` (Passenger) ve `cron.sh`
- `docs/processes/06-DEPLOY-CPANEL.md`: adım adım kurulum, ortam değişkenleri, cron tablosu, güncelleme/geri dönüş
- `SITE_ENV=production`: Vercel dışında üretim ortamı bildirimi (indeksleme koşulu); `NEXT_OUTPUT=standalone` isteğe bağlı

### Değişti — konfigüratör mobil yerleşimi + geri bağlantısı (K-81)
- **Mobil/tablet:** 3D tuval tam ekran; ölçüler, istatistikler, metraj, fiyat ve kayıt **sağdan açılan panelde** ("Ölçüler ve metraj" düğmesi, Esc/dışarı dokunma/✕ kapatır, kapalıyken `inert`); tuval üstünde kısa özet. İki konfigüratör ortak `ConfiguratorFrame` kullanır
- **Geri bağlantısı:** konfigüratörün içinde "← Konfigüratörler" (seçim sayfası); seçim sayfasında "← Ana sayfa"

### Eklendi — konfigüratör seçim sayfası + çok katlı çelik yapı konfigüratörü (K-80)
- **`/konfigurator`:** artık doğrudan 3D açmaz; "Hangi yapıyı tasarlamak istiyorsunuz?" — iki tür kartı. Eski `?w=&l=…` bağlantıları `/konfigurator/hol`'e yönlenir
- **`/konfigurator/hol`:** mevcut çelik hol konfigüratörü (taşındı; kayıt, fiyat, metraj aynı)
- **`/konfigurator/cok-katli`:** yeni — en · boy · kat yüksekliği · kat adedi; aks aralığı, kolon adedi, radye kalınlığı/hacmi, eleman metrajı; paylaşılabilir URL; InstancedMesh sahne
- **Panel:** Konfigüratör → Kurallar sayfasına "Çok katlı konfigüratör" formu (limitler, en büyük kolon aralığı, radye kuralı, profiller)
- **Test:** `multiStorey.test.ts` (5), `e2e/configurator-chooser.spec.ts` (4 × 3 kırılım); taşma ve axe listelerine yeni sayfalar

### Değişti — tasarım kuralları, tek kalıp bölüm başlıkları, örnek yorumlar (K-78, K-79)
- **`docs/design/04-DESIGN-RULES.md`:** kararsız kalınan noktaların kuralları (bölüm başlığı, renk, köşe/gölge, kart, carousel, buton, boş durum/örnek içerik, mobil, panel) + yeni bölüm kontrol listesi
- **Bölüm başlıkları:** "Sahadan videolar" (05) ve "Müşteri değerlendirmeleri" (06) artık "Son yazılar" ile aynı kalıpta — numaralı kicker, sola hizalı, sağda ghost buton; altın vurgu ve 20px köşeler kaldırıldı
- **Örnek yorumlar:** `0045` `testimonials.is_sample`; "Örnek yorum" rozeti, ortalama ve JSON-LD dışı; `scripts/sample-testimonials.mjs add|remove` (3 örnek kart eklendi)
- **Düzeltme (mobil panel):** uzun medya yollu `<select>` sayfayı cihazdan geniş çizdiriyor, dokunma hedefleri kayıyordu → seçim kutuları kabına sığıyor; video şeridi `position: relative`

### Eklendi — ana sayfada saha videoları içeriği + yorumlar davet kartı (K-77)
- **Saha videoları içeriği:** `scripts/field-videos-build.mjs` — firmanın kendi saha fotoğraflarından 4 dikey (720×1280) derleme video + kapak üretir, Storage'a yükler, `field_videos` satırlarını yazar (yeniden çalıştırılabilir; panel metnini ezmez). `assets/videos` altındaki stok görüntüler saha videosu olarak KULLANILMADI
- **Yorumlar:** yayında yorum yokken ana sayfa bölümü "İlk değerlendirmeyi siz yazın" davet kartıyla görünür (uydurma yorum yok); yorum gelince carousel
- **Video şeridi:** masaüstünde 4 kart kaydırmasız sığar, şerit ortalanır; tüm kartlar sığıyorsa oklar gizlenir
- **Test:** `field-videos.spec` — ana sayfada oynatıcı açılır, yorumlar bölümü carousel ya da davet kartı, axe + taşma denetimi

### Eklendi — Sahadan Videolar (ana sayfa + panel)
- **Ana sayfa:** "Sahadan Videolar" bölümü — dikey 9:16 kartlar, oynat düğmesi, kart üstünde kısa alıntı, altında başlık. Masaüstünde şerit + sağ altta oklar; mobilde orta-kart (komşular eğik ve soluk), oklar + hap nokta. Video **yalnız tıklanınca** yüklenir: YouTube `youtube-nocookie.com` üzerinden gömülür, yüklenmiş dosya `<video>` ile oynar. Kayıt yoksa bölüm hiç çizilmez (uydurma içerik yok, tohum yok)
- **Panel:** İçerik → **Sahadan Videolar** (`/admin/field-videos`): kaynak seçimi (YouTube bağlantısı — watch/youtu.be/shorts/embed — ya da medya kütüphanesinden video), kapak görseli, TR/EN başlık ve alıntı, sıra, yayında. Roller: super_admin/admin/editor yazar, viewer okur
- **Veritabanı:** `0044_field_videos.sql` — kaynak tutarlılığı CHECK, RLS (anonim yalnız yayındaki), denetim izi; CSP `frame-src`'ye `youtube-nocookie.com`
- **Testler:** `youtube.test.ts` (bağlantı ayrıştırma), `supabase/tests/field-videos.test.ts` (CHECK + RLS), `e2e/field-videos.spec.ts` (ekle → ana sayfada kart → axe → tıklayınca çerezsiz iframe → sil; 3 kırılım)

### Değişti — ana sayfa yorumlar alanı · eksik tokenlar · hero blob
- **Yorumlar (ana sayfa + detaylar):** orta-kart carousel — puan hapı ve ortalı başlık, vurgulu orta kart (çerçeve + gölge), soluk ve kenarlardan kırpık yan kartlar, yüzen yuvarlak oklar, hap biçimli aktif nokta, kaynak/doğrulama rozetleri, tarih. Yan kartlar `inert` + `aria-hidden` (soluk metin okunmak zorunda değil), şerit klavyeyle odaklanır; `reviews.spec` bölümü yorum VARKEN axe ile denetler. Yayında yorum yoksa bölüm hâlâ hiç çizilmez (sahte yorum yok)
- **Tanımsız CSS tokenları:** `--space-5`, `--space-10`, `--fs-h4` hiç tanımlı değildi (iç boşluk 0'a düşüyordu) → eklendi; `src/lib/__tests__/cssTokens.test.ts` yedeksiz kullanılan her `var(--x)`'in tanımlı olduğunu doğrular
- **Hero:** blob adresi video öğesi kullanırken serbest bırakılmıyor; blob okunamazsa doğrudan adrese düşülür

### Düzeltildi — mobilde yatay taşma
- Ürün detayında ölçü tablosunun son sütun başlığındaki `sr-only` (mutlak konumlu) öğe kaydırma kutusundan kaçıp belgeyi 440 → 658 px genişletiyordu (sayfa sağa kayıyor, sağda boş şerit). Başlık `aria-label` oldu; kaydırılan sarmalayıcılar (`.overflow-x-auto`, `.table-scroll`) artık konumlu
- `e2e/mobile-overflow.spec.ts`: 27 sayfada belge genişliği ≤ görünüm alanı denetimi (taşıran öğeyi adıyla raporlar)
- Kaydırılan tablolarda ilk sütun sabit (sticky)

### Eklendi — ürün kataloğu · WhatsApp ile stok/sipariş sorusu · Markdown tabloları
- `supabase/migrations/0043_product_catalog_seed.sql`: firmanın KENDİ iş fotoğraflarındaki dört ürün hattı — Kutu Profil Karkas · Alçıpan Bölme Duvar ve Asma Tavan Karkası · Hafif Çelik Yapı Sistemi · Çelik Körkasa; 3 kategori, TR+EN ayrıntılı açıklama, karşılaştırma tabloları, 18 teknik özellik, 19 ölçü satırı (TS EN 10219 standart kg/m), kapak + galeri kendi görsellerinden. Fiyat, stok miktarı, kapasite YOK
- `modules/whatsapp`: `WhatsAppInquiry` (sayfa içi büyük düğme + tablo satırı bağlantısı; WhatsApp kapalıysa render edilmez) · `domain/waLink`; ürün detayında "WhatsApp ile stok ve sipariş sor" + her ölçü satırında "WhatsApp'tan sor" (hazır mesajda ürün, ölçü, sayfa adresi)
- `lib/markdown`: GFM tablo desteği (hizalama, satır başlığı, yatay kaydırma, HTML kaçırma; 2 test) · ürün kartında rozetler (öne çıkan · N ölçü)

### Değişti — panel çatısı · font yükleme · WhatsApp paneli
- **WhatsApp paneli yeniden tasarlandı:** degrade başlık (baş harf avatarı, çevrimiçi rozeti, yanıt süresi), karşılama balonu, iletişim kartı (telefon + kopyala; Site Ayarları'nda doluysa e-posta, adres, çalışma saati), büyük yeşil CTA, ikincil düğmeler; kapalıyken koyu etiket + nabız halkalı düğme (nabız `::before`'da → düğme kutusu sabit), açıkken kapat düğmesi
- **Panel kenar çubuğu:** 54 bağlantı iş akışına göre 10 bölüme ayrıldı (Genel · İçerik · Katalog ve Fiyat · Kurumsal · Talep ve Satış · Konfigüratör · Analitik · Site ve SEO · Ayarlar · Sistem); bölümler daraltılır (seçim tarayıcıda hatırlanır, bulunulan bölüm hep açık), menüde arama, bölüm ikonları ve sayaçları, en uzun eşleşen adres işaretlenir; koyu marka zemini, mobilde çekmece + arka plan perdesi
- **Panel üst şeridi:** yapışkan, bulanık zemin; konum kırıntısı (bölüm / sayfa), bildirim zili, "Siteyi gör" (yeni sekme), kullanıcı rozeti (baş harfler · ad · rol), çıkış
- **Fontlar:** `swap` → `block` (yedek fonttan marka fontuna görünür geçiş yok); `SiteLoader` fontları Türkçe harfli örnekle açıkça yükleyip öyle kapanır
- `e2e/chrome.spec.ts`: WhatsApp testi veriyle uyumlu (numara yoksa buton yok; varsa panel + anlamlı hazır mesaj)

### Düzeltildi — panel konsol hataları
- WhatsApp: kayıtlı mesaj şablonu anlamsız kısaysa (ör. yanlışlıkla `/`) yok sayılıp varsayılan mesaj kullanılır; form 10 karakterden kısa şablonu kaydetmez ve alan altında açıklama gösterir
- `components/ui/input`: kayıt sonrası `defaultValue` değişince alan yeniden kurulur → Base UI "default value changed" uyarısı biter, kaydedilen değer ekranda güncel görünür (paneldeki tüm formlar)
- `Admin.whatsapp.template` ve `Admin.mailTemplates.lead` düz metinde `{{url}}` / `{{degisken}}` içeriyordu → next-intl `MALFORMED_ARGUMENT`; ICU kaçışıyla `'{{url}}'` yazıldı. `src/i18n/__tests__/messagesFormat.test.ts`: her mesaj ICU ayrıştırıcısından geçer + TR/EN anahtar eşliği
- `AdminLayout` → `AdminShell` `headerExtra` öğesine `key` (sunucudan gelen öğe kardeşlerle render edilince React anahtar uyarısı veriyordu)

### Eklendi — ilk giriş yükleyicisi (K-74)
- `src/ui/SiteLoader.tsx` + `siteLoaderShared.ts`: çelik çerçeve gerçek yükleme ilerledikçe kurulur (SVG, `--p` ile dilimli çizim), yüzde + ilerleme çizgisi, kaynak kıvılcımı; oturumda bir kez, JS'siz/otomasyonda kapalı, 7 sn üst sınır + 9 sn CSS emniyeti; `A11y.loading`
- `HeroVideo`: scrub kaynağı `fetch` akışıyla tamamen indirilir (blob) → seek ağ beklemez; ilerleme `clk:hero-progress` olayıyla yayınlanır; indirme başarısızsa doğrudan adrese düşer
- `e2e/loader.spec.ts` (otomasyonda kapalı · zorlanınca görünür/kapanır/işaret yazar · video blob)

### Değişti — tipografi · mobil scrub · İngilizce içerik
- **Fontlar (K-72):** Syne + IBM Plex → **Archivo** (başlık, `wdth` ekseni %116) + **Geist** (gövde) + **Geist Mono** (etiket). `display: optional` → `swap`: Türkçe harflerin bulunduğu `latin-ext` alt kümesi geç gelince sayfa boyunca yedek fontla çiziliyordu (karışık "inşa"); artık her zaman yerine oturur
- **Mobil hero:** telefonda da kaydırmayla kare kare (dikey 912×1080 `-g 1`, 5,3 MB; 220dvh); iOS için oynat-duraklat ile kod çözücü uyandırma; dosya yüklenemezse poster kalır
- **İngilizce (0042):** hizmetler, çözüm ve hakkımızda EN yayında; 11 SSS + 3 blog yazısı İngilizce eklendi; varsayılan meta açıklama TR/EN. Yasal sayfalar ve mail şablonları kapsam dışı (K-08). Tarama: 36 EN sayfa 200, Türkçe sızıntı yok
- Testler: `home`/`services`/`seo` EN yayınına göre güncellendi; kariyer başvurusunda çerez bandı kapatılır

### Eklendi — paylaşım tüneli · mobil hero kalitesi
- `scripts/share-tunnel.sh` (`start` · `rebuild` · `status` · `stop`): üretim derlemesi (`.next-share`, port 3400) + Cloudflare hızlı tüneli; adres tünel işlemi yaşadıkça sabit, `rebuild` adresi değiştirmeden siteyi günceller; `caffeinate` ile Mac uyumaz; `noindex` açık. `next.config` `NEXT_DIST_DIR`
- Mobil hero: yatay 854×480 `-g 1` dosya dikey ekranda bulanıktı → telefon için dikey kırpım + lanczos 912×1080 + hafif keskinleştirme, normal GOP (3 MB); tablet masaüstü `-g 1` dosyasıyla scrub eder; kullanılmayan hero dosyaları Storage'dan kaldırıldı

### Eklendi — başlangıç içeriği (yasal sayfalar · SSS · blog)
- `supabase/migrations/0041_content_legal_faq_blog.sql`: 4 yasal sayfa (gizlilik, çerez, KVKK aydınlatma, kullanım koşulları) sitenin gerçekte yaptığı veri işlemeye göre yazıldı ve **TR** yayınlandı (EN: Kural 7 gereği insan onayı bekler) · 11 genel SSS · 3 bilgilendirici blog yazısı (kategori başına bir). Yeniden çalıştırılabilir; `supabase/tests/content-seed.test.ts`
- Ticari unvan/adres uydurulmadı (İletişim sayfasına atıf) — **hukukçu gözden geçirmeli**. Proje, referans, belge, ekip, yorum, fiyat ve ürün verisi EKLENMEDİ (CLAUDE.md "asla")
- Yasal sayfalar `RouteAlternates` kaydeder: EN yayında değilken dil değiştirici ana sayfaya gider; `e2e/seo.spec.ts` yeni duruma göre güncellendi

### Eklendi — tek kullanımlık şifre belirleme bağlantısı
- `scripts/admin-recovery-link.mjs`: hesap için tek kullanımlık bağlantıyı yalnız terminale yazar (şifre hiçbir betikten/sohbetten geçmez) · `/auth/callback` `token_hash` doğrulaması (`verifyOtp`; recovery/invite/email/signup) — ilk kullanım oturum açar, ikinci kullanım ve geçersiz token `/tr/giris?error=link`

### Düzeltildi — ölü bağlantılar · yerel sunucu kararlılığı
- Footer yasal bağlantıları: taslak/yayınlanmamış yasal sayfalar (gizlilik, çerez, KVKK, kullanım koşulları) 404 veriyordu ama footer'da bağlıydı → `getMenu` o dilde yayında olmayan yasal yolları gizler (metin girilip yayınlanınca kendiliğinden görünür)
- Dil değiştirici (SSR/JS'siz): slug'lı sayfada karşı dil yayında değilken 404'e bağlanıyordu → bölüm listesine iner; hidrasyonda tam hedef
- Dev sunucusu `.next-dev` klasörüne yazar (`next.config.ts` `distDir`): E2E/üretim derlemesi `.next`'i yazarken açık dev sunucusu bozulmuyor ("Internal Server Error" = bozuk `prerender-manifest.json` idi); `tsconfig` iki tip klasörünü de içerir
- Tarama: TR + EN ana sayfadan iki seviye, 57 sayfa → hepsi 200

### Düzeltildi — Scroll video hero gerçekten devrede · header yerleşimi
- **Hero:** scrub bileşeni Faz 6'dan beri koddaydı ama aktif `hero_media` kaydına video hiç bağlanmamıştı → site desenli yedek hero'yu gösteriyordu. `scripts/hero-video-build.mjs` (ffmpeg): masaüstü 1280p **`-g 1`** (6,4 MB), mobil/tablet 854p `-g 1` (1,9 MB), posterler = ilk kare (WebP) → Storage + `media_library` + aktif hero kaydı
- `HeroVideo`: tablet (≥ 768) düşük çözünürlüklü kaynakla scrub, telefon otomatik döngü, `matchMedia` dinleyicileri, önceki seek bitmeden yenisi yok, seek gecikmesi ölçümü → zayıf cihazda döngüye düşüş, `--hero-progress`
- Başlık/CTA artık scrub boyunca videonun üstünde sticky (önceden 300dvh'nin en altındaydı, ilk ekranda başlık yoktu); son %25'te solup yükselir; kaydırma ipucu + ilerleme çizgisi (`Home.scrollHint`)
- Mobil hero taşması: uzun kelime ızgara sütununu genişletiyordu → `minmax(0,1fr)` + başlık ölçeği
- **Header:** logo en başta, menü yanında tek nav (veritabanı sırası); sağda dil + sepet + hesap + CTA. < 1280 px'te dil ve sepet header'ın üstünde ince bara çıkar (tek DOM, CSS grid alanları); `--header-h` toplam yükseklik (`--header-row-h` + `--topbar-h`)
- `e2e/admin.spec.ts`: "route yok" beklentisi Faz 26'dan beri eskiydi (tüm header öğelerinin route'u var)

### Eklendi — Faz 31 · Erişilebilirlik · performans · yedek tatbikatı
- `e2e/accessibility-audit.spec.ts` (38 sayfa axe + konfigüratör klavye) · konfigüratör kontrast düzeltmeleri (`globals.css`, `TakeoffPanel`, `SavePanel`)
- `package.json` `sideEffects` (istemci paketinden supabase-js düştü) · `Scene` demand frameloop/dpr/gölge/segment · `Configurator` boş anda sahne
- `scripts/backup-export.mjs` · `scripts/backup-restore-drill.mjs` · `npm run backup:export|backup:drill` · `backups/` gitignore · şim `email_confirmed_at`

### Eklendi — Faz 30 · AI görünürlük · IndexNow · RSS
- `core/jobs/indexNow` (2 test) · `app/api/cron/indexnow` · `app/api/indexnow-key` · `app/[locale]/feed.xml` · `i18n/alternates` RSS türü · `llms.txt` genişletme · `site-settings` `data/indexNowRepository` + `triggerIndexNow` · SEO ayarları bölümü · `vercel.json` cron; mesajlar; `e2e/seo-feeds.spec.ts`

### Eklendi — Faz 29 · Konfigüratör admin + satışa dönüştür
- `configurator` modülü: `data/adminConfigurationsRepository` · `RulesForm` · `actions` (`saveRules`, `convertConfigurationToSale`, `archiveConfiguration`); route'lar `app/admin/configurator` (liste · `[id]` · `rules`); talep detayı bağlantısı; nav; mesajlar `Admin.configurations`, `Admin.configuratorRules`
- `supabase/migrations/0040_configuration_to_sale.sql` (`create_sale_from_configuration`); `e2e/configurator-admin.spec.ts`; cleanup sıralaması

### Eklendi — Faz 28 · Fiyat, kaydetme, teklif, PDF
- `configurator` modülü: `domain/pricing` (2 test) · `data/pricesRepository` · `data/configurationsRepository` · `actions` (`saveConfiguration`, `setSharing`) · `PricePanel` · `SavePanel` · `PrintButton` · `MyConfigurations`; `rulesRepository` `price_map`
- Route'lar `app/[locale]/(configurator)/configurator/k/[token]` (+ `/print`); `/konfigurator/k/[token]`, `/yazdir`; Hesabım listesi; `leads` kaynak `configurator` + `configurationToken`; CSS kapı/yazdır
- `supabase/migrations/0039_configurator_save.sql`; mesajlar `Configurator.{price,save,shared,print,mine}`; `e2e/configurator-save.spec.ts`; cleanup `configurations`

### Eklendi — Faz 27 · Metraj motoru
- `configurator` modülü: `domain/takeoff` (2 test, elle doğrulanmış) · `data/profilesRepository` · `data/adminProfilesRepository` · `actions` (profil kaydet/sil) · `TakeoffPanel` · `SteelProfileForm`; `server.ts`
- Route `app/admin/configurator/profiles`; nav `steelProfiles`; mesajlar; CSS `.configurator-table`; `e2e/configurator-takeoff.spec.ts`; cleanup

### Eklendi — Faz 26 · Three.js → React Three Fiber
- `src/modules/configurator` — `domain/params` · `domain/structure` (prototip v4 saf port, 4 test) · `domain/profiles` · `data/rulesRepository` · `Scene` (R3F, dinamik) · `Configurator`
- Route grubu `app/[locale]/(configurator)` (layout, `error.tsx` yedek, `configurator/page`); `/konfigurator`; kill switch `configurator`; `configurator.disclaimer`; CSS `.configurator-*`; mesajlar `Configurator`
- `supabase/migrations/0038_configurator_rules.sql`; `e2e/configurator.spec.ts`; `three`, `@react-three/fiber`, `@react-three/drei` bağımlılıkları; `ui/Container` ElementType daraltması

### Eklendi — Faz 25 · Hata takip + performans izleme
- `src/modules/errors` — `ErrorReporter` · `NotFoundReporter` · `domain/errorReport` (3 test) · `data/errorsRepository` · `actions`; `core/observability/logger` hata raporlama; `core/jobs/heartbeatMonitor`
- Route'lar `/api/errors`, `/api/csp-report`, `/api/cron/heartbeat`, `app/admin/errors`, `app/admin/errors/links`, `app/admin/analytics/vitals`; `next.config` CSP report-only; kök layout + 404 sayfası raporlayıcılar; nav; `vercel.json`
- `supabase/migrations/0037_errors.sql` (`report_error`, `web_vitals_summary`, `system.stale_cron` şablonu, `alerted_at`) · `supabase/tests/errors.test.ts` (3); mesajlar `Admin.errorLogs`; `e2e/errors.spec.ts`; cleanup betiği E2E hata kayıtlarını temizler

### Eklendi — Faz 24 · Sıcaklık haritası + huni + form analizi
- `analytics` modülü: `data/insightsRepository` (heatmap, huni değerlendirme, form istatistikleri, yolculuk) · `adminFunnelsRepository` · `InsightViews` · `FunnelForm`; `actions` huni kaydet/sil; route'lar `app/admin/analytics/{heatmap,funnels,forms,journeys}`; nav
- `supabase/migrations/0036_funnels.sql` (`evaluate_funnel`) · `supabase/tests/funnels.test.ts` (2); mesajlar `Admin.insights`; `e2e/insights.spec.ts`

### Eklendi — Faz 23 · İzleyici altyapısı
- `src/modules/analytics` — `Tracker` · `ThirdPartyScripts` · `AnalyticsOverview` · `AnalyticsSettingsForm`; `domain/classify` (3 test); `data/ingestRepository` · `analyticsRepository`; `actions` (ayar)
- `/api/analytics/collect` · `/api/cron/analytics` · `core/jobs/analyticsNightly`; route'lar `app/admin/analytics`, `app/admin/settings/analytics`; marketing layout izleyici + üçüncü parti scriptler (onaya bağlı); `site-settings` `analytics` alanı; nav
- `supabase/migrations/0035_analytics_ingest.sql` · `supabase/tests/analytics.test.ts` (3); mesajlar `Admin.analytics`, `Admin.analyticsSettings`; `e2e/analytics.spec.ts`

### Eklendi — Faz 22 · Raporlama
- `src/modules/reports` — `domain/aggregate` (3 test) · `data/reportsRepository` · `ReportSections`; route'lar `app/admin/reports` (+ `export` CSV); nav; mesajlar `Admin.reports`; `e2e/reports.spec.ts`

### Eklendi — Faz 21 · Fatura & Tahsilat
- `src/modules/finance` — `InvoiceForm` · `ScheduleForm` · `PaymentForm`; `domain/invoiceMath` (3 test); `actions` (fatura, plan, tahsilat; yalnız admin); `data/adminFinanceRepository`
- Route'lar `app/admin/sales/[id]/finance` · `app/admin/invoices`; panel sayaçları/uyarı kartı; satış detayında bağlantı; nav; `core/jobs/paymentReminders` + `/api/cron/reminders`
- `supabase/migrations/0034_finance.sql` · `supabase/tests/finance.test.ts` (3); mesajlar `Admin.finance`; `e2e/finance.spec.ts`; cleanup betiği fatura/tahsilat/plan alt kayıtlarını da temizler

### Eklendi — Faz 20 · Satış & Maliyet
- `src/modules/sales` — `SaleForm` · `SalesForCustomer` · `ConvertLeadToSaleButton` · `ProjectFromSaleButton`; `domain/saleMath` · `domain/saleLines` (4 test); `actions` (kaydet [rol-duyarlı: temel tablo / görünüm], sil, talepten dönüştür, projeye dönüştür); `data/adminSalesRepository`
- `core/jobs/tcmb` (2 test) · `core/jobs/exchangeRates` · `/api/cron/rates` (`vercel.json`); route'lar `app/admin/sales` (liste · new · [id]); talep ve müşteri detayı bağlantıları; nav
- `supabase/migrations/0030_sales.sql` (`exchange_rates`, `create_sale_from_lead`) · `0031_sales_trusted.sql` · `supabase/tests/sales.test.ts` (3); mesajlar `Admin.sales`; `e2e/sales.spec.ts`; cleanup betiği E2E satışlarını temizler

### Eklendi — Faz 19 · Müşteri (CRM)
- `src/modules/customers` — `CustomerForm` · `ConvertLeadButton` · `domain/customerSchema` · `actions` · `data/adminCustomersRepository`; route'lar `app/admin/customers` (liste · new · [id]); talep detayında dönüştür/aç bağlantısı; panel "Aktif müşteri" kartı
- `supabase/migrations/0029_customers.sql` (`create_customer_from_lead`, `anonymize_customer`, `admin_dashboard_counts` customers) · `supabase/tests/customers.test.ts` (4); mesajlar `Admin.customers`; `e2e/customers.spec.ts`; cleanup betiği E2E müşterilerini temizler

### Düzeltildi
- Denetim kaydı sorgusu `profiles.email` (olmayan kolon) istiyordu → yalnız ad

### Eklendi — Faz 18 · Sistem yönetimi
- Kill switch: `site-settings` `modules` alanı, `MODULE_KEYS`/`MODULE_BY_PATH`/`isModuleEnabled`/`moduleEnabled`/`hiddenMenuPaths`, `ModulesForm` + `saveModules`, `/admin/settings/modules`; 22 marketing route'unda kapı, `getMenu` süzgeci, ana sayfa bölümleri
- `src/modules/translations` (override tablosu, sözlük, eksikler) + `/admin/translations{,/glossary,/missing}`; `i18n/request.ts` `applyOverrides`
- `src/modules/redirects` + `/admin/redirects` + `/api/redirects{,/hit}` + `core/middleware/redirects` (middleware'e bağlı)
- `src/modules/notifications` (`NotificationBell`, `NotificationList`, okundu RPC) + `/admin/notifications` + `/api/admin/notifications`; `AdminShell` `headerExtra`
- `src/modules/audit` + `/admin/audit`; `navigation` `orphanRoutes` → SEO ayarları sayfasında öksüz rapor
- `core/jobs/purgeApplications` + `/api/cron/purge` (`vercel.json` 03:30); `0028_system.sql` · `system.test.ts` (4); `e2e/system.spec.ts`; cleanup betiği yönlendirme/etiket/sözlük E2E kayıtlarını temizler

### Değişti
- `modules.enabled` ayarı herkese açık (K-61); `rls-content.test.ts` beklentisi güncellendi

### Eklendi — Faz 17 · Müşteri yorumları + Google Places
- `src/modules/testimonials` — `TestimonialsSection` · `TestimonialsCarousel` · `TestimonialsFor` · `RatingBadge` · `ReviewsPage` · `ReviewForm` · `TestimonialForm` · `GoogleSyncPanel`; `domain/testimonials` (2 test); `actions` (ziyaretçi RPC, elle yorum, durum, sıralama, Place ID, şimdi eşitle)
- `src/core/jobs/googleReviews` (2 test) · `src/core/jobs/reviewSync`; route `/api/cron/reviews` (`vercel.json` 03:00); `/reviews` (tr `/yorumlar`); `app/admin/testimonials`; ana sayfa 05. bölüm; hizmet detayında yorumlar + Review/AggregateRating JSON-LD; `ProjectDetail`/`ProductDetail` `extra` slotu
- `supabase/migrations/0027_testimonials.sql` · `supabase/tests/testimonials.test.ts` (4); mesajlar `Testimonials`, `Admin.testimonials`; `globals.css` carousel/yıldız/rozet; `e2e/reviews.spec.ts`; cleanup betiği E2E yorumlarını temizler

### Eklendi — Faz 16 · Fiyat rehberi + hesaplayıcı
- `src/modules/pricing` — `PricingList` · `PriceGuideDetail` · `PriceCalculator` (istemci) · `PriceGuideForm` · `MaterialPriceForm`; `domain/priceLines` · `domain/estimate` (4 test); `actions` (rehber CRUD + satırlar, malzeme fiyatı CRUD yalnız admin); `data/pricingRepository` · `adminPricingRepository`
- Route'lar `/pricing` (tr `/fiyatlar`) · `/pricing/[slug]`; `app/admin/pricing` (liste · new · [id] · materials); `whatsapp` modülü `getCachedWhatsAppConfig` dışa açıldı (hesaplayıcı CTA)
- `supabase/migrations/0026_price_guides.sql` (`get_price_guide_by_slug` security definer, `touch_price_guide`) · `supabase/tests/price-guides.test.ts` (4); mesajlar `Pricing`, `Admin.pricing`, `Admin.materials`; `e2e/pricing.spec.ts`; cleanup betiği rehber + E2E malzeme fiyatlarını temizler

### Eklendi — Faz 15 · Çözüm sayfaları
- `src/modules/solutions` — `SolutionsList` · `SolutionDetail` · `SolutionCard` · `SolutionsForService` · `SolutionForm`; `domain/solutionLines` (2 test); `actions` (CRUD + sıralama); `data/solutionsRepository` · `adminSolutionsRepository`
- Route'lar `/solutions` (tr `/cozumler`) · `/solutions/[slug]`; `app/admin/solutions` (liste · new · [id]); `ServiceDetail` `extra` slotu; sitemap + llms.txt + admin nav; `globals.css` `.advantage-grid`
- `supabase/migrations/0025_solutions.sql` (`get_solution_by_slug` + tohum) · `supabase/tests/solutions.test.ts` (3); mesajlar `Solutions`, `Admin.solutions`; `e2e/solutions.spec.ts`; cleanup betiği çözümleri de temizler

### Eklendi — Faz 14 · Teklif sepeti
- `src/modules/quote-basket` — `domain/basket` (6 test) · `BasketProvider` · `AddToBasket` · `BasketLink` · `BasketPage`; route `/quote-basket` (tr `/teklif-sepeti`, noindex); header rozeti `.basket-badge`
- `leads`: `LeadForm` `variant="quote_basket"` + `hiddenFields` + `onSuccess`; `leadSchema` `items` + `parseBasketItems`; `submitLead` kalemleri RPC'ye geçirir; admin talep detayında "Teklif kalemleri"
- `supabase/migrations/0024_quote_basket.sql` — `submit_lead` kalem işleme (DB'den anlık görüntü); `supabase/tests/quote-basket.test.ts` (2); mesajlar `Basket`, `Products.unitDefault`, `Admin.leads.item*`; `e2e/basket.spec.ts`

### Değişti
- `LeadForm.onSuccess` artık sonuç verisini (ref no) verir; `BasketPage` sepet boşaldıktan sonra başarı kutusunu korur
- E2E ürün/sepet testleri stok kodunu zaman damgasıyla üretir (`stock_code` global benzersiz, paralel projeler çakışıyordu)
- Blog yorum moderasyonu artık `blog` önbellek etiketini de tazeler (onaylanan yorum sitede hemen görünür)
- `rls-content.test.ts`: `seo.verification` 0022 ile herkese açık (HTML meta) — beklenti güncellendi; `leads.test.ts` şablon sayımı `lead.%` anahtarlarıyla

### Eklendi — Faz 13 · Ürün kataloğu
- `src/modules/products` — site: `ProductsList` · `ProductDetail` · `ProductCard`; admin: `ProductForm` · `ProductCategoryForm`; `domain/productLines` (özellik/varyant satır biçimleri, 2 test); `actions` (ürün/kategori CRUD + sıralama, alt tablolar sil-yaz)
- Route'lar `/products` · `/products/category/[slug]` · `/products/[slug]`; `app/admin/products` (liste · new · [id]) · `app/admin/product-categories`
- `supabase/migrations/0023_products.sql` (`get_product_by_slug`) · `supabase/tests/products.test.ts` (3); `globals.css` `.data-table`; mesajlar `Products`, `Admin.products`, `Admin.productCategories`; `e2e/products.spec.ts`; cleanup betiği ürünleri de temizler

### Eklendi — Faz 12 · SEO temeli + yayın hazırlığı
- `app/sitemap.ts` (hreflang'lı, DB'den) · `app/robots.ts` (AI botları, sitemap) · `app/llms.txt/route.ts` · `app/[locale]/(marketing)/sitemap` (HTML)
- `src/core/seo/organization.ts` — `organizationJsonLd` · `localBusinessJsonLd`; kök layout OG/Twitter/doğrulama meta'ları
- `src/modules/consent` — `CookieBanner` · `CookieSettingsButton` · `domain/consent` (1 test); footer bağlantısı
- `src/modules/static-pages` — `LegalPage` · `LegalPageForm` · `legalPageRepository` · `saveLegalPage`; 4 yasal route + `app/admin/pages`, `app/admin/pages/[key]`
- `src/modules/site-settings` — `cookie_banner` · `maintenance` · `seo.verification` · `seo.default_og_media_id` alanları; `SeoSettingsForm` · `CookieBannerForm` · `MaintenanceForm`; `app/admin/settings/{seo,cookies,maintenance}`; bakım modu (marketing layout)
- `next.config.ts` güvenlik başlıkları + `trailingSlash: false`; `supabase/migrations/0022_legal_pages.sql` · `supabase/tests/legal-pages.test.ts` (3); `e2e/seo.spec.ts`

### Eklendi — Faz 11 · Kurumsal
- `src/modules/corporate` — site: `TeamGrid` · `ClientLogos` · `CertificatesList` · `JobList` · `JobDetail` · `ApplicationForm` · `FaqList` · `CorporateLinks`; admin: `TeamMemberForm` · `ClientForm` · `CertificateForm` · `JobPostingForm` · `ApplicationStatusForm` · `FaqForm`; `actions` (ekip/referans/belge/ilan/SSS CRUD + sıralama, başvuru durumu, ziyaretçi başvurusu + CV yükleme)
- Route'lar `/about` · `/team` · `/references` · `/certificates` · `/careers` · `/careers/[slug]` · `/faq`; `app/admin/{team,references,certificates,careers,careers/applications,faq}`
- `supabase/migrations/0021_corporate.sql` · `supabase/tests/corporate.test.ts` (3); `AboutSection` `headingLevel` desteği; `globals.css` `.logo-grid`
- Mesajlar `Corporate`, `Admin.corporate.*`; `e2e/corporate.spec.ts`; `scripts/e2e-cleanup.mjs` ilan ve başvuruları da temizler

### Eklendi — Faz 10 · Talep + Mail
- `src/modules/leads` — site: `LeadForm` · `LeadFormSection` · `ContactInfo`; admin: `LeadStatusForm` · `LeadNoteForm` · `LeadReplyForm` · `QuoteFormOptionsForm` · `MailTemplateForm`; `domain/leadSchema` (2 test); `actions` (`submitLead` · `updateLead` · `addLeadNote` · `replyLead` · `saveQuoteFormOptions` · `saveMailTemplate` · `sendTestMail`)
- `src/core/mail` (`renderMail` · `sendWithFallback` Resend/SMTP) · `src/core/jobs/mailQueue` · `src/core/db/createServiceClient` (**K-56**) · `src/core/rate-limit` · `app/api/cron/mail` · `vercel.json`
- Route'lar `/contact` · `/get-quote`; `app/admin/leads` · `app/admin/leads/[id]` · `app/admin/settings/form` · `app/admin/mail-templates`
- `supabase/migrations/0020_leads_mail.sql` · `supabase/tests/leads.test.ts` (5); `nodemailer` bağımlılığı
- `ActionState.data` (küçük dönüş verisi) · `rateLimited` hata anahtarı; mesajlar `Contact`, `Quote`, `LeadForm`, `Admin.leads`, `Admin.mail`, `Admin.formSettings`; `e2e/leads.spec.ts`

### Eklendi — Faz 9 · Blog
- `src/modules/blog` — site: `PostsList` · `PostDetail` (TOC, yazar kutusu, yorumlar) · `BlogSection` · `PostCard` · `CommentForm`; admin: `PostForm` · `SeoPanel` · `TaxonomyForm`; `domain/seoAnalysis` (17 madde, 4 test); `actions` (yazı/sınıflandırma kaydet-sil, moderasyon, ziyaretçi yorumu)
- `src/lib/markdown` — `extractHeadings` + başlık `id`'leri (içindekiler); testler
- Route'lar `/blog` · `/blog/[slug]` · `/blog/category/[slug]` · `/blog/tag/[slug]`; `app/admin/blog` (liste · new · [id] · taxonomy · comments)
- `supabase/migrations/0019_blog.sql` · `supabase/tests/blog.test.ts` (4)
- `globals.css` — `.toc` · `.prose-article` · `.author-box` · `.comment` · `.field`; mesajlar `Blog`, `Admin.blog`, `Admin.blogTaxonomy`, `Admin.comments`, `Admin.seoPanel`; `e2e/blog.spec.ts`

### Eklendi — Faz 8 · Projeler
- `src/modules/projects` — site: `ProjectsList` (kategori çipleri) · `ProjectDetail` (künye, galeri, hizmetler, ilgili, önceki/sonraki) · `ProjectsSection` · `ProjectCard`; admin: `ProjectForm` · `CategoryForm`; `actions` (proje/kategori kaydet-sil-sırala)
- Route'lar `/projects` · `/projects/[slug]` · `/projects/category/[slug]`; `app/admin/projects` · `app/admin/project-categories`
- `src/modules/admin-shell/ContentTable` — içerik listeleri için ortak tablo
- `supabase/migrations/0018_project_categories_seed.sql` · `supabase/tests/projects.test.ts` (3)
- `globals.css` — `.chips` · `.chip` · `.facts`; mesajlar `Projects`, `Admin.projects`, `Admin.projectCategories`; `e2e/projects.spec.ts`

### Eklendi — Faz 7 · Hizmetler
- `src/modules/services` — site: `ServicesList` · `ServiceDetail` · `ServicesSection` · `ServiceCard` · `ServiceIcon`; admin: `ServicesTable` · `ServiceForm`; `actions` (`saveService` · `deleteService` · `moveService`); `domain/processSteps` (3 test)
- Route'lar `/services` · `/services/[slug]` (TR `/hizmetler/…`); `app/admin/services` (liste · new · [id]); `ADMIN_NAV` › services
- `src/core/seo` — `JsonLd` · `breadcrumbList` · `absoluteUrl` · `organizationId`
- `supabase/migrations/0017_services.sql` — `get_service_by_slug` · `reorder_content` · başlangıç hizmetleri (**K-55**); `supabase/tests/services.test.ts` (5)
- Footer: yayındaki hizmetler "Hizmetler" sütununa otomatik eklenir; ana sayfaya `ServicesSection`
- `globals.css` — `.card-grid` · `.card` · `.page-head` · `.steps` · `.gallery-grid` · `.faq-item` · `.cta-band` · `.section-dark`
- Mesajlar: `Services`, `Admin.services`; `e2e/services.spec.ts`

### Değiştirildi — Faz 7
- `supabase/tests/conventions.test.ts` — `services` boş-başlar listesinden çıkarıldı (K-55); `slug.test.ts` sıralama testi başlangıç satırlarına göreli
- `src/types/database.ts` yeniden üretildi (0017 RPC'leri)

### Eklendi — Faz 6 · Ana sayfa (hero + hakkımızda) ve ortak içerik altyapısı
- `src/modules/home` — `HeroSection` · `HeroVideo` (scroll-scrub masaüstü / loop mobil / poster; reduced-motion ve saveData'da poster) · `HeroOverlay` · `AboutSection`; admin `HeroForm` · `AboutForm`; `/admin/pages/home`; `domain/stats` (3 test)
- `src/core/content` — yayın yardımcıları (`isVisibleIn`, `alternatesFromRow`, `publishedSlugs`, `publishColumns`, `slugMap`, `dbErrorKey`); `src/lib/localized.localized()`
- `src/modules/admin-shell` — `LocalizedField` · `MediaSelect` · `PublishFields` · `FormSection` · `ActionMessage` · `StatusBadge` · `AdminPageHeader`
- `src/lib/markdown.ts` — **K-53** güvenli Markdown → HTML
- `globals.css` — hero sahnesi, kademe motifi, `body:has(.hero)` header sabitleme, `.prose-site`, `.stat-grid`, `.about-figure`
- `supabase/migrations/0016_home_seed.sql` + `supabase/tests/home-seed.test.ts`
- `.claude/skills/ui-ux-pro-max` + `.claude/skills/frontend-design` — **K-54** tasarım rehberleri ve CLK tasarım sistemi MASTER dosyası
- `e2e/home.spec.ts` · Mesajlar: `Admin.form`, `Admin.pages`, `Admin.nav.home`

### Değiştirildi — Faz 6
- Ana sayfa artık `getPublicSettings` ile site adı/meta açıklama alır; bölümler `ModuleBoundary` içinde
- `.claude/launch.json` `autoPort: true`

### Eklendi — Faz 5 · Auth + Admin çatısı
- `src/core/auth/` — `getCurrentUser` · `requireRole` · `safeReturnUrl` · roller; `src/core/db/createServerClient.ts` (server-only) · `createBrowserClient.ts`
- Middleware giriş kapısı (`/admin`, `/tr/hesabim`, `/en/account`) — yalnız deneyim, K-14
- `src/modules/auth` — Server Action'lar (giriş/kayıt/şifre/profil/çıkış), `AuthForm`, `AccountMenu`; sayfalar `login · register · forgot-password · reset-password · account`; `app/auth/callback` PKCE
- `src/app/admin` — layout (kapı + 403), dashboard, `menus`, `settings`, `settings/whatsapp`, `pages/errors`, `media`, `users`; `src/modules/admin-shell` (çatı + kayıt listesi)
- Modül admin katmanları: navigation · site-settings · whatsapp · static-pages · **media** (yeni) · **users** (yeni); her modülde `server.ts` (sunucu API'si)
- shadcn/ui (`src/components/ui`, yalnız admin) — değişkenler `theme.admin.css` içinde `[data-surface='admin']` altında; sitenin tokenlarına sızmaz
- `0015_admin_helpers.sql` — `reorder_menu_items(uuid[])` · `admin_dashboard_counts()` (invoker, RLS)
- `scripts/create-e2e-user.mjs` · `e2e/admin.spec.ts` · Playwright `.env.local` E2E_* yükleyicisi
- Mesajlar: `Auth`, `Admin` ad alanları (TR/EN)
- **K-51** — davet service-role'süz (OTP bağlantısı); modül API'si `index.ts` + `server.ts` + `actions.ts`
- **K-52** — tarayıcıda Supabase istemcisi yok; `app/api/me` oturum özeti; giriş tam sayfa yönlendirmeyle
- `src/instrumentation.ts` — `onRequestError`: üretimde gizlenen sunucu hatalarının yığını tek noktadan loglanır (Katman 6)

### Düzeltildi — Faz 5
- `scripts/scan-static-data.mjs` shadcn üretimi bileşenleri (`components/ui/`) atlar


### Eklendi — Faz 4 · Tasarım sistemi · Header · Footer · Hata sayfaları · WhatsApp
- Tipografi: `src/ui/fonts.ts` — Syne / IBM Plex Sans / IBM Plex Mono, `next/font` self-host, `latin-ext`; akışkan ölçek ve tam semantik token seti (`tokens.primitive.css`, `theme.site.css`)
- `src/ui`: `Button` · `Container` · `SectionHeading` · `BrandMark` · `MenuSuggestions`; `globals.css` bileşen katmanı (header ızgarası, çekmece, footer, WhatsApp, çizgi animasyonu)
- `src/core/cache` (`cached`, `CACHE_TAGS`) · `src/core/db/createPublicClient.ts` · `src/lib/localized.ts` (`pickLocale`)
- `src/modules/navigation` — `Header`, `Footer`, `getMenu`; menü ağacı saf fonksiyonla kurulur, route'u olmayan iç bağlantı düşer (**K-50**)
- `src/modules/site-settings` — herkese açık ayarlar tipli ve varsayılanlı
- `src/modules/whatsapp` — yüzen WhatsApp (kapalıyken render yok)
- `src/modules/static-pages` — `ErrorPage` + `getErrorPage`; 404 (marketing ve dilli kök) ve 500 sayfaları yeniden yazıldı
- `supabase/migrations/0014_navigation_seed.sql` — menü yapısı + `menu_items` sıralama kapsamı düzeltmesi
- Testler: `buildMenuTree` (4) · `parseSettings` (2) · `navigation-seed` (3 DB) · `e2e/chrome.spec.ts` (5)
- Dokümanlar: K-50, 01-DESIGN-SYSTEM kontrast ölçümü, 01-PUBLIC-PAGES header ızgarası

### Düzeltildi — Faz 4
- `menu_items_sort_order_uq` yalnız `parent_id` ile kapsamlıydı: farklı menülerin kök öğeleri çakışıyordu (0014 düzeltir, PGlite testi yakaladı)


### Eklendi — Faz 3 · Medya migrasyonu
- `supabase/migrations/0013_storage_buckets.sql` — `media` (public, 50 MB, görsel/video/pdf) ve `private-documents` (staff) bucket'ları + `storage.objects` RLS politikaları; `storage` şeması yoksa (PGlite) kendini atlar
- `scripts/media-migrate.mjs` (`npm run media:migrate`) — `assets/` → WebP varyantları (480/960/1440 + ≤1920 tam boy + blur yer tutucu) → Storage → `media_library` upsert; `--dry-run` ve `--only <klasör>` seçenekleri; manifest `supabase/.temp/media-manifest.json`
- `scripts/lib/media-pipeline.mjs` — saf parçalar (slug yolları, varyant planı, hash → uuid, mp4 üst verisi) · 5 test (`scripts/__tests__`)
- `scripts/generate-media-report.mjs` (`npm run media:report`) — anonim anahtarla `media_library` galerisi (HTML)
- `src/core/storage/` — `publicStorageUrl` · `mediaSrcSet` · `mediaAlt` · `MediaAsset` tipi (K-02 soyutlaması) · 3 test
- Yükleme: 3 deneme + geri çekilme · `--skip-existing` (kesilen koşuyu tamamlar) · manifest önceki koşuyla birleştirilir
- 166 dosya `clk-yapi-group` projesine yüklendi; Storage politikaları anonim anahtarla doğrulandı
- devDependency: `sharp`
- **K-49** — medya boru hattı kararı (`docs/02-DECISIONS.md`)


### Eklendi — Faz 2 · Veritabanı
- **K-47 Docker'sız akış:** migration'lar elle yazılır, PGlite (süreç içi Postgres) üzerinde Vitest ile test edilir, sonra uzak projeye `db push` edilir
- `supabase/migrations/0001–0012` — 83 tablo + 4 görünüm, 171 RLS politikası, tamamı uzantısız
- `app_private` şeması: rol yardımcıları (`has_role`, `user_role`), sözleşme prosedürleri (K-48), denetim ve slug geçmişi tetikleyicileri, belge numarası sayacı
- Finans: `sales_without_cost` / `sale_items_without_cost` görünümleri + `guard_sales_write` tetikleyicisi (K-33) · satış ve fatura tutarları `CHECK` ile kilitli (K-31, K-32)
- `get_project_by_slug` (RPC şablonu) · `resolve_old_slug` (308) · `get_configuration_by_token` (anonim erişim tabloya değil RPC'ye) · `mark_notifications_read`
- `supabase/tests/` — 108 test: migration zinciri, şema sözleşmeleri, rol rol RLS, slug kuralları, indeks planı
- `scripts/generate-schema-report.mjs` (`npm run db:report`) — katalogdan üretilen şema gezgini
- `scripts/create-super-admin.mjs` — ilk yönetici; davet e-postasıyla, şifre betikten geçmeden
- npm: `test:db` · `db:push` · `db:status` · `db:types` · `db:report`
- `scripts/db-push.mjs` — `db push` sarmalayıcısı: bağlı proje izin listesinde değilse reddeder (migration'ların yanlışlıkla başka bir projeye uygulanması olayından sonra eklendi)
- `src/types/database.ts` — uzak şemadan üretilen tipler (83 tablo + 4 görünüm)

### Düzeltildi — Faz 2
- Slug doğrulayıcıları `coalesce(…, false)` ile sarıldı: `CHECK` kısıtı `NULL`'ı geçer saydığı için TR anahtarı olmayan slug kabul ediliyordu (davranış testi yakaladı)

### Eklendi — Faz 1 · İskelet + i18n
- **Varsayım deneyleri** (`experiments/faz-01/`, sonuçlar `docs/architecture/06-ASSUMPTION-EXPERIMENTS.md`): 4'ü doğrulandı, #1 kısmen — rewrite edilen yolda on-demand ISR önbelleğe yazmıyor → **K-46**
- Uygulama iskeleti: Next.js 15.5.25 · React 19.1 · TypeScript strict (`noUncheckedIndexedAccess`) · Tailwind v4
- `src/i18n/` — routing (tipli pathnames), navigation, request, `RouteAlternates` bağlamı, `buildAlternates` (canonical + hreflang; çevrilmemiş dil yazılmaz)
- `src/middleware.ts` + `src/core/middleware/compose.ts` — K-13 kompozisyonu: Supabase önce, çerezler en sonda; `Set-Cookie` taşıyan yanıt `private, no-store`
- `src/core/auth/` — `refreshSession` (asla fırlatmaz, 5 sn zaman aşımı, anonimde ağ turu yok) · `hasAuthCookie` (parçalanmış `.0 .1 .2` çerezleri tanır)
- `src/core/errors/` — `Result<T,E>` · `ModuleBoundary` · `src/core/observability/logger`
- `src/lib/slugify.ts` — `toLowerCase()`'sız Türkçe slug üretimi, DB `CHECK` deseniyle aynı doğrulayıcı
- `src/ui/LanguageSwitcher.tsx` — sorgu + hash korur, `useTransition` bekleme durumu, JS'siz çalışır
- Hata sayfaları: kök 404 (dilsiz) · dilli 404 · `(marketing)/[...rest]` yakalayıcı · `error.tsx` · `global-error.tsx`
- `src/styles/` — `@layer` sırası, primitive tokenlar, `[data-surface="site"|"admin"]` semantik tokenlar
- ESLint: `eslint-plugin-boundaries` ile modül sınırları · `toLowerCase()` yasağı (K-16) · `@supabase/*` yalnız `core/db` + `modules/*/data`
- `scripts/scan-static-data.mjs` — "sıfır statik veri" taraması (`// static-ok:` ile gerekçeli istisna)
- Testler: Vitest 36 birim · Playwright 51 E2E (mobil/tablet/masaüstü + axe WCAG 2.1 AA + klavye)
- CI (`.github/workflows/ci.yml`): kalite · e2e · Lighthouse CI
- Yayın öncesi koruma: `SITE_INDEXABLE=true` + Vercel production olmadıkça `X-Robots-Tag: noindex` ve `robots.txt: Disallow: /`

### Eklendi — Faz 0
- Proje iskeleti: `git init`, `.gitignore`, `.env.example`
- `README.md` — proje tanıtımı ve hızlı başlangıç
- `CLAUDE.md` — AI oturumları için bağlayıcı kural özeti
- `docs/` dokümantasyon yapısı (27 dosya):
  - `00-START-HERE.md` — role göre okuma sırası
  - `01-PROJECT-OVERVIEW.md` — kapsam ve terim sözlüğü
  - `02-DECISIONS.md` — **44 karar, gerekçeleriyle**
  - `architecture/` — modüler yapı, routing/i18n, hata izolasyonu, performans, kod standardı
  - `database/` — şema, RLS, migration akışı
  - `design/` — tasarım sistemi, stil izolasyonu, responsive/animasyon
  - `modules/` — ön yüz, admin, ürün kataloğu, konfigüratör, satış/finans, analitik, mail
  - `processes/` — çeviri, SEO/AI görünürlük, güvenlik/KVKK, test, ortamlar
  - `CONTRIBUTING.md` · `ROADMAP.md` · `CHANGELOG.md`

### Değiştirildi
- Proje kök klasörü `Demir Yapı` → `clk-yapi-group`
- Prototipler `_archive/prototypes/` altına taşındı ve İngilizce adlarla yeniden adlandırıldı:
  - `anasayfa-test-celik-kentsel-donusum_v3.html` → `homepage-v3-clk-rebrand.html`
  - `konfigurator_v4.html` → `configurator-v4.html`
  - `konfigurator_v3 (1).html` → `configurator-v3-copy.html`
- Rakip fiyat tablosu referansı `_archive/reference/competitor-price-table.jpg` altına alındı

### Altyapı
- GitHub deposu bağlandı: `davutakbulut/DVT-clk-yapi-group`
- 7 milestone (v0.5 → v2.0), 6 etiket, **33 issue** oluşturuldu
- Project board #5 — "CLK Yapı Group — Yol Haritası", tüm issue'lar eklendi
- Her issue'da 12 maddelik Bitti Tanımı kontrol listesi

### Notlar
- Planlama aşamasında alınan 44 karar `docs/02-DECISIONS.md` içinde gerekçeleriyle kayıtlı
- 7 karar MSSQL geçişinde etkilenecek şekilde 🔴 işaretlendi
- Kontrast denetimi: marka turkuazı (#5C7FA3) kağıt zemin üzerinde **3.87:1** — gövde metninde kullanılamaz, koyu varyant üretilecek
