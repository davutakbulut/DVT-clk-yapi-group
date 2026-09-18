-- 0034 · Fatura & Tahsilat (Faz 21): proforma numarası, tahsilat → hakediş/fatura durumu, hatırlatma şablonu, panel sayacı.
-- invoices / payment_schedules / payments tabloları 0007'de (staff okur, yalnız admin yazar; audited). Tevkifat K-31.

-- Proforma numarasını biz veririz (PRF-2026-0007); e-Fatura/e-Arşiv numarasını dış sistem verir (kesilene kadar boş).
create function app_private.assign_proforma_no() returns trigger
language plpgsql as $$
begin
  if new.type = 'proforma' and (new.invoice_no is null or new.invoice_no = '') then
    new.invoice_no := app_private.next_document_no('PRF', coalesce(new.issue_date, current_date));
  end if;
  return new;
end $$;
create trigger invoices_assign_proforma_no before insert on public.invoices
  for each row execute function app_private.assign_proforma_no();

-- Tahsilat kaydedilince türetilen durumlar: hakediş (bağlı tahsilat toplamı ≥ tutar → paid, > 0 → partially_paid, yoksa pending)
-- ve fatura (issued/sent/… → tahsil edilecek tutara göre paid / partially_paid). "Vadesi geçti" saklanmaz, türetilir (0007).
-- security INVOKER: yalnız yazma yetkisi olan (admin) etkili biçimde çalıştırır; sales/viewer için UPDATE 0 satır etkiler.
create function public.recalc_sale_payments(p_sale_id uuid) returns void
language plpgsql volatile set search_path = '' as $$
begin
  update public.payment_schedules s
     set status = case
           when s.status = 'cancelled' then 'cancelled'
           when coalesce(p.total, 0) >= s.amount then 'paid'
           when coalesce(p.total, 0) > 0 then 'partially_paid'
           else 'pending' end
    from (select sc.id, (select sum(pm.amount_try) from public.payments pm where pm.schedule_id = sc.id) as total
            from public.payment_schedules sc where sc.sale_id = p_sale_id) p
   where s.id = p.id and s.sale_id = p_sale_id;

  update public.invoices i
     set status = case
           when i.status in ('not_issued', 'cancelled') then i.status
           when coalesce(p.total, 0) >= i.collectable_amount then 'paid'
           when coalesce(p.total, 0) > 0 then 'partially_paid'
           when i.status in ('paid', 'partially_paid') then 'sent'
           else i.status end
    from (select iv.id, (select sum(pm.amount) from public.payments pm where pm.invoice_id = iv.id) as total
            from public.invoices iv where iv.sale_id = p_sale_id) p
   where i.id = p.id and i.sale_id = p_sale_id;
end $$;
revoke all on function public.recalc_sale_payments(uuid) from public, anon;
grant execute on function public.recalc_sale_payments(uuid) to authenticated;

-- Vadesi yaklaşan/geçen hakediş hatırlatması (05-SALES-FINANCE): sorumlu personele mail; cron günde bir.
insert into public.email_templates (key, name, subject, body, variables)
select * from (values
  ('payment.reminder', 'Hakediş hatırlatması (personel)',
   '{"tr": "Hakediş hatırlatması: {{sale_no}} — {{customer}} ({{due_date}})"}'::jsonb,
   '{"tr": "{{sale_no}} numaralı satışın {{description}} hakedişi {{due_date}} vadeli.\n\nMüşteri: {{customer}}\nTutar: {{amount}}\nDurum: {{status}}\n\nPanel: {{site_url}}{{admin_path}}"}'::jsonb,
   '["sale_no","customer","description","due_date","amount","status","admin_path","site_url"]'::jsonb)
) as v(key, name, subject, body, variables)
where not exists (select 1 from public.email_templates t where t.key = v.key);

insert into public.cron_heartbeats (job_key, expected_interval_seconds)
values ('payment_reminders', 129600)
on conflict (job_key) do nothing;

create or replace function public.admin_dashboard_counts() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'media',             (select count(*) from public.media_library),
    'staff',             (select count(*) from public.profiles where role <> 'member' and is_active),
    'members',           (select count(*) from public.profiles where role = 'member'),
    'leads_open',        (select count(*) from public.leads where status in ('new','in_review')),
    'leads_today',       (select count(*) from public.leads where created_at >= date_trunc('day', now())),
    'customers',         (select count(*) from public.customers where is_active),
    'overdue_schedules', (select count(*) from public.payment_schedules where status in ('pending','partially_paid') and due_date < current_date),
    'pending_reviews',   (select count(*) from public.testimonials where status = 'pending'),
    'errors_24h',        (select count(*) from public.error_logs where last_seen_at >= now() - interval '24 hours'),
    'notifications',     (select count(*) from public.notifications where not (auth.uid() = any(read_by)) and (user_id = auth.uid() or target_role = app_private.user_role()))
  )
$$;
