-- 0004 · Kurumsal (5). Seed'de BOŞ başlar: uydurma ekip üyesi, olmayan sertifika yazılmaz.

create table public.team_members (
  id           uuid primary key default gen_random_uuid(),
  full_name    text not null,
  position     jsonb not null default '{}',
  bio          jsonb not null default '{}',
  photo_id     uuid references public.media_library(id) on delete set null,
  email        text,
  linkedin_url text check (linkedin_url is null or linkedin_url ~ '^https://'),
  profile_id   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
call app_private.publishable('public.team_members', 'position', false);
call app_private.sortable('public.team_members');
call app_private.track_updated_at('public.team_members');
call app_private.content_policies('public.team_members');

alter table public.blog_posts
  add constraint blog_posts_author_fk foreign key (author_id) references public.team_members(id) on delete set null;

-- Referans logoları
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  logo_id     uuid references public.media_library(id) on delete set null,
  website_url text check (website_url is null or website_url ~ '^https?://'),
  sector      jsonb not null default '{}',
  is_featured boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
call app_private.sortable('public.clients');
call app_private.track_updated_at('public.clients');
call app_private.secure('public.clients');
call app_private.allow_public_read('public.clients', 'is_active');
call app_private.allow_staff_read('public.clients', 'super_admin', 'admin', 'editor', 'viewer');
call app_private.allow_staff_write('public.clients', 'super_admin', 'admin', 'editor');

alter table public.projects
  add constraint projects_client_fk foreign key (client_id) references public.clients(id) on delete set null;

create table public.certificates (
  id             uuid primary key default gen_random_uuid(),
  title          jsonb not null,
  issuer         text,
  certificate_no text,
  description    jsonb not null default '{}',
  image_id       uuid references public.media_library(id) on delete set null,
  document_id    uuid references public.media_library(id) on delete set null,
  issued_on      date,
  valid_until    date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (valid_until is null or issued_on is null or valid_until >= issued_on)
);
call app_private.publishable('public.certificates', 'title', false);
call app_private.sortable('public.certificates');
call app_private.track_updated_at('public.certificates');
call app_private.content_policies('public.certificates');

create table public.job_postings (
  id                   uuid primary key default gen_random_uuid(),
  slug                 jsonb not null,
  title                jsonb not null,
  department           jsonb not null default '{}',
  location             jsonb not null default '{}',
  employment_type      text not null default 'full_time' check (employment_type in ('full_time','part_time','contract','internship')),
  description          jsonb not null default '{}',
  requirements         jsonb not null default '{}',
  application_deadline date,
  is_open              boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
call app_private.localized_slug('public.job_postings', 'job_posting');
call app_private.publishable('public.job_postings');
call app_private.seo_columns('public.job_postings');
call app_private.track_updated_at('public.job_postings');
call app_private.content_policies('public.job_postings');

-- KVKK: CV süresiz tutulamaz. retention_until dolunca purge fonksiyonu siler.
create table public.job_applications (
  id              uuid primary key default gen_random_uuid(),
  job_posting_id  uuid references public.job_postings(id) on delete set null,
  full_name       text not null,
  email           text not null,
  phone           text,
  cover_letter    text,
  cv_bucket       text not null default 'private-documents',
  cv_path         text,
  status          text not null default 'new' check (status in ('new','reviewing','interview','offer','hired','rejected','withdrawn')),
  internal_notes  text,
  locale          text not null default 'tr' check (locale in ('tr','en')),
  consent_kvkk_at timestamptz not null,               -- açık rıza olmadan başvuru kaydı AÇILAMAZ
  retention_until date not null default (current_date + 365),
  reviewed_by     uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index job_applications_posting_idx on public.job_applications (job_posting_id, created_at desc);
create index job_applications_retention_idx on public.job_applications (retention_until);
call app_private.track_updated_at('public.job_applications');
call app_private.secure('public.job_applications');
-- Başvuru ekleme: Faz 11'de security definer RPC ile. Editör ve satış CV göremez.
call app_private.allow_staff_write('public.job_applications', 'super_admin', 'admin');

-- Dönen yollar Storage'dan da silinmelidir (çağıran cron işi yapar); tablo tek başına silinirse CV dosyası yetim kalır.
create function app_private.purge_expired_job_applications() returns table (cv_bucket text, cv_path text)
language sql security definer set search_path = '' as $$
  delete from public.job_applications a
   where a.retention_until < current_date
  returning a.cv_bucket, a.cv_path
$$;
revoke execute on function app_private.purge_expired_job_applications() from public, anon, authenticated;
