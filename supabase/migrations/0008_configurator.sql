-- 0008 · Konfigüratör (7 + fiyat geçmişi) — K-29, K-30
-- steel_profiles ve material_prices seed'de BOŞ: mühendislik değerleri ve fiyatlar ezberden yazılmaz.

create table public.steel_profiles (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,                        -- HEB360, IPE500, UNP160…
  family     text not null,
  kg_per_m   numeric(10,3) not null check (kg_per_m > 0), -- metraj motorunun TEK ağırlık kaynağı
  dimensions jsonb not null default '{}',
  usage      text check (usage in ('column','beam','rafter','purlin','girt','bracing','wind_column','other')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
call app_private.sortable('public.steel_profiles');

-- Fiyatın TEK kaynağı: fiyat rehberi de konfigüratör de buradan okur → bir yerde güncellenince her yer tutarlı.
create table public.material_prices (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  name       jsonb not null check (nullif(name->>'tr', '') is not null),
  category   text not null check (category in ('steel','panel','labor','fastener','coating','other')),
  unit       text not null check (unit in ('kg','ton','m2','m','piece','hour')),
  unit_price numeric(14,4) not null check (unit_price >= 0),
  currency   text not null default 'TRY' check (currency in ('TRY','USD','EUR')),
  valid_from date not null default current_date,
  note       text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- "Fiyat yönetimi (geçmişli)": eski değer tetikleyiciyle buraya düşer; geçmiş teklifler yeniden açıklanabilir kalır.
create table public.material_price_history (
  id                uuid primary key default gen_random_uuid(),
  material_price_id uuid not null references public.material_prices(id) on delete cascade,
  unit_price        numeric(14,4) not null,
  currency          text not null,
  valid_from        date not null,
  valid_until       date not null,
  changed_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index material_price_history_idx on public.material_price_history (material_price_id, valid_until desc);

create function app_private.record_material_price_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.material_price_history (material_price_id, unit_price, currency, valid_from, valid_until, changed_by)
  values (old.id, old.unit_price, old.currency, old.valid_from, current_date, (select p.id from public.profiles p where p.id = auth.uid()));
  if new.valid_from = old.valid_from then new.valid_from := current_date; end if;
  return new;
end $$;
create trigger material_prices_history before update of unit_price, currency on public.material_prices
  for each row when (old.unit_price is distinct from new.unit_price or old.currency is distinct from new.currency)
  execute function app_private.record_material_price_change();

alter table public.price_guide_rows
  add constraint price_guide_rows_material_price_fk foreign key (material_price_id) references public.material_prices(id) on delete set null;

create table public.panel_types (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  name              jsonb not null check (nullif(name->>'tr', '') is not null),
  usage             text not null check (usage in ('roof','wall')),
  thickness_mm      numeric(6,2) check (thickness_mm > 0),
  kg_per_m2         numeric(8,3) check (kg_per_m2 > 0),
  material_price_id uuid references public.material_prices(id) on delete set null,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
call app_private.sortable('public.panel_types');

-- min/max limitler, sistem seçim kuralları (≤30 m düz makas, >30 m kafes), işçilik katsayısı…
create table public.configurator_rules (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z][a-z0-9_.]*$'),
  value       jsonb not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Katalog tabloları: 3D model ve metraj herkese açık (K-29) → profiller/paneller/kurallar okunabilir.
-- FİYAT ise üyeye özeldir → material_prices anonime KAPALI.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['steel_profiles','panel_types','configurator_rules'] loop
    call app_private.track_updated_at(('public.' || v_table)::regclass);
    call app_private.secure(('public.' || v_table)::regclass);
    call app_private.allow_public_read(('public.' || v_table)::regclass);
    call app_private.allow_staff_write(('public.' || v_table)::regclass, 'super_admin', 'admin');
  end loop;
end $$;

call app_private.track_updated_at('public.material_prices');
call app_private.secure('public.material_prices');
grant select on public.material_prices to authenticated;
create policy "members read prices" on public.material_prices for select to authenticated using ((select auth.uid()) is not null);
call app_private.allow_staff_write('public.material_prices', 'super_admin', 'admin');
call app_private.audited('public.material_prices');

call app_private.secure('public.material_price_history');
call app_private.allow_staff_read('public.material_price_history', 'super_admin', 'admin', 'sales', 'viewer');

-- ── Konfigürasyonlar: üye (user_id) VEYA anonim (public_token) sahipliği
create table public.configurations (
  id                     uuid primary key default gen_random_uuid(),
  ref_code               text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),   -- /konfigurator/k/[ref]
  name                   text not null default '',
  user_id                uuid references public.profiles(id) on delete cascade,
  public_token           uuid not null unique default gen_random_uuid(),
  owner_email            text,                             -- anonim kayıt; aynı e-postayla üye olunca devralınır (K-30)
  params                 jsonb not null check (jsonb_typeof(params) = 'object'),   -- {"w":20,"l":40,"e":6,"r":8,"b":6}
  current_version        integer not null default 1 check (current_version > 0),
  tonnage_kg             numeric(14,3) check (tonnage_kg >= 0),
  estimated_price        numeric(14,2) check (estimated_price >= 0),
  currency               text not null default 'TRY' check (currency in ('TRY','USD','EUR')),
  status                 text not null default 'saved' check (status in ('saved','converted_to_lead','converted_to_sale','archived')),
  lead_id                uuid references public.leads(id) on delete set null,
  sale_id                uuid references public.sales(id) on delete set null,
  is_shared              boolean not null default false,
  share_price            boolean not null default false,   -- paylaşım bağlantısında fiyat gösterilsin mi
  locale                 text not null default 'tr' check (locale in ('tr','en')),
  ip_masked              text,
  claimed_at             timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (user_id is not null or owner_email is not null)
);
create index configurations_user_idx on public.configurations (user_id, updated_at desc);
create index configurations_owner_email_idx on public.configurations (owner_email) where user_id is null;

create table public.configuration_versions (
  id               uuid primary key default gen_random_uuid(),
  configuration_id uuid not null references public.configurations(id) on delete cascade,
  version          integer not null check (version > 0),
  params           jsonb not null,
  tonnage_kg       numeric(14,3),
  estimated_price  numeric(14,2),
  price_snapshot   jsonb not null default '{}',            -- o günkü birim fiyatlar: eski versiyon bugünkü fiyatla yeniden hesaplanmaz
  note             text,
  created_at       timestamptz not null default now(),
  unique (configuration_id, version)
);

-- Metraj dökümü
create table public.configuration_items (
  id                       uuid primary key default gen_random_uuid(),
  configuration_version_id uuid not null references public.configuration_versions(id) on delete cascade,
  element_group            text not null,                  -- kolon, makas, aşık, çapraz, panel…
  steel_profile_id         uuid references public.steel_profiles(id) on delete set null,
  panel_type_id            uuid references public.panel_types(id) on delete set null,
  profile_code_snapshot    text,
  piece_count              integer check (piece_count > 0),
  total_length_m           numeric(14,3) check (total_length_m >= 0),
  total_area_m2            numeric(14,3) check (total_area_m2 >= 0),
  total_weight_kg          numeric(14,3) check (total_weight_kg >= 0),
  line_price               numeric(14,2),
  sort_order               integer not null default 0,
  created_at               timestamptz not null default now()
);
create index configuration_items_version_idx on public.configuration_items (configuration_version_id, sort_order);

alter table public.leads
  add constraint leads_configuration_fk foreign key (configuration_id) references public.configurations(id) on delete set null;
alter table public.sales
  add constraint sales_configuration_fk foreign key (configuration_id) references public.configurations(id) on delete set null;

call app_private.track_updated_at('public.configurations');
call app_private.secure('public.configurations');
call app_private.secure('public.configuration_versions');
call app_private.secure('public.configuration_items');

grant select, insert, update, delete on public.configurations to authenticated;
create policy "own configurations" on public.configurations for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "staff read" on public.configurations for select to authenticated
  using ((select app_private.has_role('super_admin','admin','editor','sales','viewer')));
create policy "staff manage" on public.configurations for update to authenticated
  using ((select app_private.has_role('super_admin','admin','sales'))) with check ((select app_private.has_role('super_admin','admin','sales')));

-- Alt tablolar görünürlüğü ebeveynden miras alır (sahip ya da personel).
grant select, insert, delete on public.configuration_versions, public.configuration_items to authenticated;
create policy "via configuration" on public.configuration_versions for all to authenticated
  using (exists (select 1 from public.configurations c where c.id = configuration_id))
  with check (exists (select 1 from public.configurations c where c.id = configuration_id and c.user_id = (select auth.uid())));
create policy "via configuration" on public.configuration_items for all to authenticated
  using (exists (select 1 from public.configuration_versions v where v.id = configuration_version_id))
  with check (exists (select 1 from public.configuration_versions v join public.configurations c on c.id = v.configuration_id
                       where v.id = configuration_version_id and c.user_id = (select auth.uid())));

-- Anonim erişim TABLOYA DEĞİL, parametreli RPC'ye. Tabloyu anon'a açıp "where public_token = …" filtresine
-- güvenmek, filtreyi kaldıran tek bir istekle tüm tablonun çekilmesi demektir.
create function public.get_configuration_by_token(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
           'ref_code', c.ref_code, 'name', c.name, 'params', c.params, 'version', c.current_version,
           'tonnage_kg', c.tonnage_kg, 'locale', c.locale, 'updated_at', c.updated_at,
           -- K-29: fiyat üyeye özel; paylaşımda yalnız sahibi açıkça izin verdiyse
           'estimated_price', case when c.share_price then c.estimated_price end,
           'currency', case when c.share_price then c.currency end)
    from public.configurations c
   where c.public_token = p_token
$$;
revoke execute on function public.get_configuration_by_token(uuid) from public;
grant execute on function public.get_configuration_by_token(uuid) to anon, authenticated;
