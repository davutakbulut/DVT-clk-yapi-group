-- 0001 · Temel: yardımcı şema, profiller/roller, ortak sözleşme yardımcıları, sistem tabloları
-- Uzantı KULLANILMAZ (gen_random_uuid çekirdekte) → PGlite'ta test edilebilir, MSSQL'e taşınabilir.

-- ─────────────────────────────────────────────────────────────────────────────
-- app_private: API'ye AÇILMAYAN şema (config.toml [api].schemas içinde yok).
-- security definer fonksiyonlar burada durur; public'te dursalardı /rest/v1/rpc ile çağrılabilirlerdi.
-- ─────────────────────────────────────────────────────────────────────────────
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to anon, authenticated, service_role;

create function app_private.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- K-16/K-17 · Slug üretimindeki bir hatanın veritabanına sızmasına karşı SON emniyet.
-- Desen src/lib/slugify.ts içindeki SLUG_PATTERN ile birebir aynı olmalı.
create function app_private.is_valid_slug(p_slug text) returns boolean
language sql immutable as $$
  -- coalesce ŞART: CHECK kısıtı NULL sonucu GEÇER sayar. Onsuz, TR anahtarı hiç olmayan bir slug
  -- (slug->>'tr' = NULL → regex NULL) kısıttan sessizce geçiyordu. (slug.test.ts yakaladı)
  select coalesce(
           p_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
       and length(p_slug) <= 80
       and p_slug not in ('kategori','category','etiket','tag','arama','search','sayfa','page','403','api'),
         false)
$$;

-- {"tr": "...", "en": "..."} — TR zorunlu (birincil dil), EN isteğe bağlı, başka anahtar olamaz.
create function app_private.is_valid_slug_map(p_slug jsonb) returns boolean
language sql immutable as $$
  select coalesce(
           jsonb_typeof(p_slug) = 'object'
       and (p_slug - 'tr' - 'en') = '{}'::jsonb
       and app_private.is_valid_slug(p_slug->>'tr')
       and (p_slug->>'en' is null or app_private.is_valid_slug(p_slug->>'en')),
         false)
$$;

