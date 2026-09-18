# Değişiklik Günlüğü

Bu projedeki tüm önemli değişiklikler burada kaydedilir.
Format [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/), sürümleme [SemVer](https://semver.org/lang/tr/).

---

## [Yayınlanmadı]

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
