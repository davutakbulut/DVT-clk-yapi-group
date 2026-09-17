# Veritabanı Şeması

83 tablo + 4 görünüm, tamamı RLS korumalı. Gerçek DDL `supabase/migrations/` altındadır; bu doküman **yapıyı ve sözleşmeleri** anlatır.

> **Canlı görünüm:** `npm run db:report` → `supabase/.temp/schema-report.html`. Migration'ları boş bir Postgres'e uygulayıp **katalogdan** üretir: her tablo, kolon, politika, kısıt, indeks ve rol bazlı yetki matrisi. Elle yazılmadığı için şemadan ayrışamaz.

## Sözleşme Prosedürleri

80 tabloda aynı DDL'i elle tekrarlamak yerine sözleşmeler `app_private` şemasındaki prosedürlerle uygulanır. Migration'da tek satır; böylece bir tabloda `with check` ya da slug indeksi **unutulamaz**.

| Çağrı | Ne ekler |
|---|---|
| `secure(t)` | RLS açar · platformun varsayılan yetkilerini **geri alır** (yetkiler açıkça verilir) |
| `allow_public_read(t, koşul)` | `anon`+`authenticated`'a `select` yetkisi + politika |
| `allow_staff_read(t, roller…)` / `allow_staff_write(t, roller…)` | Rol bazlı politika — yazmada `using` **ve** `with check` |
| `content_policies(t)` | Yayındaki → herkes · taslak → içerik ekibi + viewer · yazma → içerik ekibi |
| `publishable(t, başlık_kolonu)` | `status` · `published_locales` · `published_at` · `translation_meta` + K-07/K-08 kısıtı |
| `localized_slug(t, tip)` | Biçim `CHECK`'i · TR/EN kısmi unique ifade indeksi · `slug_history` tetikleyicisi |
| `seo_columns(t)` · `sortable(t, kapsam)` · `track_updated_at(t)` · `audited(t)` | İlgili kolon/tetikleyiciler |

`app_private` API'ye **açılmaz** (`config.toml › [api].schemas` içinde yok). `security definer` fonksiyonlar bu yüzden burada durur; `public`'te dursalardı `/rest/v1/rpc` ile çağrılabilirlerdi.

### ⚠️ `CHECK` kısıtı `NULL`'ı geçer sayar

