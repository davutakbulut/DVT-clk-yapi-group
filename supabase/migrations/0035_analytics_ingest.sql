-- 0035 · İzleyici altyapısı (Faz 23, 06-ANALYTICS): toplu olay yazan security definer RPC, gece özeti, purge sarmalayıcısı,
-- üçüncü parti script ayarı (K-39). Anonime tablo erişimi yok; ziyaretçi kimliği tuzlu md5 ile geri döndürülemez; IP maskeli;
-- form alanı içeriği hiç gelmez (yalnız alan adı + davranış).

insert into public.site_settings (key, value, is_public, description)
values ('analytics.config', '{"enabled": true, "sample_rate": 1, "ga4_id": "", "ads_id": "", "meta_pixel_id": ""}', true, 'İzleyici + üçüncü parti script kimlikleri (onaya bağlı, K-39)'),
       ('analytics.salt', '""', false, 'Ziyaretçi özeti tuzu (rastgele; değişirse ziyaretçi sayımı sıfırlanır)')
on conflict (key) do nothing;

-- Tuz boşsa ilk kullanımda üretilir (gen_random_uuid): geri döndürülemezlik için sır olması yeter, gizli tutulur (is_public=false).
create function app_private.analytics_salt() returns text
language plpgsql volatile set search_path = '' as $$
declare
  v text;
