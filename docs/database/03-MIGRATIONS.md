# Migration Akışı

## Temel Kural

> **Üretim veritabanına elle SQL çalıştırılmaz.**

Her şema değişikliği versiyonlu bir migration dosyası olarak geçer. Aksi hâlde şema ile kod birbirinden kopar ve hangi ortamda ne olduğu bilinemez hale gelir.

## Ortamlar

| Ortam | Veritabanı | Kullanım |
|---|---|---|
| **Yerel** | `supabase start` (Docker, izole) | Geliştirme, migration denemesi, seed |
| **Üretim** | Supabase bulut projesi | Canlı |

Ayrı bir staging projesi şimdilik yok. Vercel önizleme dağıtımları **üretim veritabanına** bağlanır — önizlemede yapılan bir silme işlemi canlı veriyi etkiler. Riskli fazlarda (2, 21–24 finans) ayrı staging projesi açılması önerilir.

## Akış

```
1. Yerelde değişiklik yap      supabase start · SQL çalıştır veya Studio'dan düzenle
2. Farkı dosyaya al            supabase db diff -f <sıra>_<konu>
3. Gözden geçir                üretilen SQL'i oku — beklenmeyen DROP var mı?
4. Yerelde sıfırdan dene       supabase db reset   (tüm migration'lar baştan çalışır)
5. Commit + PR                 supabase/migrations/0007_add_product_variants.sql
6. Merge sonrası               supabase db push    (üretime uygulanır)
```

**Adım 4 neden zorunlu:** `db diff` bazen sıralamayı yanlış üretir. `db reset` ile tüm zincir baştan çalışır; sırada bir sorun varsa orada patlar, üretimde değil.

## Dosya Adlandırma

```
supabase/migrations/
├─ 0001_initial_schema.sql
├─ 0002_rls_policies.sql
├─ 0003_seed_functions.sql
├─ 0004_content_tables.sql
└─ 0005_product_catalog.sql
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

İlk `super_admin` hesabı, menü yapısı, site ayarları, terim sözlüğü ve örnek içerik burada. `supabase db reset` sonrası otomatik çalışır.

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
