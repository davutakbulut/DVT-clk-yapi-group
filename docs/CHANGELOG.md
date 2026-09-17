# Değişiklik Günlüğü

Bu projedeki tüm önemli değişiklikler burada kaydedilir.
Format [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/), sürümleme [SemVer](https://semver.org/lang/tr/).

---

## [Yayınlanmadı]

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
