-- 0031 · create_sale_from_lead: güvenilir bağlam (service-role / migration) da çağırabilir — diğer definer fonksiyonlarla tutarlı.
create or replace function public.create_sale_from_lead(p_lead_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_customer uuid;
  v_sale uuid;
  v_uid uuid := auth.uid();
begin
  if not (app_private.is_trusted_context() or app_private.has_role('super_admin', 'admin', 'sales')) then
    raise exception 'create_sale_from_lead: yetki yok' using errcode = '42501';
  end if;
  select s.id into v_sale from public.sales s where s.lead_id = p_lead_id and s.status <> 'cancelled' limit 1;
  if v_sale is not null then return v_sale; end if;
  v_customer := public.create_customer_from_lead(p_lead_id);
  insert into public.sales (customer_id, lead_id, assigned_to, created_by, notes)
  values (v_customer, p_lead_id, v_uid, v_uid, (select 'Talep ' || l.ref_no from public.leads l where l.id = p_lead_id))
  returning id into v_sale;
  insert into public.sale_items (sale_id, product_id, description, quantity, unit, unit_price, line_total, sort_order)
  select v_sale, li.product_id,
         li.product_name_snapshot || coalesce(' · ' || li.variant_label_snapshot, ''),
         li.quantity, coalesce(li.unit, 'adet'), 0, 0, li.sort_order
    from public.lead_items li where li.lead_id = p_lead_id;
  update public.leads set status = 'won' where id = p_lead_id and status in ('new', 'in_review', 'quoted');
  return v_sale;
end $$;
