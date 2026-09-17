-- 0002 · İçerik (16) + ilişki (2) + polimorfik SSS
-- Her tablo aynı dosyada RLS'ini alır (docs/database/03-MIGRATIONS.md).

-- ── Ana sayfa: scroll video hero
create table public.hero_media (
  id                uuid primary key default gen_random_uuid(),
  label             text not null,                 -- panelde ayırt etmek için; ön yüzde görünmez
  desktop_video_id  uuid references public.media_library(id) on delete set null,
  mobile_video_id   uuid references public.media_library(id) on delete set null,
  desktop_poster_id uuid references public.media_library(id) on delete set null,
  mobile_poster_id  uuid references public.media_library(id) on delete set null,
  duration_seconds  numeric(5,2) check (duration_seconds > 0),
  headline          jsonb not null default '{}',
  subheadline       jsonb not null default '{}',
  cta_label         jsonb not null default '{}',
  cta_path          text,
  is_active         boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index hero_media_single_active_uq on public.hero_media (is_active) where is_active;
call app_private.track_updated_at('public.hero_media');
call app_private.secure('public.hero_media');
call app_private.allow_public_read('public.hero_media', 'is_active');
call app_private.allow_staff_read('public.hero_media', 'super_admin', 'admin', 'editor', 'viewer');
call app_private.allow_staff_write('public.hero_media', 'super_admin', 'admin', 'editor');

-- ── Hakkımızda (tekil kayıt) + istatistikler
create table public.about_content (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique default 'main',
  eyebrow    jsonb not null default '{}',
  title      jsonb not null default '{}',
  body       jsonb not null default '{}',
  image_id   uuid references public.media_library(id) on delete set null,
  -- [{"value": 120, "suffix": "+", "label": {"tr": "...", "en": "..."}}] — değerler admin'den girilir, seed'de BOŞ
  stats      jsonb not null default '[]' check (jsonb_typeof(stats) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
call app_private.publishable('public.about_content', 'title', false);
call app_private.seo_columns('public.about_content');
call app_private.track_updated_at('public.about_content');
call app_private.content_policies('public.about_content');

-- ── Yasal sayfalar + hata sayfası metinleri
create table public.static_pages (
  id         uuid primary key default gen_random_uuid(),
  page_key   text not null unique check (page_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind       text not null check (kind in ('legal','error','system','generic')),
  slug       jsonb,                                  -- hata/sistem sayfalarının slug'ı olmaz
  title      jsonb not null,
  body       jsonb not null default '{}',
  extra      jsonb not null default '{}',
  -- Kural 7: yasal metinlerde otomatik çeviri KAPALI
  auto_translate_disabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'legal' or auto_translate_disabled),
  check ((kind in ('legal','generic')) = (slug is not null))
);
call app_private.localized_slug('public.static_pages', 'static_page');
call app_private.publishable('public.static_pages');
call app_private.seo_columns('public.static_pages');
call app_private.track_updated_at('public.static_pages');
call app_private.content_policies('public.static_pages');

-- ── Hizmetler — "Nasıl uyguluyoruz?" (K-25)
create table public.services (
  id             uuid primary key default gen_random_uuid(),
  slug           jsonb not null,
  title          jsonb not null,
  excerpt        jsonb not null default '{}',
  body           jsonb not null default '{}',
  process_steps  jsonb not null default '[]' check (jsonb_typeof(process_steps) = 'array'),
  icon           text,
  cover_image_id uuid references public.media_library(id) on delete set null,
  is_featured    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
call app_private.localized_slug('public.services', 'service');
call app_private.publishable('public.services');
call app_private.seo_columns('public.services');
call app_private.sortable('public.services');
call app_private.track_updated_at('public.services');
call app_private.content_policies('public.services');

create table public.service_images (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  media_id   uuid not null references public.media_library(id) on delete cascade,
  alt        jsonb not null default '{}',
  caption    jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
call app_private.sortable('public.service_images', 'service_id');
call app_private.track_updated_at('public.service_images');
call app_private.secure('public.service_images');
-- Galeri satırının görünürlüğü ebeveynine bağlı: taslak hizmetin görselleri sızmaz.
call app_private.allow_public_read('public.service_images', $c$exists (select 1 from public.services s where s.id = service_id)$c$);
call app_private.allow_staff_write('public.service_images', 'super_admin', 'admin', 'editor');

-- ── Çözüm sayfaları — SEO iniş, 8 bölümlü şablon (K-26)
create table public.solutions (
  id              uuid primary key default gen_random_uuid(),
  slug            jsonb not null,
  title           jsonb not null,
  service_id      uuid references public.services(id) on delete set null,
  hero_summary    jsonb not null default '{}',
  problem         jsonb not null default '{}',
  comparison      jsonb not null default '{}',
  advantages      jsonb not null default '[]' check (jsonb_typeof(advantages) = 'array'),
  technical_basis jsonb not null default '{}',
  cta             jsonb not null default '{}',
  cover_image_id  uuid references public.media_library(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
call app_private.localized_slug('public.solutions', 'solution');
call app_private.publishable('public.solutions');
call app_private.seo_columns('public.solutions');
call app_private.sortable('public.solutions');
call app_private.track_updated_at('public.solutions');
call app_private.content_policies('public.solutions');

-- ── Fiyat rehberi. Fiyatın TEK kaynağı material_prices'tır (0008); satırlar oraya bağlanır.
create table public.price_guides (
  id                uuid primary key default gen_random_uuid(),
  slug              jsonb not null,
  title             jsonb not null,
  service_id        uuid references public.services(id) on delete set null,
  intro             jsonb not null default '{}',
  factors           jsonb not null default '{}',
  formula           jsonb not null default '{}',
  -- "tahmini aralıktır, kesin teklif keşif sonrası verilir" — zorunlu alan
  disclaimer        jsonb not null check (nullif(disclaimer->>'tr', '') is not null),
  quantity_unit     text not null default 'ton',
  quantity_presets  numeric[] not null default '{50,100,200}',
  vat_included      boolean not null default false,
  prices_updated_at timestamptz,
  stale_after_days  integer not null default 90 check (stale_after_days > 0),   -- panelde "bayat" uyarısı
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
call app_private.localized_slug('public.price_guides', 'price_guide');
call app_private.publishable('public.price_guides');
call app_private.seo_columns('public.price_guides');
call app_private.sortable('public.price_guides');
call app_private.track_updated_at('public.price_guides');
call app_private.content_policies('public.price_guides');

create table public.price_guide_rows (
  id                uuid primary key default gen_random_uuid(),
  price_guide_id    uuid not null references public.price_guides(id) on delete cascade,
  system_type       jsonb not null,
  description       jsonb not null default '{}',
  material_price_id uuid,                         -- FK 0008'de eklenir
  -- Aralık, kaynak fiyatın çarpanı olarak tutulur: fiyat bir yerde güncellenince rehber de güncellenir.
  min_factor        numeric(6,4) not null default 1 check (min_factor > 0),
  max_factor        numeric(6,4) not null default 1 check (max_factor >= min_factor),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
call app_private.sortable('public.price_guide_rows', 'price_guide_id');
call app_private.track_updated_at('public.price_guide_rows');
call app_private.secure('public.price_guide_rows');
call app_private.allow_public_read('public.price_guide_rows', $c$exists (select 1 from public.price_guides g where g.id = price_guide_id)$c$);
call app_private.allow_staff_write('public.price_guide_rows', 'super_admin', 'admin', 'editor');

-- ── Projeler
create table public.project_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        jsonb not null,
  name        jsonb not null check (nullif(name->>'tr', '') is not null),
  description jsonb not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
call app_private.localized_slug('public.project_categories', 'project_category');
call app_private.seo_columns('public.project_categories');
call app_private.sortable('public.project_categories');
call app_private.track_updated_at('public.project_categories');
call app_private.secure('public.project_categories');
call app_private.allow_public_read('public.project_categories', 'is_active');
call app_private.allow_staff_read('public.project_categories', 'super_admin', 'admin', 'editor', 'viewer');
call app_private.allow_staff_write('public.project_categories', 'super_admin', 'admin', 'editor');

create table public.projects (
  id             uuid primary key default gen_random_uuid(),
  slug           jsonb not null,
  title          jsonb not null,
  excerpt        jsonb not null default '{}',
  body           jsonb not null default '{}',
  location       jsonb not null default '{}',
  client_name    text,
  client_id      uuid,                              -- FK 0004'te
  sale_id        uuid,                              -- FK 0007'de: tamamlanan satış → referans proje
  area_m2        numeric(12,2) check (area_m2 > 0),
  tonnage        numeric(12,3) check (tonnage > 0),
  started_on     date,
  completed_on   date,
  cover_image_id uuid references public.media_library(id) on delete set null,
  is_featured    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (completed_on is null or started_on is null or completed_on >= started_on)
);
call app_private.localized_slug('public.projects', 'project');
call app_private.publishable('public.projects');
call app_private.seo_columns('public.projects');
call app_private.sortable('public.projects');
call app_private.track_updated_at('public.projects');
call app_private.content_policies('public.projects');
create index projects_featured_idx on public.projects (sort_order) where is_featured and status = 'published';

create table public.project_images (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  media_id   uuid not null references public.media_library(id) on delete cascade,
  alt        jsonb not null default '{}',
  caption    jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
call app_private.sortable('public.project_images', 'project_id');
call app_private.track_updated_at('public.project_images');
call app_private.secure('public.project_images');
call app_private.allow_public_read('public.project_images', $c$exists (select 1 from public.projects p where p.id = project_id)$c$);
call app_private.allow_staff_write('public.project_images', 'super_admin', 'admin', 'editor');

create table public.project_category_relations (
  project_id  uuid not null references public.projects(id) on delete cascade,
  category_id uuid not null references public.project_categories(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (project_id, category_id)
);
create index project_category_relations_category_idx on public.project_category_relations (category_id);
call app_private.secure('public.project_category_relations');
call app_private.allow_public_read('public.project_category_relations', $c$exists (select 1 from public.projects p where p.id = project_id)$c$);
call app_private.allow_staff_write('public.project_category_relations', 'super_admin', 'admin', 'editor');

-- Hizmet ↔ proje: TEK satır, iki yönde sorgulanır. Ters kayıt tutulmaz (eninde sonunda tutarsızlaşır).
create table public.service_projects (
  service_id uuid not null references public.services(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (service_id, project_id)
);
create index service_projects_project_idx on public.service_projects (project_id);
call app_private.secure('public.service_projects');
call app_private.allow_public_read('public.service_projects');
call app_private.allow_staff_write('public.service_projects', 'super_admin', 'admin', 'editor');

-- ── Blog
create table public.blog_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        jsonb not null,
  name        jsonb not null check (nullif(name->>'tr', '') is not null),
  description jsonb not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
call app_private.localized_slug('public.blog_categories', 'blog_category');
call app_private.seo_columns('public.blog_categories');
call app_private.sortable('public.blog_categories');
call app_private.track_updated_at('public.blog_categories');
call app_private.secure('public.blog_categories');
call app_private.allow_public_read('public.blog_categories', 'is_active');
call app_private.allow_staff_read('public.blog_categories', 'super_admin', 'admin', 'editor', 'viewer');
call app_private.allow_staff_write('public.blog_categories', 'super_admin', 'admin', 'editor');

create table public.blog_tags (
  id         uuid primary key default gen_random_uuid(),
  slug       jsonb not null,
  name       jsonb not null check (nullif(name->>'tr', '') is not null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
call app_private.localized_slug('public.blog_tags', 'blog_tag');
call app_private.track_updated_at('public.blog_tags');
call app_private.secure('public.blog_tags');
call app_private.allow_public_read('public.blog_tags');
call app_private.allow_staff_write('public.blog_tags', 'super_admin', 'admin', 'editor');

create table public.blog_posts (
  id              uuid primary key default gen_random_uuid(),
  slug            jsonb not null,
  title           jsonb not null,
  excerpt         jsonb not null default '{}',
  body            jsonb not null default '{}',     -- {"tr": <Tiptap JSON>, "en": <Tiptap JSON>}
  cover_image_id  uuid references public.media_library(id) on delete set null,
  category_id     uuid references public.blog_categories(id) on delete set null,
  author_id       uuid,                             -- FK 0004'te → team_members (E-E-A-T: yazar = gerçek ekip üyesi)
  reading_minutes jsonb not null default '{}',
  is_featured     boolean not null default false,
  allow_comments  boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
call app_private.localized_slug('public.blog_posts', 'blog_post');
call app_private.publishable('public.blog_posts');
call app_private.seo_columns('public.blog_posts');
call app_private.track_updated_at('public.blog_posts');
call app_private.content_policies('public.blog_posts');
create index blog_posts_category_idx on public.blog_posts (category_id, published_at desc);

create table public.blog_post_tags (
  post_id    uuid not null references public.blog_posts(id) on delete cascade,
  tag_id     uuid not null references public.blog_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, tag_id)
);
create index blog_post_tags_tag_idx on public.blog_post_tags (tag_id);
call app_private.secure('public.blog_post_tags');
call app_private.allow_public_read('public.blog_post_tags', $c$exists (select 1 from public.blog_posts b where b.id = post_id)$c$);
call app_private.allow_staff_write('public.blog_post_tags', 'super_admin', 'admin', 'editor');

-- ── Küratörlü çapraz bağlantılar (iç bağlantı akışı) — polimorfik, FK yok → tip listesi CHECK ile sabit
create function app_private.is_content_type(p_type text) returns boolean
language sql immutable as $$
  select p_type in ('service','product','product_category','solution','price_guide','project','project_category','blog_post','static_page','job_posting')
$$;

create table public.content_links (
  id         uuid primary key default gen_random_uuid(),
  from_type  text not null check (app_private.is_content_type(from_type)),
  from_id    uuid not null,
  to_type    text not null check (app_private.is_content_type(to_type)),
  to_id      uuid not null,
  relation   text not null default 'related',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (from_type, from_id, to_type, to_id, relation),
  check ((from_type, from_id) is distinct from (to_type, to_id))
);
create index content_links_to_idx on public.content_links (to_type, to_id);
call app_private.track_updated_at('public.content_links');
call app_private.secure('public.content_links');
call app_private.allow_public_read('public.content_links');
call app_private.allow_staff_write('public.content_links', 'super_admin', 'admin', 'editor');

-- ── SSS: entity_type + entity_id boşsa genel SSS sayfası (K-28)
create table public.faqs (
  id          uuid primary key default gen_random_uuid(),
  entity_type text check (entity_type is null or app_private.is_content_type(entity_type)),
  entity_id   uuid,
  question    jsonb not null,
  answer      jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check ((entity_type is null) = (entity_id is null))
);
create index faqs_entity_idx on public.faqs (entity_type, entity_id);
call app_private.publishable('public.faqs', 'question', false);
call app_private.track_updated_at('public.faqs');
call app_private.content_policies('public.faqs');
alter table public.faqs add column sort_order integer not null default 0;
