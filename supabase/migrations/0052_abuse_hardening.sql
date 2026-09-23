-- 0052 · Kötüye kullanım / aşırı yük sertleştirmesi (K-104)
-- Sorun: public yazma RPC'leri anon anahtarla DOĞRUDAN çağrılabiliyordu (uygulamadaki hız sınırı, bal küpü ve doğrulama atlanır).
-- Çözüm: (1) RPC kapısı — sunucu her istekte gizli `x-clk-gate` başlığı gönderir; kapı yapılandırıldıysa başlıksız çağrı reddedilir.
--        (2) Veritabanı içi eşik (app_private.throttle) — global ve anahtar başına, uygulama süreçlerinden bağımsız.
--        (3) Sarmalayıcılar: mevcut fonksiyon gövdeleri DEĞİŞMEZ; `<ad>_impl` olarak yeniden adlandırılır, yetkileri kaldırılır,
--            aynı imzalı yeni fonksiyon kapı + eşik + boyut denetiminden sonra impl'i çağırır (uygulama kodu aynen çalışır).
--        (4) Boyut kısıtları (profiles.saved_basket, configurations.*, post_comments.*) ve bakımda temizlik (error_logs, notifications…).

-- ── 1 · Yapılandırma + kapı ─────────────────────────────────────────────────────────────────────────────────────────
create table if not exists app_private.config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
revoke all on app_private.config from public, anon, authenticated;

/** Kapı: rpc_gate yapılandırılmamışsa açık (kurulum öncesi uyumluluk); yapılandırıldıysa başlık eşleşmeli. service_role muaf. */
create or replace function public.rpc_gate_ok() returns boolean
language plpgsql security definer stable set search_path = '' as $$
declare v_secret text; v_given text;
begin
  if coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb->>'role' = 'service_role' then return true; end if;
  select value into v_secret from app_private.config where key = 'rpc_gate';
  if v_secret is null then return true; end if;
  begin v_given := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb->>'x-clk-gate'; exception when others then v_given := null; end;
  return v_given is not null and v_given = v_secret;
end $$;
revoke execute on function public.rpc_gate_ok() from public;
grant execute on function public.rpc_gate_ok() to anon, authenticated, service_role;

create or replace function app_private.require_gate() returns void
language plpgsql security definer stable set search_path = '' as $$
begin
  if not public.rpc_gate_ok() then raise exception 'rpc_gate: reddedildi' using errcode = '42501'; end if;
end $$;

