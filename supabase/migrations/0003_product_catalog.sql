-- 0003 · Ürün kataloğu (6) — "Ne satıyoruz?" (K-25). Vitrin: sepet/ödeme yok, her ürün teklife dönüşür (K-27).

create table public.product_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        jsonb not null,
  name        jsonb not null check (nullif(name->>'tr', '') is not null),
  description jsonb not null default '{}',
  image_id    uuid references public.media_library(id) on delete set null,
  parent_id   uuid references public.product_categories(id) on delete restrict,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (parent_id is distinct from id)
);
call app_private.localized_slug('public.product_categories', 'product_category');
call app_private.seo_columns('public.product_categories');
call app_private.sortable('public.product_categories', 'parent_id');
call app_private.track_updated_at('public.product_categories');
call app_private.secure('public.product_categories');
call app_private.allow_public_read('public.product_categories', 'is_active');
call app_private.allow_staff_read('public.product_categories', 'super_admin', 'admin', 'editor', 'viewer');
call app_private.allow_staff_write('public.product_categories', 'super_admin', 'admin', 'editor');

create table public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              jsonb not null,
  name              jsonb not null,
  short_description jsonb not null default '{}',
  description       jsonb not null default '{}',
  usage_areas       jsonb not null default '{}',
  category_id       uuid references public.product_categories(id) on delete set null,
  service_id        uuid references public.services(id) on delete set null,   -- karşılıklı iç bağlantı zorunlu (K-25)
  cover_image_id    uuid references public.media_library(id) on delete set null,
  is_featured       boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
call app_private.localized_slug('public.products', 'product');
call app_private.publishable('public.products', 'name');
call app_private.seo_columns('public.products');
call app_private.sortable('public.products');
call app_private.track_updated_at('public.products');
call app_private.content_policies('public.products');
create index products_category_idx on public.products (category_id, sort_order);

create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  media_id   uuid not null references public.media_library(id) on delete cascade,
  alt        jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
call app_private.sortable('public.product_images', 'product_id');

create table public.product_specs (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  group_name jsonb not null default '{}',
  name       jsonb not null check (nullif(name->>'tr', '') is not null),
  value      jsonb not null,
  unit       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
call app_private.sortable('public.product_specs', 'product_id');

-- kg_per_m: konfigüratörün steel_profiles tablosuyla aynı mantık — ileride metraj motoruyla birleştirilebilir
create table public.product_variants (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products(id) on delete cascade,
  size_label   text not null,                       -- "40×40 mm" — ölçü gösterimi dilden bağımsız
  width_mm     numeric(8,2) check (width_mm > 0),
  height_mm    numeric(8,2) check (height_mm > 0),
  thickness_mm numeric(6,2) check (thickness_mm > 0),
  length_mm    numeric(10,2) check (length_mm > 0),
  kg_per_m     numeric(10,3) check (kg_per_m > 0),
  stock_code   text unique,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
call app_private.sortable('public.product_variants', 'product_id');

create table public.product_documents (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  media_id   uuid not null references public.media_library(id) on delete cascade,
  title      jsonb not null check (nullif(title->>'tr', '') is not null),
  doc_type   text not null check (doc_type in ('datasheet','certificate','installation_guide','other')),
  locales    text[] not null default '{tr}' check (locales <@ array['tr','en']),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
call app_private.sortable('public.product_documents', 'product_id');

-- Dört alt tablo aynı kuralı paylaşır: görünürlük ebeveyn ürüne bağlı.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['product_images','product_specs','product_variants','product_documents'] loop
    call app_private.track_updated_at(('public.' || v_table)::regclass);
    call app_private.secure(('public.' || v_table)::regclass);
    call app_private.allow_public_read(('public.' || v_table)::regclass, 'exists (select 1 from public.products p where p.id = product_id)');
    call app_private.allow_staff_write(('public.' || v_table)::regclass, 'super_admin', 'admin', 'editor');
  end loop;
end $$;
