-- 0036 · Dönüşüm hunisi değerlendirmesi (Faz 24, 06-ANALYTICS): admin'den tanımlanan adımlar (path / path_prefix / event)
-- SIRALI olarak değerlendirilir — bir oturum i. adıma, (i-1). adımdan SONRA eşleşen bir olay/pageview varsa ulaşmış sayılır.
-- security INVOKER: funnels + analitik tabloları staff okur; anonim çağıramaz.

create function public.evaluate_funnel(p_funnel_id uuid, p_from date, p_to date) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare
  v_step record;
  v_prev_ok boolean := false;
  v_result jsonb := '[]'::jsonb;
  v_count integer;
  v_total integer := 0;
begin
  create temp table if not exists _funnel_reach (session_id uuid, reached_at timestamptz) on commit drop;
  delete from _funnel_reach;
  for v_step in select * from public.funnel_steps where funnel_id = p_funnel_id order by seq loop
    create temp table _funnel_next on commit drop as
    with hits as (
      select pv.session_id, pv.viewed_at as ts
        from public.analytics_pageviews pv
       where v_step.match_type in ('path', 'path_prefix')
         and pv.viewed_at >= p_from and pv.viewed_at < p_to + 1
         and ((v_step.match_type = 'path' and pv.path = v_step.match_value)
           or (v_step.match_type = 'path_prefix' and pv.path like v_step.match_value || '%'))
      union all
      select e.session_id, e.occurred_at
        from public.analytics_events e
       where v_step.match_type = 'event'
         and e.occurred_at >= p_from and e.occurred_at < p_to + 1
         and (e.type = v_step.match_value or (e.type = 'conversion' and e.payload->>'form' = v_step.match_value))
    )
    select h.session_id, min(h.ts) as reached_at
      from hits h
      left join _funnel_reach r on r.session_id = h.session_id
     where (not v_prev_ok) or (r.session_id is not null and h.ts > r.reached_at)
     group by h.session_id;
    delete from _funnel_reach;
    insert into _funnel_reach select * from _funnel_next;
    drop table _funnel_next;
    select count(*) into v_count from _funnel_reach;
    if not v_prev_ok then v_total := v_count; end if;
    v_result := v_result || jsonb_build_object('seq', v_step.seq, 'name', v_step.name, 'sessions', v_count,
                                               'rate_pct', case when v_total > 0 then round(v_count::numeric * 100 / v_total, 1) else 0 end);
    v_prev_ok := true;
  end loop;
  return jsonb_build_object('steps', v_result, 'entered', v_total);
end $$;
revoke all on function public.evaluate_funnel(uuid, date, date) from public, anon;
grant execute on function public.evaluate_funnel(uuid, date, date) to authenticated;
