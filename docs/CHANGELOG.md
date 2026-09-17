# Değişiklik Günlüğü

Bu projedeki tüm önemli değişiklikler burada kaydedilir.
Format [Keep a Changelog](https://keepachangelog.com/tr/1.1.0/), sürümleme [SemVer](https://semver.org/lang/tr/).

---

## [Yayınlanmadı]

### Eklendi
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