begin
  select nullif(value #>> '{}', '') into v from public.site_settings where key = 'analytics.salt';
  if v is null then
    v := gen_random_uuid()::text;
    update public.site_settings set value = to_jsonb(v) where key = 'analytics.salt';
  end if;
  return v;
end $$;

/*
  p: {
    session: { id uuid, visitor text, device, browser, os, locale, referrer_host, referrer_kind, utm {}, landing_path, ip_masked, country },
    pageviews: [{ id uuid, path, locale, viewed_at, duration_ms, max_scroll_pct, viewport_w, viewport_h }]   (≤ 50)
    events:    [{ pageview_id uuid|null, type, path, x_pct, y_pct, selector, element_text, payload {}, occurred_at }] (≤ 200)
    vitals:    [{ path, metric, value, rating }] (≤ 20)
    forms:     [{ form_key, field_name, focus, abandon, error, time_ms }] (≤ 50)
  }
  Oturum yoksa açılır, varsa last_seen_at/exit_path/pageview_count güncellenir. Aynı pageview id iki kez gelirse güncellenir (süre/scroll).
*/
create function public.ingest_analytics(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  s jsonb := p->'session';
  v_sid uuid := nullif(s->>'id', '')::uuid;
  v_device text := s->>'device';
  v_locale text := nullif(s->>'locale', '');
  v_hash text;
  v_pv jsonb;
  v_ev jsonb;
  v_vt jsonb;
  v_fm jsonb;
  v_pv_count integer := 0;
  v_ev_count integer := 0;
  v_exit text;
begin
  if v_sid is null or v_device not in ('mobile','tablet','desktop') then raise exception 'ingest_analytics: session' using errcode = '22023'; end if;
  if coalesce(nullif(s->>'visitor', ''), '') = '' then raise exception 'ingest_analytics: visitor' using errcode = '22023'; end if;
  if v_locale is not null and v_locale not in ('tr','en') then v_locale := null; end if;
  v_hash := md5(app_private.analytics_salt() || ':' || (s->>'visitor'));

  insert into public.analytics_sessions (id, visitor_hash, device, browser, os, country, locale, referrer_host, referrer_kind, utm, landing_path, ip_masked)
  values (v_sid, v_hash, v_device, left(s->>'browser', 60), left(s->>'os', 60), left(s->>'country', 2), v_locale, left(s->>'referrer_host', 200),
          case when s->>'referrer_kind' in ('direct','search','social','ai','referral','ads','email') then s->>'referrer_kind' else 'direct' end,
          coalesce(s->'utm', '{}'::jsonb), left(s->>'landing_path', 500), left(s->>'ip_masked', 64))
  on conflict (id) do update set last_seen_at = now();

  for v_pv in select * from jsonb_array_elements(coalesce(p->'pageviews', '[]'::jsonb)) limit 50 loop
    if nullif(v_pv->>'path', '') is null then continue; end if;
    insert into public.analytics_pageviews (id, session_id, path, locale, viewed_at, duration_ms, max_scroll_pct, viewport_w, viewport_h)
    values (coalesce(nullif(v_pv->>'id', '')::uuid, gen_random_uuid()), v_sid, left(v_pv->>'path', 500),
            case when v_pv->>'locale' in ('tr','en') then v_pv->>'locale' end,
            coalesce((v_pv->>'viewed_at')::timestamptz, now()),
            greatest(0, least(coalesce((v_pv->>'duration_ms')::integer, 0), 86400000)),
            greatest(0, least(coalesce((v_pv->>'max_scroll_pct')::integer, 0), 100)),
            (v_pv->>'viewport_w')::integer, (v_pv->>'viewport_h')::integer)
    on conflict (id) do update
      set duration_ms = greatest(public.analytics_pageviews.duration_ms, excluded.duration_ms),
          max_scroll_pct = greatest(public.analytics_pageviews.max_scroll_pct, excluded.max_scroll_pct);
    v_pv_count := v_pv_count + 1;
    v_exit := left(v_pv->>'path', 500);
  end loop;

  for v_ev in select * from jsonb_array_elements(coalesce(p->'events', '[]'::jsonb)) limit 200 loop
    if nullif(v_ev->>'type', '') is null or nullif(v_ev->>'path', '') is null then continue; end if;
    insert into public.analytics_events (session_id, pageview_id, type, path, device, x_pct, y_pct, selector, element_text, payload, occurred_at)
    values (v_sid,
            (select pv.id from public.analytics_pageviews pv where pv.id = nullif(v_ev->>'pageview_id', '')::uuid and pv.session_id = v_sid),
            left(v_ev->>'type', 40), left(v_ev->>'path', 500), v_device,
            case when (v_ev->>'x_pct') ~ '^\d+(\.\d+)?$' then least((v_ev->>'x_pct')::numeric, 100) end,
            case when (v_ev->>'y_pct') ~ '^\d+(\.\d+)?$' then least((v_ev->>'y_pct')::numeric, 100) end,
            left(v_ev->>'selector', 200), left(v_ev->>'element_text', 80), coalesce(v_ev->'payload', '{}'::jsonb),
            coalesce((v_ev->>'occurred_at')::timestamptz, now()));
    v_ev_count := v_ev_count + 1;
  end loop;

  for v_vt in select * from jsonb_array_elements(coalesce(p->'vitals', '[]'::jsonb)) limit 20 loop
    if v_vt->>'metric' not in ('LCP','CLS','INP','TTFB','FCP') or not ((v_vt->>'value') ~ '^\d+(\.\d+)?$') then continue; end if;
    insert into public.web_vitals (session_id, path, device, metric, value, rating)
    values (v_sid, left(v_vt->>'path', 500), v_device, v_vt->>'metric', (v_vt->>'value')::numeric,
            case when v_vt->>'rating' in ('good','needs_improvement','poor') then v_vt->>'rating' end);
  end loop;

  for v_fm in select * from jsonb_array_elements(coalesce(p->'forms', '[]'::jsonb)) limit 50 loop
    if nullif(v_fm->>'form_key', '') is null or nullif(v_fm->>'field_name', '') is null then continue; end if;
    insert into public.form_analytics (form_key, field_name, device, day, focus_count, abandon_count, error_count, total_time_ms)
    values (left(v_fm->>'form_key', 60), left(v_fm->>'field_name', 60), v_device, current_date,
            greatest(0, coalesce((v_fm->>'focus')::integer, 0)), greatest(0, coalesce((v_fm->>'abandon')::integer, 0)),
            greatest(0, coalesce((v_fm->>'error')::integer, 0)), greatest(0, coalesce((v_fm->>'time_ms')::bigint, 0)))
    on conflict (form_key, field_name, device, day) do update
      set focus_count = public.form_analytics.focus_count + excluded.focus_count,
          abandon_count = public.form_analytics.abandon_count + excluded.abandon_count,
          error_count = public.form_analytics.error_count + excluded.error_count,
          total_time_ms = public.form_analytics.total_time_ms + excluded.total_time_ms;
  end loop;

  update public.analytics_sessions
     set last_seen_at = now(),
         pageview_count = (select count(*) from public.analytics_pageviews pv where pv.session_id = v_sid),
         exit_path = coalesce(v_exit, exit_path)
   where id = v_sid;

  return jsonb_build_object('pageviews', v_pv_count, 'events', v_ev_count);
end $$;
revoke all on function public.ingest_analytics(jsonb) from public;
grant execute on function public.ingest_analytics(jsonb) to anon, authenticated;

-- Gece özeti (06-ANALYTICS): ham olaylar → sıcaklık/scroll özetleri; tekrar çalıştırılabilir (gün bazında sil-yaz).
create function public.aggregate_analytics_day(p_day date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_heat integer;
  v_scroll integer;
begin
  if not app_private.is_trusted_context() and not app_private.has_role('super_admin', 'admin') then
    raise exception 'aggregate_analytics_day: yetki yok' using errcode = '42501';
  end if;
  delete from public.heatmap_aggregates where day = p_day;
  insert into public.heatmap_aggregates (path, device, day, kind, bucket_x, bucket_y, hits)
  select e.path, e.device, p_day, e.type, least(floor(e.x_pct)::int, 99), floor(e.y_pct)::int, count(*)
    from public.analytics_events e
   where e.occurred_at >= p_day and e.occurred_at < p_day + 1
     and e.type in ('click','rage_click','dead_click','attention') and e.x_pct is not null and e.y_pct is not null
   group by e.path, e.device, e.type, least(floor(e.x_pct)::int, 99), floor(e.y_pct)::int;
  get diagnostics v_heat = row_count;

  delete from public.scroll_depth_aggregates where day = p_day;
  insert into public.scroll_depth_aggregates (path, device, day, views, reached_25, reached_50, reached_75, reached_100)
  select pv.path, s.device, p_day, count(*),
         count(*) filter (where pv.max_scroll_pct >= 25), count(*) filter (where pv.max_scroll_pct >= 50),
         count(*) filter (where pv.max_scroll_pct >= 75), count(*) filter (where pv.max_scroll_pct >= 100)
    from public.analytics_pageviews pv join public.analytics_sessions s on s.id = pv.session_id
   where pv.viewed_at >= p_day and pv.viewed_at < p_day + 1
   group by pv.path, s.device;
  get diagnostics v_scroll = row_count;
  return jsonb_build_object('heatmap_rows', v_heat, 'scroll_rows', v_scroll);
end $$;
revoke all on function public.aggregate_analytics_day(date) from public, anon;
grant execute on function public.aggregate_analytics_day(date) to authenticated, service_role;

-- 0010 app_private.purge_old_analytics → service-role için public sarmalayıcı
create function public.purge_old_analytics(p_keep_days integer default 60) returns integer
language sql security definer set search_path = '' as $$
  select app_private.purge_old_analytics(p_keep_days)
$$;
revoke all on function public.purge_old_analytics(integer) from public, anon, authenticated;
grant execute on function public.purge_old_analytics(integer) to service_role;

insert into public.cron_heartbeats (job_key, expected_interval_seconds)
values ('analytics_nightly', 129600)
on conflict (job_key) do nothing;
