-- 0037 · Hata takip + performans izleme (Faz 25, 06-ANALYTICS): parmak izine göre gruplanan hata RPC'si (anonim; istemci + sunucu +
-- 404 + CSP raporu), yeniden açılma, Web Vitals özeti (p75), canlılık uyarısı (heartbeat → bildirim + mail), şablon.

alter table public.cron_heartbeats add column if not exists alerted_at timestamptz;

-- Parmak izi: kaynak | modül | normalize mesaj (sayılar/uuid/hex maskelenir) | stack ilk satırı. Aynı hata 500 kez düşse TEK satır.
create function app_private.error_fingerprint(p_source text, p_module text, p_message text, p_stack text) returns text
language sql immutable as $$
  select md5(coalesce(p_source, '') || '|' || coalesce(p_module, '') || '|' ||
             regexp_replace(regexp_replace(lower(coalesce(p_message, '')), '[0-9a-f]{8}-[0-9a-f-]{27}', '<id>', 'g'), '\d+', '#', 'g') || '|' ||
             coalesce(split_part(coalesce(p_stack, ''), E'\n', 1), ''))
$$;

/*
  p: { source: client|server|edge|cron, module, level: warn|error|fatal, code, message, stack, path, status_code, user_agent, ip_masked,
       visitor (opsiyonel, tuzlanmadan sayım için), context {} }
  Yeni → satır; var → occurrences+1, last_seen_at; çözülmüşse YENİDEN AÇILIR (resolved_at null). affected_users: context.visitors ⊂ 50 kimlik.
*/
create function public.report_error(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_source text := coalesce(nullif(p->>'source', ''), 'client');
  v_module text := left(coalesce(nullif(p->>'module', ''), 'unknown'), 80);
  v_level text := coalesce(nullif(p->>'level', ''), 'error');
  v_message text := left(coalesce(nullif(btrim(p->>'message'), ''), '(mesaj yok)'), 1000);
  v_stack text := left(p->>'stack', 8000);
  v_fp text;
  v_id uuid;
  v_visitor text := left(p->>'visitor', 64);
  v_reopened boolean := false;
  v_visitors jsonb;
begin
  if v_source not in ('client','server','edge','cron') then v_source := 'client'; end if;
  if v_level not in ('warn','error','fatal') then v_level := 'error'; end if;
  v_fp := app_private.error_fingerprint(v_source, v_module, v_message, v_stack);

  select id, (resolved_at is not null), coalesce(context->'visitors', '[]'::jsonb) into v_id, v_reopened, v_visitors from public.error_logs where fingerprint = v_fp;
  if v_id is null then
    insert into public.error_logs (fingerprint, module, source, level, code, message, stack, path, status_code, ip_masked, user_agent, context, occurrences, affected_users)
    values (v_fp, v_module, v_source, v_level, left(p->>'code', 40), v_message, v_stack, left(p->>'path', 500), (p->>'status_code')::integer, left(p->>'ip_masked', 64), left(p->>'user_agent', 300),
            jsonb_build_object('visitors', case when v_visitor is null then '[]'::jsonb else jsonb_build_array(v_visitor) end, 'last', coalesce(p->'context', '{}'::jsonb)),
            1, case when v_visitor is null then 0 else 1 end)
    returning id into v_id;
    return jsonb_build_object('id', v_id, 'new', true);
  end if;

  if v_visitor is not null and not (v_visitors ? v_visitor) and jsonb_array_length(v_visitors) < 50 then v_visitors := v_visitors || to_jsonb(v_visitor); end if;
  update public.error_logs
     set occurrences = occurrences + 1,
         last_seen_at = now(),
         path = coalesce(left(p->>'path', 500), path),
         stack = coalesce(v_stack, stack),
         user_agent = coalesce(left(p->>'user_agent', 300), user_agent),
         context = jsonb_build_object('visitors', v_visitors, 'last', coalesce(p->'context', '{}'::jsonb)),
         affected_users = jsonb_array_length(v_visitors),
         resolved_at = null, resolved_by = null
   where id = v_id;
  return jsonb_build_object('id', v_id, 'new', false, 'reopened', v_reopened);
end $$;
revoke all on function public.report_error(jsonb) from public;
grant execute on function public.report_error(jsonb) to anon, authenticated;

-- Web Vitals özeti (⚡ yavaş sayfalar): sayfa × metrik p75 + derece dağılımı. security INVOKER (web_vitals staff okur).
create function public.web_vitals_summary(p_from date, p_to date) returns table (path text, metric text, samples bigint, p75 numeric, good bigint, needs_improvement bigint, poor bigint)
language sql stable set search_path = '' as $$
  select v.path, v.metric, count(*)::bigint,
         round((percentile_cont(0.75) within group (order by v.value))::numeric, 4),
         count(*) filter (where v.rating = 'good')::bigint,
         count(*) filter (where v.rating = 'needs_improvement')::bigint,
         count(*) filter (where v.rating = 'poor')::bigint
    from public.web_vitals v
   where v.recorded_at >= p_from and v.recorded_at < p_to + 1
   group by v.path, v.metric
$$;
revoke all on function public.web_vitals_summary(date, date) from public, anon;
grant execute on function public.web_vitals_summary(date, date) to authenticated;

-- Canlılık uyarısı maili (personel/ürün sahibi): cron sessizce durursa (06-ANALYTICS "Üretim izleme")
insert into public.email_templates (key, name, subject, body, variables)
select * from (values
  ('system.stale_cron', 'Cron sessiz kaldı (sistem)',
   '{"tr": "Uyarı: {{job_key}} işi beklenen sürede çalışmadı"}'::jsonb,
   '{"tr": "{{job_key}} işi son olarak {{last_run_at}} tarihinde çalıştı; beklenen aralık {{expected}} sn. Son durum: {{status}}.\n\nPanel: {{site_url}}/admin\n\nBu uyarı 6 saatte bir yinelenir."}'::jsonb,
   '["job_key","last_run_at","expected","status","site_url"]'::jsonb)
) as v(key, name, subject, body, variables)
where not exists (select 1 from public.email_templates t where t.key = v.key);

insert into public.cron_heartbeats (job_key, expected_interval_seconds)
values ('heartbeat_monitor', 3600)
on conflict (job_key) do nothing;
