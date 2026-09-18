-- 0029 · Müşteri (CRM, Faz 19): talep → müşteri dönüşümü, KVKK anonimleştirme (K-34), panel sayacı.
-- customers tablosu 0007'de (audited; sales yazar, viewer okur).

-- Talep tek tıkla müşteriye dönüşür (05-SALES-FINANCE): bilgiler otomatik dolar, talep müşteriye bağlanır.
-- security INVOKER: çağıranın RLS'i (sales müşteri yazabilir, talebi güncelleyebilir). Aynı talep ikinci kez → var olan müşteri.
create function public.create_customer_from_lead(p_lead_id uuid) returns uuid
language plpgsql volatile set search_path = '' as $$
declare
  v_lead public.leads%rowtype;
  v_id uuid;
begin
  select * into v_lead from public.leads where id = p_lead_id;
  if not found then raise exception 'create_customer_from_lead: lead' using errcode = '22023'; end if;
  if v_lead.customer_id is not null then return v_lead.customer_id; end if;
  if v_lead.anonymized_at is not null then raise exception 'create_customer_from_lead: anonymized' using errcode = '22023'; end if;

  insert into public.customers (type, full_name, company_title, city, email, phone, contact_person, contact_phone, source, notes)
  values (case when nullif(btrim(v_lead.company), '') is null then 'individual' else 'corporate' end,
          v_lead.full_name, nullif(btrim(v_lead.company), ''), v_lead.city, v_lead.email, v_lead.phone,
          case when nullif(btrim(v_lead.company), '') is null then null else v_lead.full_name end,
          case when nullif(btrim(v_lead.company), '') is null then null else v_lead.phone end,
          'lead', 'Talep ' || v_lead.ref_no)
  returning id into v_id;
  update public.leads set customer_id = v_id where id = p_lead_id;
  return v_id;
end $$;
revoke all on function public.create_customer_from_lead(uuid) from public, anon;
grant execute on function public.create_customer_from_lead(uuid) to authenticated;

-- K-34: "verilerimi silin" → kişisel alanlar maskelenir; ticari kimlik (ünvan, VKN, vergi dairesi) VUK için kalır.
-- Bağlı talepler de maskelenir. Yalnız super_admin/admin; geri alınamaz.
create function public.anonymize_customer(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not app_private.has_role('super_admin', 'admin') then raise exception 'anonymize_customer: yetki yok' using errcode = '42501'; end if;
  update public.customers
     set full_name = case when type = 'individual' then 'Anonim' else null end,
         email = null, phone = null, contact_person = null, contact_phone = null, address = null, district = null, notes = null,
         profile_id = null, is_active = false, anonymized_at = now()
   where id = p_id and anonymized_at is null;
  if not found then raise exception 'anonymize_customer: customer' using errcode = '22023'; end if;
  update public.leads
     set full_name = 'Anonim', company = null, email = null, phone = null, message = null, subject = null, form_data = '{}'::jsonb,
         ip_masked = null, anonymized_at = now()
   where customer_id = p_id and anonymized_at is null;
end $$;
revoke all on function public.anonymize_customer(uuid) from public, anon;
grant execute on function public.anonymize_customer(uuid) to authenticated;

create or replace function public.admin_dashboard_counts() returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'media',          (select count(*) from public.media_library),
    'staff',          (select count(*) from public.profiles where role <> 'member' and is_active),
    'members',        (select count(*) from public.profiles where role = 'member'),
    'leads_open',     (select count(*) from public.leads where status in ('new','in_review')),
    'leads_today',    (select count(*) from public.leads where created_at >= date_trunc('day', now())),
    'customers',      (select count(*) from public.customers where is_active),
    'errors_24h',     (select count(*) from public.error_logs where last_seen_at >= now() - interval '24 hours'),
    'notifications',  (select count(*) from public.notifications where not (auth.uid() = any(read_by)) and (user_id = auth.uid() or target_role = app_private.user_role()))
  )
$$;
