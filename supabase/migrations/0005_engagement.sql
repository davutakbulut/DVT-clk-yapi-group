-- 0005 · Etkileşim (5). testimonials seed'de BOŞ: sahte müşteri yorumu yazılmaz.

create table public.testimonials (
  id              uuid primary key default gen_random_uuid(),
  source          text not null default 'manual' check (source in ('manual','google','visitor')),
  external_id     text,                               -- Google review id
  author_name     text not null,
  author_title    jsonb not null default '{}',
  company         text,
  avatar_id       uuid references public.media_library(id) on delete set null,
  avatar_url      text,                               -- Google profil görseli (kendi Storage'ımızda değil)
  rating          smallint not null check (rating between 1 and 5),
  body            jsonb not null default '{}',
  original_locale text check (original_locale in ('tr','en')),
  is_verified     boolean not null default false,
  is_featured     boolean not null default false,
  service_id      uuid references public.services(id) on delete set null,
  project_id      uuid references public.projects(id) on delete set null,
  product_id      uuid references public.products(id) on delete set null,
  reviewed_on     date,
  status          text not null default 'pending' check (status in ('pending','published','rejected','archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check ((source = 'google') = (external_id is not null))
);
create unique index testimonials_external_uq on public.testimonials (source, external_id) where external_id is not null;
create index testimonials_published_idx on public.testimonials (is_featured desc, reviewed_on desc) where status = 'published';
call app_private.sortable('public.testimonials');
call app_private.track_updated_at('public.testimonials');
call app_private.secure('public.testimonials');
call app_private.allow_public_read('public.testimonials', $c$status = 'published'$c$);
call app_private.allow_staff_read('public.testimonials', 'super_admin', 'admin', 'editor', 'viewer');
call app_private.allow_staff_write('public.testimonials', 'super_admin', 'admin', 'editor');

create table public.review_sync_runs (
  id             uuid primary key default gen_random_uuid(),
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  status         text not null default 'running' check (status in ('running','success','partial','failed')),
  fetched_count  integer not null default 0,
  inserted_count integer not null default 0,
  updated_count  integer not null default 0,
  error          text,
  created_at     timestamptz not null default now()
);
call app_private.secure('public.review_sync_runs');
call app_private.allow_staff_read('public.review_sync_runs', 'super_admin', 'admin', 'editor', 'viewer');

create table public.post_comments (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.blog_posts(id) on delete cascade,
  parent_id    uuid references public.post_comments(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete set null,
  author_name  text not null,
  author_email text,
  body         text not null check (length(body) between 2 and 4000),
  status       text not null default 'pending' check (status in ('pending','approved','rejected','spam')),
  locale       text not null default 'tr' check (locale in ('tr','en')),
  ip_masked    text,
  moderated_by uuid references public.profiles(id) on delete set null,
  moderated_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index post_comments_post_idx on public.post_comments (post_id, created_at) where status = 'approved';
create index post_comments_pending_idx on public.post_comments (created_at) where status = 'pending';

-- Tek seviye yanıt: yanıta yanıt verilemez.
create function app_private.enforce_single_level_reply() returns trigger
language plpgsql as $$
begin
  if new.parent_id is not null and exists (select 1 from public.post_comments c where c.id = new.parent_id and (c.parent_id is not null or c.post_id <> new.post_id)) then
    raise exception 'Yorum yanıtları tek seviyedir ve aynı yazıya ait olmalıdır' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger post_comments_single_level before insert or update of parent_id on public.post_comments
  for each row execute function app_private.enforce_single_level_reply();

call app_private.track_updated_at('public.post_comments');
call app_private.secure('public.post_comments');
-- E-posta ve IP anonime AÇILMAZ: tablo değil, aşağıdaki dar görünüm okunur.
call app_private.allow_staff_write('public.post_comments', 'super_admin', 'admin', 'editor');

create view public.published_comments with (security_barrier = true) as
  select c.id, c.post_id, c.parent_id, c.author_name, c.body, c.locale, c.created_at
    from public.post_comments c
    join public.blog_posts b on b.id = c.post_id
   where c.status = 'approved'
     and b.status = 'published' and (b.published_at is null or b.published_at <= now());
revoke all on public.published_comments from anon, authenticated;
grant select on public.published_comments to anon, authenticated;

create table public.post_likes (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.blog_posts(id) on delete cascade,
  visitor_hash text not null,                         -- geri döndürülemez özet; ham IP/çerez saklanmaz
  created_at   timestamptz not null default now(),
  unique (post_id, visitor_hash)
);
call app_private.secure('public.post_likes');
call app_private.allow_staff_read('public.post_likes', 'super_admin', 'admin', 'editor', 'viewer');

-- Kullanıcı VEYA rol hedefli. Rol hedefli bildirimde "okundu" kişiye özeldir → read_by dizisi.
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  target_role text check (target_role in ('super_admin','admin','editor','sales','viewer')),
  type        text not null,                          -- 'lead.created' — metin istemcide i18n ile üretilir
  payload     jsonb not null default '{}',
  link_path   text,
  read_by     uuid[] not null default '{}',
  created_at  timestamptz not null default now(),
  check (user_id is not null or target_role is not null)
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_role_idx on public.notifications (target_role, created_at desc);
call app_private.secure('public.notifications');
grant select on public.notifications to authenticated;
create policy "own or role notifications" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) or target_role = (select app_private.user_role()));

-- Okundu işareti: doğrudan UPDATE yetkisi verilseydi kullanıcı payload'ı da değiştirebilirdi.
create function public.mark_notifications_read(p_ids uuid[]) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then return 0; end if;
  update public.notifications n
     set read_by = array_append(n.read_by, v_uid)
   where n.id = any(p_ids)
     and not v_uid = any(n.read_by)
     and (n.user_id = v_uid or n.target_role = app_private.user_role());
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke execute on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