`CHECK` yalnız sonuç `FALSE` ise reddeder. `slug->>'tr'` anahtarı yoksa `NULL ~ 'regex'` → `NULL` → kısıt **sessizce onaylar** (kolon `NOT NULL` olsa bile JSONB'nin *içi* korunmaz). Doğrulayıcı fonksiyonların hepsi bu yüzden `coalesce(…, false)` ile sarılıdır. Bu hatayı yapısal test değil, kötü veriyi gerçekten eklemeye çalışan davranış testi yakaladı.

## Ortak Sözleşmeler

### Her tabloda

```sql
id          uuid primary key default gen_random_uuid()
created_at  timestamptz not null default now()
updated_at  timestamptz not null default now()   -- tetikleyici ile güncellenir
```

`updated_at` aynı zamanda **iyimser kilitleme** için kullanılır: iki editör aynı kaydı açarsa, ikincisi kaydederken "bu kayıt siz açtıktan sonra değişti" uyarısı alır. Sessiz veri kaybı önlenir.

### Çevrilebilir alanlar — JSONB

```sql
title  jsonb not null    -- {"tr": "Çelik Konstrüksiyon", "en": "Steel Construction"}
slug   jsonb not null    -- {"tr": "celik-konstruksiyon", "en": "steel-construction"}
```

**MSSQL karşılığı:** `NVARCHAR(MAX)` + `JSON_VALUE()` + hesaplanmış kalıcı kolon üzerinde unique indeks.

### Yayın durumu

```sql
status             text not null default 'draft'
                     check (status in ('draft','published','archived'))
published_locales  text[] not null default '{}'    -- {'tr'} veya {'tr','en'}
published_at       timestamptz
```

`status` = kayıt yayında mı · `published_locales` = **hangi dillerde** yayında.
Bir içerik Türkçe canlıyken İngilizce çevirisi hazırlanıyor olabilir. Çeviri onaylanmadan `en` bu diziye eklenmez ve İngilizce sitede 404 verir.

### SEO alanları (içerik tablolarında)

```sql
seo_title        jsonb
seo_description  jsonb
og_image_id      uuid references media_library(id)
canonical_url    text
noindex          boolean not null default false
focus_keyword    jsonb     -- SEO panelindeki benzersizlik kontrolü için
```

### Çeviri durumu

```sql
translation_meta jsonb    -- {"en": {"machine": true, "reviewed": false, "at": "..."}}
```

### Slug kısıtı

```sql
constraint <tablo>_slug_tr_format
  check (slug->>'tr' ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
```

Slug üretimindeki bir hatanın veritabanına sızmasına karşı son emniyet. Rezerve kelimeler ayrıca kontrol edilir: `kategori, category, etiket, tag, arama, search, sayfa, page, 403, api`.

### İndeks deseni

Her çevrilebilir slug için **locale başına kısmi unique B-tree ifade indeksi**:

```sql
create unique index <tablo>_slug_tr_uq on <tablo> ((slug->>'tr'))
  where slug->>'tr' is not null;
```

GIN değil — GIN benzersizlik uygulayamaz. Ayrıntı: [`../architecture/02-ROUTING-I18N.md`](../architecture/02-ROUTING-I18N.md)

---

## Tablo Grupları

### Kullanıcı & Sistem (11)

| Tablo | İçerik |
|---|---|
| `profiles` | `auth.users`'a bağlı: ad, telefon, avatar, **rol**, aktif mi, `must_change_password` |
| `menus` | Menü tanımları (`header`, `footer_primary`, `footer_legal`, `mobile_extra`, `account`) |
| `menu_items` | Hiyerarşik menü öğeleri — `header_slot` (left/right), `link_type`, `locales[]`, `visibility`, `is_cta` |
| `site_settings` | Anahtar/değer JSONB — logo, iletişim, sosyal medya, çalışma saatleri, modül bayrakları |
| `audit_logs` | Kim, ne zaman, neyi değiştirdi (eski/yeni değer JSONB) |
| `error_logs` | Yol, hata kodu, mesaj, stack, **modül etiketi**, kullanıcı, IP |
| `slug_history` | Eski slug → 308 yönlendirme kaynağı |
| `redirects` | Elle tanımlanan yönlendirmeler (410 Gone dahil) |
| `media_library` | Tüm görsel/video/belge kayıtları — `alt` JSONB (TR/EN), `variants` (WebP boyutları) |
| `content_revisions` | Editördeki revizyon geçmişi — her içerik tipi için ortak |
| `document_counters` | `TLP-2026-0118` · `SAT-2026-0042` — yıl başına, yarışa dayanıklı sayaç |

**Roller:** `super_admin` · `admin` · `editor` · `sales` · `viewer` · `member`

### İlişki (2)

| Tablo | İçerik |
|---|---|
| `service_projects` | Hizmet ↔ proje bağlantısı (çift yönlü sorgulanır, ters kayıt tutulmaz) |
| `content_links` | Küratörlü çapraz bağlantılar — `from_type/from_id → to_type/to_id` |

**Neden ters kayıt tutulmuyor:** Aynı ilişkiyi iki satırda saklamak eninde sonunda tutarsızlaşır. Tek satır, iki yönde sorgulanır.

### İçerik (16)

`hero_media` · `about_content` · `static_pages` (yasal + hata sayfası metinleri) · `services` · `service_images` · `solutions` · `price_guides` · `price_guide_rows` · `projects` · `project_images` · `project_categories` · `project_category_relations` · `blog_posts` · `blog_categories` · `blog_tags` · `blog_post_tags`

### Ürün Kataloğu (6)

| Tablo | Not |
|---|---|
| `products` | Ürün ana kaydı, ilgili hizmete FK |
| `product_categories` | Hiyerarşik (`parent_id`) |
| `product_images` | Sıralı galeri |
| `product_specs` | Teknik özellik satırları — ad, değer, birim, grup, sıra |
| `product_variants` | Ölçü tablosu — boyut, et kalınlığı, **`kg_per_m`**, stok kodu |
| `product_documents` | Teknik föy, sertifika, montaj kılavuzu (PDF) |

`product_variants.kg_per_m` konfigüratörün `steel_profiles` tablosuyla aynı mantıkta — ileride birleştirilebilir.

### Kurumsal (5)

`team_members` · `clients` (referans logoları) · `certificates` · `job_postings` · `job_applications`

`job_applications` **saklama süresi** taşır (varsayılan 12 ay) — KVKK gereği CV'ler süresiz tutulamaz, otomatik silme cron'u çalışır.

### Etkileşim (5)

| Tablo | Not |
|---|---|
| `testimonials` | Kaynak (`manual`/`google`), `external_id`, `is_verified`, hizmet/proje FK |
| `review_sync_runs` | Google Places senkron logu |
| `post_comments` | Moderasyonlu, tek seviye yanıt |
| `post_likes` | Ziyaretçi parmak izi ile tekilleştirilmiş |
| `notifications` | Kullanıcı **veya rol** hedefli |

### Talep (6)

`leads` · `lead_items` (teklif sepeti kalemleri) · `lead_notes` · `lead_replies` · `lead_attachments` · `newsletter_subscribers`

`leads` durum akışı: `new → in_review → quoted → won / lost`

### Satış & Finans (7)

| Tablo | Kritik alanlar |
|---|---|
| `customers` | Tip, ünvan, vergi dairesi, VKN/TCKN, adres, yetkili |
| `sales` | Ara toplam, iskonto, KDV, **`total_cost`**, **`gross_profit`**, **`margin_pct`**, para birimi + kur + ₺ karşılığı |
| `sale_items` | Miktar, birim, **`unit_price`**, **`unit_cost`** |
| `sale_expenses` | Kaleme bağlı olmayan giderler (nakliye, işçilik, taşeron) |
| `invoices` | Matrah, KDV, **`withholding_ratio`**, tahsil edilecek tutar |
| `payments` | Tahsilat kayıtları |
| `payment_schedules` | Hakediş planı — oran/tutar, vade, durum |

🔒 **Kalın yazılanlar maliyet/kâr alanlarıdır** — `sales` rolüne RLS seviyesinde kapalıdır.

### Konfigüratör (8)

`steel_profiles` · `material_prices` · `material_price_history` (tetikleyiciyle dolan fiyat geçmişi) · `panel_types` · `configurator_rules` · `configurations` · `configuration_versions` · `configuration_items`

`configurations` hem üye (`user_id`) hem anonim (`public_token`) sahipliği destekler.
`material_prices` **fiyatın tek kaynağıdır** — fiyat rehberi ve konfigüratör buradan okur.

### Servis (7)

`email_templates` · `email_queue` · `email_logs` · `whatsapp_settings` · `ui_translations` · `translation_glossary` · `cron_heartbeats` (canlılık denetimi) — `media_library` temelde, `faqs` içerik migration'ında

`faqs` **polimorfiktir**: `entity_type` + `entity_id` (boş = genel SSS sayfası). Böylece SSS bloğu hizmet, ürün, çözüm ve proje sayfalarında aynı şekilde çalışır.

`media_library.alt` **JSONB**'dir (TR/EN) — İngilizce sayfada Türkçe alt metni çıkmasın diye.

### Analitik (9)

`analytics_sessions` · `analytics_pageviews` · `analytics_events` · `heatmap_aggregates` · `scroll_depth_aggregates` · `form_analytics` · `funnels` · `funnel_steps` · `web_vitals`

**Veri hacmi stratejisi:** Ham olaylar 60 gün tutulur, `pg_cron` ile silinir. Gece toplu özet üretilir; sıcaklık haritası ekranı ham veriye değil özete bakar.

---

## İlişki Haritası (özet)

```
auth.users ──1:1── profiles ──┬── audit_logs
                              ├── notifications
                              └── configurations (user_id)

services ──┬── service_images
           ├── service_projects ──── projects ──┬── project_images
           ├── solutions                        └── project_category_relations
           ├── price_guides ──── price_guide_rows
           ├── products ──┬── product_images
           │              ├── product_specs
           │              ├── product_variants
           │              └── product_documents
           └── testimonials

leads ──┬── lead_items ──── products / product_variants
        ├── lead_notes · lead_replies · lead_attachments
        └── customers ──── sales ──┬── sale_items
                                   ├── sale_expenses
                                   ├── payment_schedules
                                   └── invoices ──── payments

configurations ──┬── configuration_versions
                 ├── configuration_items ──── steel_profiles ──── material_prices
                 └── leads (teklife dönüşüm)
```
