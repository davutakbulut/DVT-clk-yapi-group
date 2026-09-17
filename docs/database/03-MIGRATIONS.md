# Migration Akışı

## Temel Kural

> **Üretim veritabanına elle SQL çalıştırılmaz.**

Her şema değişikliği versiyonlu bir migration dosyası olarak geçer. Aksi hâlde şema ile kod birbirinden kopar ve hangi ortamda ne olduğu bilinemez hale gelir.

## Ortamlar — Docker'sız (K-47)

| Ortam | Veritabanı | Kullanım |
|---|---|---|
| **Test** | **PGlite** — süreç içi gerçek Postgres (WASM), Vitest içinde | Migration zinciri · RLS · kısıtlar · indeks planı. ~4 sn, internetsiz, gizli anahtarsız |
| **Uzak** | Supabase projesi `clk-yapi-group` | Yayına (Faz 12) kadar geliştirme ortamı; içinde canlı veri yok. Yayından önce ayrı bir geliştirme projesi açılır |

`supabase start` (Docker) **kullanılmıyor.** Yerini iki şey aldı: hızlı geri bildirim için PGlite testleri, gerçek platform davranışı için ayrı bir geliştirme projesi. Docker gerektiren CLI komutları (`start`, yerel `db reset`, `db diff`, `db pull`, `test db`) akışta yok; gerektirmeyenler (`login`, `link`, `db push`, `migration list`, `gen types --linked`) var.

## Akış

```
1. Migration'ı ELLE yaz          supabase/migrations/00NN_<konu>.sql   (tablo + RLS aynı dosyada)
2. Testini yaz                   supabase/tests/*.test.ts
3. Sıfırdan uygula + test et     npm run test:db        ← `db reset`in karşılığı: her test dosyası boş DB'den başlar
4. Gözle bak                     npm run db:report      → supabase/.temp/schema-report.html
5. Commit + PR                   CI aynı testleri koşar
6. Uzak projeye uygula           npm run db:push        (önce bağlı projenin ADINI doğrular — yanlış projeye gitmez)
```

**`db diff` neden yok:** Migration'lar elle yazılıyor — üretilen SQL'de "beklenmeyen DROP var mı" diye bakmaya gerek kalmıyor, çünkü her satırı biz yazdık.

**Adım 3 neden yeterli:** Her test dosyası **boş** bir veritabanına tüm zinciri baştan uygular. Sıralama hatası (FK'nin tablodan önce gelmesi gibi) orada patlar, üretimde değil.

**PGlite'ın sınırı:** Supabase'in `auth` şeması, rolleri ve varsayılan yetkileri `supabase/tests/helpers/supabase-shim.sql` ile taklit edilir. Şim, platformun **en gevşek** hâlini kurar (her tablo API rollerine tam yetkili) — testler böylece "RLS tek başına tutuyor mu"yu ölçer. Uzantı yoktur (`pg_cron` dahil); şema bu yüzden uzantısızdır ve zamanlama varlık kontrolüyle korunur. Auth akışları, Storage politikaları ve Realtime **yalnız geliştirme projesinde** doğrulanabilir.

## Dosya Adlandırma

```
supabase/migrations/
├─ 0001_foundation.sql          yardımcı şema · profiller · sözleşme prosedürleri · sistem tabloları
├─ 0002_content.sql             içerik + ilişki + SSS
├─ 0003_product_catalog.sql
├─ …
├─ 0011_slug_resolution.sql     RPC şablonu · slug geçmişi → 308 · bakım zamanlaması
└─ 0012_reference_data.sql      yapısal kayıtlar (menüler, ayar anahtarları, hata sayfası metinleri, sözlük)
```

Sıra numarası + konu. Tarih damgası kullanılmaz — dal birleştirmelerinde çakışma yaratır.

## Geri Alma

Supabase migration'ları ileri yönlüdür. Geri alma gerekiyorsa **yeni bir migration** yazılır:

```sql
-- 0008_revert_product_variant_unit.sql
alter table product_variants drop column unit_label;
```

Migration dosyası **asla düzenlenmez veya silinmez** — uygulanmış bir migration'ı değiştirmek, yerel ile üretim arasında sessiz uyuşmazlık yaratır.

## RLS Politikaları

Tablo oluşturan her migration, **aynı dosyada** RLS politikasını da yazar:

```sql
alter table products enable row level security;

create policy "public read published" on products
  for select to anon
  using (status = 'published');

create policy "editors manage" on products
  for all to authenticated
  using (exists (select 1 from profiles p
                 where p.id = auth.uid() and p.role in ('super_admin','admin','editor')))
  with check (…aynı…);
```

**Politikasız tablo erişilemez** — RLS açık ve varsayılan reddet. Politika yazmayı unutmak "herkes erişebilir" değil "kimse erişemez" sonucu verir; hata güvenli yönde.

## Seed

```
supabase/seed.sql
```

`supabase db push` **seed.sql'i çalıştırmaz.** Bu yüzden üretimde de gereken yapısal kayıtlar (menü kapsayıcıları, ayar anahtarları, hata sayfası metinleri, terim sözlüğü) `0012_reference_data.sql` **migration**'ındadır — tekrar çalışsa zarar vermez ve panelden yapılan düzenlemeyi ezmez. `seed.sql` yalnız geliştirme verisi içindir.

İlk `super_admin`: `node --env-file=.env.local scripts/create-super-admin.mjs <e-posta> "Ad Soyad"` — davet e-postası gider, şifreyi kişi kendi belirler; şifre hiçbir betikten geçmez.

**Seed'de gerçek olmayan veri yoktur:** uydurma fiyat, sahte müşteri yorumu, hayalî proje bilgisi seed'e girmez. Bu tablolar boş başlar.

## MSSQL Geçişine Hazırlık

Şema dokümanı her tablo için hem Postgres hem MSSQL tip karşılığını taşır. Postgres'e özgü yapıların karşılıkları:

| Postgres | MSSQL |
|---|---|
| `jsonb` | `NVARCHAR(MAX)` + `JSON_VALUE()` |
| `((slug->>'tr'))` ifade indeksi | Hesaplanmış kalıcı kolon + unique indeks |
| `text[]` | Ayrı ilişki tablosu veya JSON dizi |
| `gen_random_uuid()` | `NEWSEQUENTIALID()` |
| `timestamptz` | `DATETIMEOFFSET` |
| RLS + `auth.uid()` | Servis katmanı yetkisi (RLS güvenilemez) |
| `pg_cron` | SQL Server Agent |
