-- 0030 · Satış & Maliyet (Faz 20): TCMB kur tablosu (K-32), talep → satış RPC'si, heartbeat.
-- sales / sale_items / sale_expenses ve maliyetsiz görünümler 0007'de (K-33: maliyet RLS seviyesinde gizli).

-- Günlük kur: cron TCMB'den çeker (service-role); admin elle de girebilir. Satış kaydı işlem tarihindeki kuru kopyalar (K-32).
create table public.exchange_rates (
  id         uuid primary key default gen_random_uuid(),
  currency   text not null check (currency in ('USD','EUR')),
  rate_date  date not null,
  rate       numeric(14,6) not null check (rate > 0),          -- 1 birim döviz = rate ₺ (TCMB döviz satış)
  source     text not null default 'tcmb' check (source in ('tcmb','manual')),
  fetched_at timestamptz not null default now(),
  unique (currency, rate_date)
);
create index exchange_rates_latest_idx on public.exchange_rates (currency, rate_date desc);
call app_private.secure('public.exchange_rates');
call app_private.allow_staff_read('public.exchange_rates', 'super_admin', 'admin', 'sales', 'viewer');
call app_private.allow_staff_write('public.exchange_rates', 'super_admin', 'admin');

insert into public.cron_heartbeats (job_key, expected_interval_seconds)
values ('exchange_rates', 172800)
on conflict (job_key) do nothing;

-- Talep tek tıkla satışa dönüşür (05-SALES-FINANCE): müşteri yoksa açılır, taslak satış + talep kalemleri satış kalemi olur (fiyat 0).
-- security DEFINER: sales rolü temel tabloya erişemez (görünüm üzerinden yazar); burada rol açıkça denetlenir ve maliyet kolonu yazılmaz.
create function public.create_sale_from_lead(p_lead_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_customer uuid;
  v_sale uuid;
  v_uid uuid := auth.uid();
begin
  if not app_private.has_role('super_admin', 'admin', 'sales') then raise exception 'create_sale_from_lead: yetki yok' using errcode = '42501'; end if;
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
revoke all on function public.create_sale_from_lead(uuid) from public, anon;
grant execute on function public.create_sale_from_lead(uuid) to authenticated;
