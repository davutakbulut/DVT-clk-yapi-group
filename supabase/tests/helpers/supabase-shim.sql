-- Supabase platformunun migration'lardan ÖNCE sağladığı ortamın asgari taklidi (yalnız PGlite testleri için).
-- Gerçek projede bunların hepsi zaten vardır; bu dosya oraya ASLA uygulanmaz.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}',
  email_confirmed_at timestamptz,            -- 0039: doğrulanınca devralma tetikleyicisi
  created_at timestamptz not null default now()
);

-- Supabase'deki tanımlarla aynı mantık: PostgREST, JWT'yi bu GUC'a yazar.
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt()->>'sub', '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select auth.jwt()->>'role'
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

-- EN GEVŞEK varsayılan: public'teki her şey API rollerine tam yetkili. Testler böylece
-- "yetkiler açık olsa bile RLS tek başına tutuyor mu" sorusunu yanıtlar.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
