-- 0010 · Analitik (9) — üçüncü parti yok, veri kendi veritabanımızda. K-44: oturum kaydı (replay) YOK.
-- KVKK: IP maskeli, ziyaretçi kimliği geri döndürülemez özet, form alanı İÇERİĞİ asla saklanmaz.
-- Yazma: Faz 23'te toplu insert yapan, bot filtreli security definer RPC ile. Anonime tablo erişimi açılmaz.

create table public.analytics_sessions (
  id              uuid primary key default gen_random_uuid(),
  visitor_hash    text not null,
  started_at      timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  device          text not null check (device in ('mobile','tablet','desktop')),   -- düzen farklı → asla birleştirilmez
  browser         text,
  os              text,
  country         text,
  locale          text check (locale in ('tr','en')),
  referrer_host   text,
  referrer_kind   text not null default 'direct' check (referrer_kind in ('direct','search','social','ai','referral','ads','email')),
  utm             jsonb not null default '{}',
  landing_path    text,
  exit_path       text,
  pageview_count  integer not null default 0,
  ip_masked       text,
  created_at      timestamptz not null default now()
);
create index analytics_sessions_started_idx on public.analytics_sessions (started_at);
create index analytics_sessions_referrer_idx on public.analytics_sessions (referrer_kind, started_at);

create table public.analytics_pageviews (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.analytics_sessions(id) on delete cascade,
  path           text not null,
  locale         text check (locale in ('tr','en')),
  viewed_at      timestamptz not null default now(),
  duration_ms    integer check (duration_ms >= 0),
  max_scroll_pct smallint check (max_scroll_pct between 0 and 100),
  viewport_w     integer,
  viewport_h     integer,
  created_at     timestamptz not null default now()
);
create index analytics_pageviews_path_idx on public.analytics_pageviews (path, viewed_at);
create index analytics_pageviews_viewed_idx on public.analytics_pageviews (viewed_at);
create index analytics_pageviews_session_idx on public.analytics_pageviews (session_id, viewed_at);

create table public.analytics_events (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.analytics_sessions(id) on delete cascade,
  pageview_id  uuid references public.analytics_pageviews(id) on delete cascade,
  type         text not null,                           -- click · rage_click · dead_click · attention · form_focus · form_abandon · conversion…
  path         text not null,
  device       text not null check (device in ('mobile','tablet','desktop')),
  x_pct        numeric(5,2) check (x_pct between 0 and 100),
  y_pct        numeric(5,2) check (y_pct between 0 and 100),   -- SAYFA yüksekliğine göre % (viewport değil): uzun sayfada katlama altı da ölçülür
  selector     text,
  element_text text,
  payload      jsonb not null default '{}',
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index analytics_events_occurred_idx on public.analytics_events (occurred_at);
create index analytics_events_type_path_idx on public.analytics_events (type, path, occurred_at);

-- Gece özetleri: sıcaklık haritası ekranı ham veriye değil BUNA bakar, anında açılır.
create table public.heatmap_aggregates (
  id         uuid primary key default gen_random_uuid(),
  path       text not null,
  device     text not null check (device in ('mobile','tablet','desktop')),
  day        date not null,
  kind       text not null check (kind in ('click','rage_click','dead_click','attention')),
  bucket_x   smallint not null check (bucket_x between 0 and 99),
  bucket_y   integer not null check (bucket_y >= 0),
  hits       integer not null check (hits > 0),
  created_at timestamptz not null default now(),
  unique (path, device, day, kind, bucket_x, bucket_y)
);

create table public.scroll_depth_aggregates (
  id          uuid primary key default gen_random_uuid(),
  path        text not null,
  device      text not null check (device in ('mobile','tablet','desktop')),
  day         date not null,
  views       integer not null default 0,
  reached_25  integer not null default 0,
  reached_50  integer not null default 0,
  reached_75  integer not null default 0,
  reached_100 integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (path, device, day)
);

-- Alan ADI ve davranış; alan İÇERİĞİ yok.
create table public.form_analytics (
  id            uuid primary key default gen_random_uuid(),
  form_key      text not null,
  field_name    text not null,
  device        text not null check (device in ('mobile','tablet','desktop')),
  day           date not null,
  focus_count   integer not null default 0,
  abandon_count integer not null default 0,
  error_count   integer not null default 0,
  total_time_ms bigint not null default 0,
  created_at    timestamptz not null default now(),
  unique (form_key, field_name, device, day)
);

create table public.funnels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
call app_private.track_updated_at('public.funnels');

create table public.funnel_steps (
  id          uuid primary key default gen_random_uuid(),
  funnel_id   uuid not null references public.funnels(id) on delete cascade,
  seq         integer not null check (seq > 0),
  name        text not null,
  match_type  text not null check (match_type in ('path','path_prefix','event')),
  match_value text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (funnel_id, seq) deferrable initially deferred
);
call app_private.track_updated_at('public.funnel_steps');

-- Gerçek kullanıcı ölçümü (RUM)
create table public.web_vitals (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references public.analytics_sessions(id) on delete cascade,
  path        text not null,
  device      text not null check (device in ('mobile','tablet','desktop')),
  metric      text not null check (metric in ('LCP','CLS','INP','TTFB','FCP')),
  value       numeric(12,4) not null check (value >= 0),
  rating      text check (rating in ('good','needs_improvement','poor')),
  recorded_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index web_vitals_path_idx on public.web_vitals (path, metric, recorded_at);
create index web_vitals_recorded_idx on public.web_vitals (recorded_at);

do $$
declare
  v_table text;
begin
  foreach v_table in array array['analytics_sessions','analytics_pageviews','analytics_events','heatmap_aggregates',
                                 'scroll_depth_aggregates','form_analytics','web_vitals'] loop
    call app_private.secure(('public.' || v_table)::regclass);
    call app_private.allow_staff_read(('public.' || v_table)::regclass, 'super_admin', 'admin', 'editor', 'sales', 'viewer');
  end loop;
  foreach v_table in array array['funnels','funnel_steps'] loop
    call app_private.secure(('public.' || v_table)::regclass);
    call app_private.allow_staff_read(('public.' || v_table)::regclass, 'super_admin', 'admin', 'editor', 'sales', 'viewer');
    call app_private.allow_staff_write(('public.' || v_table)::regclass, 'super_admin', 'admin');
  end loop;
end $$;

-- Ham olaylar 60 gün. Özet tabloları kalıcıdır.
create function app_private.purge_old_analytics(p_keep_days integer default 60) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_cutoff timestamptz := now() - make_interval(days => greatest(p_keep_days, 7));
  v_deleted integer;
begin
  delete from public.web_vitals where recorded_at < v_cutoff;
  delete from public.analytics_sessions where started_at < v_cutoff;   -- pageviews + events cascade ile düşer
  get diagnostics v_deleted = row_count;
  return v_deleted;
end $$;
revoke execute on function app_private.purge_old_analytics(integer) from public, anon, authenticated;