/** Kapı sırrını yalnız service_role yazar (scripts/set-rpc-gate.mjs). Boş metin → kapı kapatılır (açık kalır). */
create or replace function public.set_rpc_gate(p_secret text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb->>'role' <> 'service_role' then raise exception 'set_rpc_gate: yetki' using errcode = '42501'; end if;
  if p_secret is null or length(btrim(p_secret)) = 0 then delete from app_private.config where key = 'rpc_gate'; return; end if;
  if length(p_secret) < 24 then raise exception 'set_rpc_gate: sır en az 24 karakter' using errcode = '22023'; end if;
  insert into app_private.config (key, value) values ('rpc_gate', p_secret)
  on conflict (key) do update set value = excluded.value, updated_at = now();
end $$;
revoke execute on function public.set_rpc_gate(text) from public, anon, authenticated;
grant execute on function public.set_rpc_gate(text) to service_role;

-- ── 2 · Eşik (sabit pencere) ────────────────────────────────────────────────────────────────────────────────────────
create table if not exists app_private.throttle (
  key          text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (key, window_start)
);
revoke all on app_private.throttle from public, anon, authenticated;

/** p_key için p_window penceresinde p_limit aşılırsa P0429 fırlatır. Anahtar en çok 200 karakter. */
create or replace function app_private.throttle(p_key text, p_limit integer, p_window interval) returns void
language plpgsql security definer set search_path = '' as $$
declare v_hits integer; v_start timestamptz;
begin
  v_start := to_timestamp(floor(extract(epoch from now()) / extract(epoch from p_window)) * extract(epoch from p_window));
  insert into app_private.throttle as t (key, window_start, hits) values (left(p_key, 200), v_start, 1)
  on conflict (key, window_start) do update set hits = t.hits + 1
  returning hits into v_hits;
  if v_hits > p_limit then raise exception 'rate_limited: %', left(p_key, 40) using errcode = 'P0429'; end if;
end $$;

-- ── 3 · Sarmalayıcılar ──────────────────────────────────────────────────────────────────────────────────────────────
do $$
declare r record;
begin
  for r in select * from (values
    ('submit_lead', 'jsonb'), ('submit_job_application', 'jsonb'), ('submit_testimonial', 'jsonb'), ('save_configuration', 'jsonb'),
    ('ingest_analytics', 'jsonb'), ('report_error', 'jsonb'), ('record_redirect_hit', 'text'), ('set_configuration_sharing', 'uuid, boolean'),
    ('search_site', 'text, text, integer'), ('customer_lead_message', 'uuid, text, text')) as v(name, args)
  loop
    execute format('alter function public.%I(%s) rename to %I', r.name, r.args, r.name || '_impl');
    execute format('revoke execute on function public.%I(%s) from public, anon, authenticated', r.name || '_impl', r.args);
  end loop;
end $$;

create or replace function public.submit_lead(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(btrim(coalesce(p->>'email', '')));
begin
  perform app_private.require_gate();
  if pg_column_size(p) > 32768 then raise exception 'submit_lead: gövde çok büyük' using errcode = '22023'; end if;
  perform app_private.throttle('lead:global', 60, interval '10 minutes');
  if v_email <> '' then perform app_private.throttle('lead:email:' || v_email, 3, interval '1 hour'); end if;
  return public.submit_lead_impl(p);
end $$;
grant execute on function public.submit_lead(jsonb) to anon, authenticated, service_role;

create or replace function public.submit_job_application(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_email text := lower(btrim(coalesce(p->>'email', '')));
begin
  perform app_private.require_gate();
  if pg_column_size(p) > 32768 then raise exception 'submit_job_application: gövde çok büyük' using errcode = '22023'; end if;
  perform app_private.throttle('job:global', 30, interval '1 hour');
  if v_email <> '' then perform app_private.throttle('job:email:' || v_email, 2, interval '1 day'); end if;
  return public.submit_job_application_impl(p);
end $$;
grant execute on function public.submit_job_application(jsonb) to anon, authenticated, service_role;

create or replace function public.submit_testimonial(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.require_gate();
  if pg_column_size(p) > 8192 then raise exception 'submit_testimonial: gövde çok büyük' using errcode = '22023'; end if;
  perform app_private.throttle('testimonial:global', 30, interval '1 hour');
  return public.submit_testimonial_impl(p);
end $$;
grant execute on function public.submit_testimonial(jsonb) to anon, authenticated, service_role;

create or replace function public.save_configuration(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.require_gate();
  if pg_column_size(p) > 65536 then raise exception 'save_configuration: gövde çok büyük' using errcode = '22023'; end if;
  perform app_private.throttle('config:global', 300, interval '10 minutes');
  return public.save_configuration_impl(p);
end $$;
grant execute on function public.save_configuration(jsonb) to anon, authenticated, service_role;

create or replace function public.ingest_analytics(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.require_gate();
  if pg_column_size(p) > 262144 then raise exception 'ingest_analytics: gövde çok büyük' using errcode = '22023'; end if;
  perform app_private.throttle('analytics:global', 3000, interval '10 minutes');
  return public.ingest_analytics_impl(p);
end $$;
grant execute on function public.ingest_analytics(jsonb) to anon, authenticated, service_role;

create or replace function public.report_error(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.require_gate();
  if pg_column_size(p) > 16384 then raise exception 'report_error: gövde çok büyük' using errcode = '22023'; end if;
  if pg_column_size(p->'context') > 4096 then p := p - 'context'; end if;
  perform app_private.throttle('error:global', 600, interval '10 minutes');
  return public.report_error_impl(p);
end $$;
grant execute on function public.report_error(jsonb) to anon, authenticated, service_role;

create or replace function public.record_redirect_hit(p_path text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.require_gate();
  if p_path is null or length(p_path) > 500 then return; end if;
  perform app_private.throttle('redirect:global', 600, interval '10 minutes');
  perform public.record_redirect_hit_impl(p_path);
end $$;
grant execute on function public.record_redirect_hit(text) to anon, authenticated, service_role;

create or replace function public.set_configuration_sharing(p_token uuid, p_share_price boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.require_gate();
  perform app_private.throttle('share:global', 300, interval '10 minutes');
  return public.set_configuration_sharing_impl(p_token, p_share_price);
end $$;
grant execute on function public.set_configuration_sharing(uuid, boolean) to anon, authenticated, service_role;

create or replace function public.search_site(p_locale text, p_q text, p_limit integer default 20)
returns table(kind text, slug text, title text, field text, snippet text, rank numeric)
language plpgsql security definer stable set search_path = '' as $$
begin
  perform app_private.require_gate();
  if p_q is null or length(btrim(p_q)) < 2 or length(p_q) > 60 then return; end if;
  return query select * from public.search_site_impl(p_locale, p_q, least(greatest(coalesce(p_limit, 20), 1), 50));
end $$;
grant execute on function public.search_site(text, text, integer) to anon, authenticated, service_role;

create or replace function public.customer_lead_message(p_lead_id uuid, p_kind text, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.require_gate();
  if auth.uid() is null then raise exception 'customer_lead_message: auth' using errcode = '42501'; end if;
  perform app_private.throttle('clm:' || auth.uid()::text, 5, interval '1 hour');
  return public.customer_lead_message_impl(p_lead_id, p_kind, p_body);
end $$;
grant execute on function public.customer_lead_message(uuid, text, text) to authenticated, service_role;

-- ── 4 · Doğrudan tablo yazmaları: kapı + boyut kısıtları ────────────────────────────────────────────────────────────
-- Blog yorumu: anon INSERT politikası kapıdan geçmeli; metin sınırları
alter table public.post_comments drop constraint if exists post_comments_author_len;
alter table public.post_comments add constraint post_comments_author_len
  check (char_length(author_name) <= 80 and (author_email is null or char_length(author_email) <= 200) and (ip_masked is null or char_length(ip_masked) <= 64));
drop policy if exists "visitor comment" on public.post_comments;
create policy "visitor comment" on public.post_comments for insert to anon, authenticated
  with check (
    public.rpc_gate_ok()
    and status = 'pending'
    and (user_id is null or user_id = auth.uid())
    and exists (select 1 from public.blog_posts b where b.id = post_id and b.allow_comments and b.status = 'published'
                  and (b.published_at is null or b.published_at <= now()))
  );

-- CV yükleme (Storage): kapı
do $$
begin
  if to_regclass('storage.objects') is null then return; end if;
  drop policy if exists "private visitor cv insert" on storage.objects;
  create policy "private visitor cv insert" on storage.objects for insert
    to anon, authenticated with check (public.rpc_gate_ok() and bucket_id = 'private-documents' and name ~ '^cv/[a-f0-9-]{36}\.(pdf|doc|docx)$');
end $$;

-- Profil: kayıtlı sepet ve metinler sınırlı; yalnız sepet/son görülme değişince denetim satırı yazılmaz
alter table public.profiles drop constraint if exists profiles_sizes;
alter table public.profiles add constraint profiles_sizes
  check (pg_column_size(saved_basket) <= 16384 and (full_name is null or char_length(full_name) <= 120) and (phone is null or char_length(phone) <= 32) and pg_column_size(notification_prefs) <= 4096);
drop trigger if exists audit_row on public.profiles;
drop trigger if exists audit_row_update on public.profiles;
create trigger audit_row after insert or delete on public.profiles for each row execute function app_private.audit_row();
create trigger audit_row_update after update on public.profiles for each row
  when ((to_jsonb(old) - 'saved_basket' - 'last_seen_at' - 'updated_at') is distinct from (to_jsonb(new) - 'saved_basket' - 'last_seen_at' - 'updated_at'))
  execute function app_private.audit_row();

-- Konfigürasyon: üye doğrudan yazabildiği için boyut kısıtları
alter table public.configurations drop constraint if exists configurations_sizes;
alter table public.configurations add constraint configurations_sizes
  check (pg_column_size(params) <= 16384 and char_length(name) <= 120 and (owner_email is null or char_length(owner_email) <= 200));
alter table public.configuration_items drop constraint if exists configuration_items_sizes;
alter table public.configuration_items add constraint configuration_items_sizes
  check (char_length(element_group) <= 60 and (profile_code_snapshot is null or char_length(profile_code_snapshot) <= 100));

-- claim_my_leads: lower(email) taraması indeksli
create index if not exists leads_email_lower_unclaimed_idx on public.leads (lower(email)) where user_id is null;

-- ── 5 · Bakım: sel sonrası kalıntılar birikmesin ─────────────────────────────────────────────────────────────────────
create or replace function app_private.run_maintenance() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_started timestamptz := clock_timestamp();
begin
  perform app_private.purge_old_analytics(60);
  delete from app_private.throttle where window_start < now() - interval '1 day';
  delete from public.error_logs where last_seen_at < now() - interval '90 days';
  delete from public.notifications where created_at < now() - interval '90 days';
  delete from public.email_queue where status in ('sent', 'failed') and created_at < now() - interval '90 days';
  insert into public.cron_heartbeats as h (job_key, expected_interval_seconds, last_run_at, last_status, last_duration_ms)
  values ('db.maintenance', 86400, now(), 'ok', (extract(epoch from clock_timestamp() - v_started) * 1000)::int)
  on conflict (job_key) do update
    set last_run_at = excluded.last_run_at, last_status = 'ok', last_error = null, last_duration_ms = excluded.last_duration_ms;
end $$;
revoke execute on function app_private.run_maintenance() from public, anon, authenticated;

-- ── 6 · Bundan sonra oluşturulan fonksiyonlar varsayılan olarak anon/authenticated'a AÇILMAZ ─────────────────────────
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
