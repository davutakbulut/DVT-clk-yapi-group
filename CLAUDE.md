# CLK Yapı Group — AI Oturumları İçin Kural Özeti

> Bu dosya her oturumda okunur. Ayrıntı için `docs/` altına bakın; buradaki kurallar bağlayıcıdır.

## Proje

Çelik konstrüksiyon firması için çift dilli (TR/EN) kurumsal site + yönetim paneli.
Next.js 15 · TypeScript · Tailwind v4 · Supabase · Vercel · next-intl.

**Durum:** `docs/ROADMAP.md` — hangi fazdayız oradan bakın.
**Kararlar:** `docs/02-DECISIONS.md` — bir şeyin neden öyle olduğunu oradan öğrenin, tahmin etmeyin.

## Bağlayıcı Kurallar

### 1. Sıfır statik veri
Ön yüzde görünen hiçbir içerik koda gömülmez. Hizmet listesi, telefon, footer metni, hata sayfası yazısı — hepsi veritabanından gelir ve admin panelden düzenlenebilir.
❌ `const services = [...]` ❌ Lorem ipsum ❌ Sabit telefon/adres
✅ Örnek veri gerekiyorsa seed script'iyle veritabanına yazılır.
**Tek istisna:** arayüz mikro-metinleri (`next-intl` mesaj dosyaları), `ui_translations` tablosundan override edilebilir.

### 2. Modül sınırları
```
app → modules → core        ✅
core → modules              ❌
modules/a → modules/b/data  ❌ derin import yasak
modules/a → modules/b       ✅ yalnız index.ts (public API)
```
Route dosyaları ince: 20–30 satır, iş mantığı modülde. Supabase istemcisi yalnız `core/db` ve `modules/*/data` içinde.

### 3. Hata izolasyonu
Beklenen hatalar **fırlatılmaz, döndürülür**: `Result<T, E>`.
Her bölüm `<ModuleBoundary>` içinde. Verisi gelmeyen bölüm **sessizce render edilmez**, hata kutusu göstermez, sayfayı çökertmez.

### 4. Yetkilendirme üç katman
Middleware (yalnız deneyim) → sunucu bileşeni rol kontrolü (kapı) → **RLS (gerçek sınır)**.
Servis katmanında yetki kontrolü **açık ve eksiksiz** yazılır — ileride MSSQL'e geçişte RLS kaybolacak.
Service-role anahtarı istekle erişilebilen hiçbir yerde kullanılmaz.

### 5. Adlandırma
```
KOD VE YAPI → İngilizce · ASCII · Türkçe karakter YOK
İÇERİK      → Türkçe (veritabanında ve doküman gövdelerinde)
GENEL URL   → Türkçe (next-intl pathnames ile; klasör adı İngilizce kalır)
ADMIN URL   → İngilizce (/admin/products → "Ürünler" başlıklı sayfa)
```
Bileşen `PascalCase.tsx` · yardımcı `camelCase.ts` · klasör `kebab-case` · doküman `UPPER-KEBAB.md`

### 6. Türkçe slug tuzağı
`toLowerCase()` **asla** kullanılmaz — `'I'→'ı'`, `'İ'→i+birleşen nokta`.
Açık harf çevrim tablosu (ç→c ğ→g ı→i İ→i ö→o ş→s ü→u) → ASCII süzme → `CHECK` kısıtı.

### 7. Çeviri
İçerik JSONB: `{"tr": "...", "en": "..."}`. Çeviri **makine taslağı + zorunlu insan onayı**.
`published_locales`'e `en` eklenmeden İngilizce sitede görünmez (404 verir).
Slug otomatik çevrilmez. Yasal metinlerde otomatik çeviri kapalı.

### 8. Her faz dikey dilim
Bir özelliğin ön yüzü ve admin karşılığı **aynı fazda** biter. `main` her zaman dağıtılabilir.

## Bitti Tanımı (her faz sonunda)

```
□ build · lint · typecheck temiz
□ Ön yüz ↔ admin karşılık matrisi işaretlendi
□ Statik veri taraması temiz
□ 3 kırılımda gözle kontrol + ekran görüntüsü paylaşıldı
□ Klavyeyle tam gezilebiliyor, odak halkası görünür
□ axe hatası yok
□ RLS yetkisiz rolle test edildi
□ Kritik akış için E2E testi yazıldı
□ Yeni sayfaya en az bir iç bağlantı veriliyor (öksüz sayfa yok)
□ Lighthouse eşik üstünde
□ docs/ROADMAP.md + docs/CHANGELOG.md güncellendi
□ Commit + push + Project board kartı taşındı
```

## Asla Yapılmayacaklar

- Uydurma fiyat, sahte müşteri yorumu, olmayan sertifika, hayalî proje bilgisi yazmak
- `.env.local` veya gerçek anahtarları commit etmek
- Üretim veritabanına elle SQL çalıştırmak (her değişiklik migration dosyası)
- Mobilde ScrollTrigger `pin` kullanmak (adres çubuğu yüksekliği değişir)
- `100vh` kullanmak (`100dvh` kullanılır)
- Three.js'i konfigüratör dışında bir sayfaya dahil etmek (~600 KB)
