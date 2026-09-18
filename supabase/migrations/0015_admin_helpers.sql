-- 0015 · Admin çatısı yardımcıları (Faz 5)
--
-- reorder_menu_items: sürükle-bırak / yukarı-aşağı sıralama TEK ifadede yazılır. Tekillik kısıtı ertelenebilir
-- olsa da iki ayrı UPDATE otomatik commit'te çakışırdı; tek UPDATE ... FROM unnest(...) ile ara durum oluşmaz.
-- security INVOKER: çağıranın RLS'i geçerli (menu_items yazma yalnız super_admin/admin).
create function public.reorder_menu_items(p_ids uuid[]) returns integer
language sql volatile set search_path = '' as $$
  with ordered as (
    select id, ordinality::integer as new_order from unnest(p_ids) with ordinality as u(id, ordinality)
  ),
  updated as (
    update public.menu_items m set sort_order = o.new_order
    from ordered o where m.id = o.id and m.sort_order is distinct from o.new_order
    returning 1
  )
  select count(*)::integer from updated
$$;
revoke all on function public.reorder_menu_items(uuid[]) from public;
grant execute on function public.reorder_menu_items(uuid[]) to authenticated;

-- Admin dashboard sayaçları: her tabloyu ayrı ayrı saymak N sorgu; tek RPC, çağıranın RLS'iyle (invoker).
create function public.admin_dashboard_counts() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'media',          (select count(*) from public.media_library),
    'staff',          (select count(*) from public.profiles where role <> 'member' and is_active),
    'members',        (select count(*) from public.profiles where role = 'member'),
    'leads_open',     (select count(*) from public.leads where status in ('new','in_review')),
    'leads_today',    (select count(*) from public.leads where created_at >= date_trunc('day', now())),
    'errors_24h',     (select count(*) from public.error_logs where last_seen_at >= now() - interval '24 hours'),
    'notifications',  (select count(*) from public.notifications where not (auth.uid() = any(read_by)) and (user_id = auth.uid() or target_role = app_private.user_role()))
  )
$$;
revoke all on function public.admin_dashboard_counts() from public;
grant execute on function public.admin_dashboard_counts() to authenticated;
