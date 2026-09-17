# Buradan Başlayın

Bu dosya, projeye yeni katılan bir geliştirici veya yapay zeka oturumunun **hangi sırayla ne okuyacağını** söyler. Her şeyi okumanıza gerek yok — yapacağınız işe göre gidin.

## Önce Herkes (15 dakika)

1. [`../README.md`](../README.md) — proje ne, nasıl çalıştırılır
2. [`../CLAUDE.md`](../CLAUDE.md) — **bağlayıcı kurallar**, atlamayın
3. [`01-PROJECT-OVERVIEW.md`](01-PROJECT-OVERVIEW.md) — kapsam ve terim sözlüğü
4. [`ROADMAP.md`](ROADMAP.md) — şu an hangi fazdayız

## Sonra: İşinize Göre

### Ön yüz geliştireceksiniz
```
design/01-DESIGN-SYSTEM.md        renk, tipografi, hiyerarşi
design/03-RESPONSIVE-ANIMATION.md kırılımlar, GSAP matchMedia kuralları
modules/01-PUBLIC-PAGES.md        sayfa sayfa spesifikasyon
architecture/02-ROUTING-I18N.md   route ağacı, slug, dil değiştirici
```

### Admin paneli geliştireceksiniz
```
modules/02-ADMIN-PANEL.md         ekran ekran spec + karşılık matrisi
design/02-STYLE-ISOLATION.md      admin stilleri ön yüzden neden ayrı
database/02-RLS-PERMISSIONS.md    rol matrisi, neyi kim görür
```

### Veritabanına dokunacaksınız
```
database/01-SCHEMA.md             tablolar, ilişkiler, indeksler
database/02-RLS-PERMISSIONS.md    politikalar
database/03-MIGRATIONS.md         migration akışı — ELLE SQL YASAK
02-DECISIONS.md                   şema neden böyle
```

### Yeni modül ekleyeceksiniz
```
architecture/01-OVERVIEW.md       modül yapısı, bağımlılık kuralları
architecture/05-CODE-STANDARDS.md fonksiyon yazım standardı
architecture/03-ERROR-ISOLATION.md boundary ve Result tipi
CONTRIBUTING.md                   dal, commit, PR akışı
```

### Bir hatayı araştırıyorsunuz
```
architecture/03-ERROR-ISOLATION.md hata nasıl yakalanır, nereye loglanır
architecture/04-PERFORMANCE.md     önbellek davranışı
processes/04-TESTING-QA.md         test katmanları
```

### SEO veya içerik işi
```
processes/02-SEO-AI-VISIBILITY.md  schema, sitemap, indeksleme, AI görünürlük
processes/01-TRANSLATION.md        TR→EN akışı, terim sözlüğü
modules/01-PUBLIC-PAGES.md         hangi sayfa hangi şemayı taşır
```

## En Sık Yapılan Hatalar

| Hata | Nerede yazıyor |
|---|---|
| Koda içerik dizisi gömmek | `CLAUDE.md` §1 |
| Başka modülün iç dosyasını import etmek | `architecture/01-OVERVIEW.md` |
| `toLowerCase()` ile Türkçe slug üretmek | `CLAUDE.md` §6 |
| Mobilde ScrollTrigger `pin` kullanmak | `design/03-RESPONSIVE-ANIMATION.md` |
| Yetkiyi yalnız RLS'e bırakmak | `database/02-RLS-PERMISSIONS.md` |
| Üretim veritabanına elle SQL çalıştırmak | `database/03-MIGRATIONS.md` |

## Bir Şey Neden Böyle?

Cevap büyük ihtimalle [`02-DECISIONS.md`](02-DECISIONS.md) içinde. 40+ karar gerekçesiyle kayıtlı. **Bir kararı değiştirmeden önce oradaki gerekçeyi okuyun** — çoğu, farkında olmadığınız bir sorunu çözmek için alındı.