-- K-07/K-08 · "yayında" ≠ "çevrildi". EN'in yayına girmesi için: slug + başlık + İNSAN ONAYI.
create function app_private.is_publishable(p_locales text[], p_slug jsonb, p_title jsonb, p_meta jsonb) returns boolean
language sql immutable as $$
  select coalesce(
           p_locales <@ array['tr','en']
       and (not 'tr' = any(p_locales) or nullif(p_title->>'tr', '') is not null)
       and (not 'en' = any(p_locales) or (
              nullif(p_title->>'en', '') is not null
          and (p_slug is null or p_slug->>'en' is not null)
          and coalesce((p_meta #>> '{en,reviewed}')::boolean, false))),
         false)
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  full_name            text,
  phone                text,
  avatar_id            uuid,                       -- FK aşağıda (media_library ile döngüsel)
  role                 text not null default 'member'
                         check (role in ('super_admin','admin','editor','sales','viewer','member')),
  is_active            boolean not null default true,
  must_change_password boolean not null default false,
  preferred_locale     text not null default 'tr' check (preferred_locale in ('tr','en')),
  notification_prefs   jsonb not null default '{}',
  last_seen_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role) where role <> 'member';

-- Politikalar profiles'ı DOĞRUDAN sorgulasaydı, profiles'ın kendi politikası sonsuz özyinelemeye girerdi.
-- security definer RLS'i atlar; search_path boş → şema ele geçirme (hijack) yok.
create function app_private.user_role() returns text
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.is_active
$$;

create function app_private.has_role(variadic p_roles text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(app_private.user_role() = any(p_roles), false)
$$;

-- İstek bir API çağrısı mı (anon/authenticated JWT) yoksa güvenilir bağlam mı (migration, seed, service_role)?
create function app_private.is_trusted_context() returns boolean
language sql stable as $$
  select coalesce(auth.jwt()->>'role', '') in ('', 'service_role')
     and current_user not in ('anon', 'authenticated')
$$;

create function app_private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Rol ASLA kullanıcı meta verisinden okunmaz: kayıt formu onu kullanıcının kendisine yazdırır.
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

-- RLS satır bazlıdır; "kendi profilimi güncelleyebilirim" politikası rol KOLONUNU koruyamaz.
-- security INVOKER (bilinçli): is_trusted_context() çağıranın gerçek DB rolünü görebilmeli.
create function app_private.guard_profile_privileges() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role or new.is_active is distinct from old.is_active then
    if not (app_private.is_trusted_context() or app_private.has_role('super_admin')) then
      raise exception 'Rol ve aktiflik yalnız super_admin tarafından değiştirilebilir' using errcode = '42501';
    end if;
    if old.role = 'super_admin' and old.is_active and (new.role <> 'super_admin' or not new.is_active)
       and not exists (select 1 from public.profiles p where p.role = 'super_admin' and p.is_active and p.id <> old.id) then
      raise exception 'Son aktif super_admin devre dışı bırakılamaz' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_guard_privileges before update on public.profiles
  for each row execute function app_private.guard_profile_privileges();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function app_private.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- Sözleşme yardımcıları — 80 tabloda aynı DDL'i elle tekrarlamak yerine tek tanım.
-- Migration'lar bunları çağırır; böylece bir tabloda "with check" unutulamaz.
-- ─────────────────────────────────────────────────────────────────────────────

-- RLS aç + platform varsayılan yetkilerini geri al. Politikasız tablo = kimse erişemez (hata güvenli yönde).
create procedure app_private.secure(p_table regclass) language plpgsql as $$
begin
  execute format('alter table %s enable row level security', p_table);
  execute format('revoke all on %s from anon, authenticated', p_table);
  execute format('grant all on %s to service_role', p_table);
end $$;

create procedure app_private.track_updated_at(p_table regclass) language plpgsql as $$
begin
  execute format('create trigger set_updated_at before update on %s for each row execute function app_private.set_updated_at()', p_table);
end $$;

create procedure app_private.allow_public_read(p_table regclass, p_condition text default 'true') language plpgsql as $$
begin
  execute format('grant select on %s to anon, authenticated', p_table);
  execute format('create policy "public read" on %s for select to anon, authenticated using (%s)', p_table, p_condition);
end $$;

-- (select …) sarmalı: planlayıcı rol kontrolünü satır başına değil sorgu başına BİR kez çalıştırır (InitPlan).
create procedure app_private.allow_staff_read(p_table regclass, variadic p_roles text[]) language plpgsql as $$
begin
  execute format('grant select on %s to authenticated', p_table);
  execute format('create policy "staff read" on %s for select to authenticated using ((select app_private.has_role(variadic %L::text[])))', p_table, p_roles);
end $$;

-- using OKUMAYI, with check YAZMAYI denetler; ikisi de yazılır — biri unutulursa kullanıcı göremediği satırı yazabilir.
create procedure app_private.allow_staff_write(p_table regclass, variadic p_roles text[]) language plpgsql as $$
begin
  execute format('grant select, insert, update, delete on %s to authenticated', p_table);
  execute format('create policy "staff write" on %s for all to authenticated using ((select app_private.has_role(variadic %L::text[]))) with check ((select app_private.has_role(variadic %L::text[])))', p_table, p_roles, p_roles);
end $$;

-- ── slug geçmişi → 308 (K-15)
create table public.slug_history (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id   uuid not null,
  locale      text not null check (locale in ('tr','en')),
  old_slug    text not null,
  created_at  timestamptz not null default now(),
  unique (entity_type, locale, old_slug)
);
create index slug_history_entity_idx on public.slug_history (entity_type, entity_id);
call app_private.secure('public.slug_history');
call app_private.allow_public_read('public.slug_history');
call app_private.allow_staff_write('public.slug_history', 'super_admin', 'admin', 'editor');

create function app_private.record_slug_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_locale text;
begin
  foreach v_locale in array array['tr','en'] loop
    if old.slug->>v_locale is not null and old.slug->>v_locale is distinct from new.slug->>v_locale then
      insert into public.slug_history (entity_type, entity_id, locale, old_slug)
      values (tg_argv[0], old.id, v_locale, old.slug->>v_locale)
      on conflict (entity_type, locale, old_slug) do update set entity_id = excluded.entity_id, created_at = now();
    end if;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    delete from public.slug_history h
     where h.entity_type = tg_argv[0] and h.locale = v_locale and h.old_slug = new.slug->>v_locale;
  end loop;
  return new;
end $$;

-- Çevrilebilir slug sözleşmesi: biçim CHECK'i + locale başına kısmi unique B-tree İFADE indeksi (K-06) + geçmiş.
-- İndeks ifadesi sorgudakiyle METİN OLARAK aynı olmalı: slug->>'tr'  (Faz 1 deney #4)
create procedure app_private.localized_slug(p_table regclass, p_entity_type text) language plpgsql as $$
declare
  v_name text := (select relname from pg_class where oid = p_table);
begin
  execute format('alter table %s add constraint %I check (slug is null or app_private.is_valid_slug_map(slug))', p_table, v_name || '_slug_format');
  execute format('create unique index %I on %s ((slug->>''tr'')) where slug->>''tr'' is not null', v_name || '_slug_tr_uq', p_table);
  execute format('create unique index %I on %s ((slug->>''en'')) where slug->>''en'' is not null', v_name || '_slug_en_uq', p_table);
  execute format('create trigger record_slug_change after update of slug on %s for each row when (old.slug is distinct from new.slug) execute function app_private.record_slug_change(%L)', p_table, p_entity_type);
end $$;

-- Yayın durumu kolonları + K-07/K-08 kısıtı. p_title_col: başlığı taşıyan JSONB kolon (title | name | question).
create procedure app_private.publishable(p_table regclass, p_title_col text default 'title', p_has_slug boolean default true) language plpgsql as $$
declare
  v_name text := (select relname from pg_class where oid = p_table);
begin
  execute format($f$
    alter table %s
      add column status text not null default 'draft' check (status in ('draft','published','archived')),
      add column published_locales text[] not null default '{}',
      add column published_at timestamptz,
      add column translation_meta jsonb not null default '{}'
  $f$, p_table);
  execute format('alter table %s add constraint %I check (app_private.is_publishable(published_locales, %s, %I, translation_meta))',
                 p_table, v_name || '_publishable', case when p_has_slug then 'slug' else 'null' end, p_title_col);
  execute format('create index %I on %s (status, published_at desc)', v_name || '_status_idx', p_table);
end $$;

-- Yayındaki içerik: herkes okur · taslak: içerik ekibi + viewer okur · yazma: içerik ekibi.
-- published_at gelecekteyse kayıt "zamanlanmış"tır ve henüz görünmez.
create procedure app_private.content_policies(p_table regclass) language plpgsql as $$
begin
  call app_private.secure(p_table);
  call app_private.allow_public_read(p_table, $c$status = 'published' and (published_at is null or published_at <= now())$c$);
  call app_private.allow_staff_read(p_table, 'super_admin', 'admin', 'editor', 'viewer');
  call app_private.allow_staff_write(p_table, 'super_admin', 'admin', 'editor');
end $$;

-- Sürükle-bırak sıralama: ERTELENEBİLİR unique → toplu yeniden sıralama tek transaction'da, ara durumda çakışmadan.
create function app_private.assign_sort_order() returns trigger
language plpgsql as $$
declare
  v_next integer;
begin
  if new.sort_order is null then
    if tg_argv[0] is null then
      execute format('select coalesce(max(sort_order), 0) + 1 from %s', tg_relid::regclass) into v_next;
    else
      execute format('select coalesce(max(sort_order), 0) + 1 from %s where %I is not distinct from ($1).%I', tg_relid::regclass, tg_argv[0], tg_argv[0])
        into v_next using new;
    end if;
    new.sort_order := v_next;
  end if;
  return new;
end $$;

create procedure app_private.sortable(p_table regclass, p_scope_col text default null) language plpgsql as $$
declare
  v_name text := (select relname from pg_class where oid = p_table);
begin
  execute format('alter table %s add column sort_order integer', p_table);
  execute format('alter table %s add constraint %I unique %s (%s sort_order) deferrable initially deferred',
                 p_table, v_name || '_sort_order_uq',
                 case when p_scope_col is null then '' else 'nulls not distinct' end,
                 case when p_scope_col is null then '' else quote_ident(p_scope_col) || ',' end);
  if p_scope_col is null then
    execute format('create trigger assign_sort_order before insert on %s for each row execute function app_private.assign_sort_order()', p_table);
  else
    execute format('create trigger assign_sort_order before insert on %s for each row execute function app_private.assign_sort_order(%L)', p_table, p_scope_col);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- media_library — içerik tablolarının çoğu buna FK verir, bu yüzden temelde
-- ─────────────────────────────────────────────────────────────────────────────
create table public.media_library (
  id             uuid primary key default gen_random_uuid(),
  storage_bucket text not null default 'media',
  storage_path   text not null,
  file_name      text not null,
  mime_type      text not null,
  size_bytes     bigint not null check (size_bytes >= 0),
  width          integer,
  height         integer,
  duration_ms    integer,
  blur_data_url  text,
  alt            jsonb not null default '{}',   -- TR/EN: İngilizce sayfada Türkçe alt metni çıkmasın
  caption        jsonb not null default '{}',
  folder         text,
  variants       jsonb not null default '{}',   -- {"w640": "path", "w1280": "path"} — Faz 3
  uploaded_by    uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);
create index media_library_folder_idx on public.media_library (folder);
call app_private.track_updated_at('public.media_library');
call app_private.secure('public.media_library');
call app_private.allow_public_read('public.media_library');
call app_private.allow_staff_write('public.media_library', 'super_admin', 'admin', 'editor');

alter table public.profiles
  add constraint profiles_avatar_fk foreign key (avatar_id) references public.media_library(id) on delete set null;

-- SEO kolonları (og_image → media_library olduğu için burada tanımlanır)
create procedure app_private.seo_columns(p_table regclass) language plpgsql as $$
begin
  execute format($f$
    alter table %s
      add column seo_title jsonb not null default '{}',
      add column seo_description jsonb not null default '{}',
      add column og_image_id uuid references public.media_library(id) on delete set null,
      add column canonical_url text,
      add column noindex boolean not null default false,
      add column focus_keyword jsonb not null default '{}'
  $f$, p_table);
end $$;

-- ── profiles politikaları
call app_private.secure('public.profiles');
grant select, update on public.profiles to authenticated;
create policy "own profile read" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Personel, atama/yazar gösterimi için diğer PERSONELİ görür; üyeleri yalnız yöneticiler görür.
create policy "staff read staff" on public.profiles for select to authenticated
  using (role <> 'member' and (select app_private.has_role('super_admin','admin','editor','sales','viewer')));
create policy "admins read all" on public.profiles for select to authenticated
  using ((select app_private.has_role('super_admin','admin')));
create policy "super admin manage" on public.profiles for update to authenticated
  using ((select app_private.has_role('super_admin'))) with check ((select app_private.has_role('super_admin')));

-- ─────────────────────────────────────────────────────────────────────────────
-- Denetim kaydı
-- ─────────────────────────────────────────────────────────────────────────────
create table public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles(id) on delete set null,
  action     text not null check (action in ('INSERT','UPDATE','DELETE')),
  table_name text not null,
  row_id     uuid,
  old_data   jsonb,
  new_data   jsonb,
  created_at timestamptz not null default now()   -- yalnız-ekleme: updated_at yok
);
create index audit_logs_table_row_idx on public.audit_logs (table_name, row_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
call app_private.secure('public.audit_logs');
-- Yazma politikası YOK: satırlar yalnız aşağıdaki security definer tetikleyiciden gelir → kimse izini silemez.
call app_private.allow_staff_read('public.audit_logs', 'super_admin', 'admin');

create function app_private.audit_row() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
  values (
    (select p.id from public.profiles p where p.id = auth.uid()),
    tg_op, tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create procedure app_private.audited(p_table regclass) language plpgsql as $$
begin
  execute format('create trigger audit_row after insert or update or delete on %s for each row execute function app_private.audit_row()', p_table);
end $$;
call app_private.audited('public.profiles');

-- ─────────────────────────────────────────────────────────────────────────────
-- Belge numaraları: TLP-2026-0118 · SAT-2026-0042 — yıl başına sayaç, boşluksuz ve yarışa dayanıklı
-- ─────────────────────────────────────────────────────────────────────────────
create table public.document_counters (
  prefix  text not null,
  year    integer not null,
  last_no integer not null default 0,
  primary key (prefix, year)
);
call app_private.secure('public.document_counters');

create function app_private.next_document_no(p_prefix text, p_at date default current_date) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_no integer;
begin
  -- upsert satırı kilitler: eşzamanlı iki kayıt aynı numarayı alamaz (sequence yıl başında sıfırlanamazdı).
  insert into public.document_counters as c (prefix, year, last_no)
  values (p_prefix, extract(year from p_at)::int, 1)
  on conflict (prefix, year) do update set last_no = c.last_no + 1
  returning last_no into v_no;
  return format('%s-%s-%s', p_prefix, extract(year from p_at)::int, lpad(v_no::text, 4, '0'));
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Site ayarları · menüler · hata kaydı · yönlendirmeler · revizyonlar
-- ─────────────────────────────────────────────────────────────────────────────
create table public.site_settings (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z][a-z0-9_.]*$'),
  value       jsonb not null default 'null',
  -- false: doğrulama kodları, modül bayrakları gibi ön yüze inmemesi gerekenler
  is_public   boolean not null default false,
  description text,
  updated_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
call app_private.track_updated_at('public.site_settings');
call app_private.secure('public.site_settings');
call app_private.allow_public_read('public.site_settings', 'is_public');
call app_private.allow_staff_read('public.site_settings', 'super_admin', 'admin', 'editor', 'sales', 'viewer');
call app_private.allow_staff_write('public.site_settings', 'super_admin', 'admin');
call app_private.audited('public.site_settings');

create table public.menus (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique check (key in ('header','footer_primary','footer_legal','mobile_extra','account')),
  title      jsonb not null default '{}',
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
call app_private.track_updated_at('public.menus');
call app_private.secure('public.menus');
call app_private.allow_public_read('public.menus', 'is_active');
call app_private.allow_staff_read('public.menus', 'super_admin', 'admin', 'editor', 'viewer');
call app_private.allow_staff_write('public.menus', 'super_admin', 'admin');

create table public.menu_items (
  id              uuid primary key default gen_random_uuid(),
  menu_id         uuid not null references public.menus(id) on delete cascade,
  parent_id       uuid references public.menu_items(id) on delete cascade,
  label           jsonb not null,
  link_type       text not null default 'internal' check (link_type in ('internal','entity','external','anchor','none')),
  internal_path   text,          -- src/i18n/routing.ts pathnames anahtarı: '/services'
  entity_type     text,
  entity_id       uuid,
  external_url    text,
  anchor          text,
  header_slot     text check (header_slot in ('left','right')),   -- ortalanmış logonun solu / sağı
  locales         text[] not null default '{tr,en}' check (locales <@ array['tr','en']),
  visibility      text not null default 'all' check (visibility in ('all','guest','member','staff')),
  is_cta          boolean not null default false,
  open_in_new_tab boolean not null default false,
  icon            text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (nullif(label->>'tr', '') is not null),
  check (case link_type
           when 'internal' then internal_path is not null
           when 'entity'   then entity_type is not null and entity_id is not null
           when 'external' then external_url ~ '^https?://'
           when 'anchor'   then anchor is not null
           else true end)
);
create index menu_items_menu_idx on public.menu_items (menu_id, parent_id);
call app_private.sortable('public.menu_items', 'parent_id');
call app_private.track_updated_at('public.menu_items');
call app_private.secure('public.menu_items');
call app_private.allow_public_read('public.menu_items', 'is_active');
call app_private.allow_staff_read('public.menu_items', 'super_admin', 'admin', 'editor', 'viewer');
call app_private.allow_staff_write('public.menu_items', 'super_admin', 'admin');

create table public.error_logs (
  id            uuid primary key default gen_random_uuid(),
  fingerprint   text not null unique,     -- aynı hata 500 kez düşse TEK satır
  module        text not null default 'unknown',
  source        text not null default 'server' check (source in ('server','client','edge','cron')),
  level         text not null default 'error' check (level in ('warn','error','fatal')),
  code          text,
  message       text not null,
  stack         text,
  path          text,
  status_code   integer,
  user_id       uuid references public.profiles(id) on delete set null,
  ip_masked     text,
  user_agent    text,
  context       jsonb not null default '{}',
  occurrences   integer not null default 1,
  affected_users integer not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index error_logs_module_idx on public.error_logs (module, last_seen_at desc);
create index error_logs_open_idx on public.error_logs (last_seen_at desc) where resolved_at is null;
call app_private.track_updated_at('public.error_logs');
call app_private.secure('public.error_logs');
-- Yazma: Faz 25'te security definer RPC ile. Anonim ziyaretçiye tablo erişimi açılmaz.
call app_private.allow_staff_write('public.error_logs', 'super_admin', 'admin');

create table public.redirects (
  id          uuid primary key default gen_random_uuid(),
  source_path text not null unique check (source_path ~ '^/'),
  target_path text,
  status_code integer not null default 301 check (status_code in (301,302,307,308,410)),
  is_active   boolean not null default true,
  hit_count   bigint not null default 0,
  last_hit_at timestamptz,
  note        text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (status_code = 410 or target_path is not null),   -- 410 Gone'un hedefi olmaz
  check (target_path is distinct from source_path)
);
call app_private.track_updated_at('public.redirects');
call app_private.secure('public.redirects');
call app_private.allow_public_read('public.redirects', 'is_active');
call app_private.allow_staff_read('public.redirects', 'super_admin', 'admin', 'editor', 'viewer');
call app_private.allow_staff_write('public.redirects', 'super_admin', 'admin', 'editor');

-- Blog editöründeki "revizyon geçmişi" — her içerik tipi için ortak
create table public.content_revisions (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id   uuid not null,
  snapshot    jsonb not null,
  note        text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index content_revisions_entity_idx on public.content_revisions (entity_type, entity_id, created_at desc);
call app_private.secure('public.content_revisions');
call app_private.allow_staff_read('public.content_revisions', 'super_admin', 'admin', 'editor', 'viewer');
grant insert on public.content_revisions to authenticated;
create policy "staff insert" on public.content_revisions for insert to authenticated
  with check ((select app_private.has_role('super_admin','admin','editor')));
