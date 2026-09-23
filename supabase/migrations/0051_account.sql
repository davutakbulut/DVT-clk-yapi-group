-- 0051 · Hesabım (K-103): müşteri mesajı/revizyon isteği, talepleri devralma, firma bilgisi, kayıtlı sepet, hesap silme.
alter table public.lead_replies add column if not exists direction text not null default 'outbound' check (direction in ('outbound','inbound'));
alter table public.lead_replies add column if not exists kind text not null default 'reply' check (kind in ('reply','revision_request','cancel_request'));
alter table public.profiles add column if not exists saved_basket jsonb not null default '[]'::jsonb check (jsonb_typeof(saved_basket) = 'array');

-- Üye kendi talebine mesaj yazar (inbound); satış/admin rolüne bildirim, şirkete e-posta
create or replace function public.customer_lead_message(p_lead_id uuid, p_kind text, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_lead public.leads%rowtype; v_id uuid; v_to text;
begin
  if v_uid is null then raise exception 'customer_lead_message: auth' using errcode = '42501'; end if;
  if p_kind not in ('reply','revision_request','cancel_request') then raise exception 'customer_lead_message: kind' using errcode = '22023'; end if;
  if length(btrim(coalesce(p_body, ''))) < 3 or length(p_body) > 4000 then raise exception 'customer_lead_message: body' using errcode = '22023'; end if;
  select * into v_lead from public.leads l where l.id = p_lead_id and l.user_id = v_uid;
  if v_lead.id is null then raise exception 'customer_lead_message: lead' using errcode = '42501'; end if;
  insert into public.lead_replies (lead_id, author_id, subject, body, direction, kind, sent_at)
  values (p_lead_id, v_uid, case p_kind when 'revision_request' then 'Revizyon isteği' when 'cancel_request' then 'İptal isteği' else 'Müşteri mesajı' end, btrim(p_body), 'inbound', p_kind, now())
  returning id into v_id;
  insert into public.notifications (target_role, type, payload, link_path)
  values ('sales', 'lead.customer_message', jsonb_build_object('ref_no', v_lead.ref_no, 'kind', p_kind, 'lead_id', p_lead_id), '/admin/leads/' || p_lead_id::text);
  if p_kind = 'cancel_request' and v_lead.status in ('new','in_review') then update public.leads set status = 'lost', lost_reason = 'customer_cancel', updated_at = now() where id = p_lead_id; end if;
  v_to := nullif(btrim((select s.value #>> '{}' from public.site_settings s where s.key = 'contact.email')), '');
  if v_to is not null then
    insert into public.email_queue (template_key, to_email, locale, payload, priority, related_type, related_id)
    values ('lead.received.company', v_to, 'tr', jsonb_build_object('ref_no', v_lead.ref_no, 'full_name', coalesce(v_lead.full_name, ''), 'email', coalesce(v_lead.email, ''), 'phone', coalesce(v_lead.phone, ''), 'company', coalesce(v_lead.company, ''), 'service', '', 'message', '[' || p_kind || '] ' || btrim(p_body)), 3, 'lead', p_lead_id);
  end if;
  return v_id;
end $$;
grant execute on function public.customer_lead_message(uuid, text, text) to authenticated;

-- Aynı e-postayla verilmiş anonim talepler üyeye bağlanır (e-posta doğrulanmış oturum)
create or replace function public.claim_my_leads() returns integer
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_email text; v_n integer;
begin
  if v_uid is null then return 0; end if;
  select lower(u.email) into v_email from auth.users u where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is null then return 0; end if;
  update public.leads set user_id = v_uid where user_id is null and lower(email) = v_email;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
grant execute on function public.claim_my_leads() to authenticated;

-- Firma bilgisi: üyenin kendi customers satırı (profile_id)
create or replace function public.upsert_my_customer(p jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'upsert_my_customer: auth' using errcode = '42501'; end if;
  select id into v_id from public.customers where profile_id = v_uid limit 1;
  if v_id is null then
    insert into public.customers (type, full_name, company_title, tax_office, tax_id, address, city, district, email, phone, source, profile_id)
    values (coalesce(nullif(p->>'type',''), 'corporate'), nullif(p->>'full_name',''), nullif(p->>'company_title',''), nullif(p->>'tax_office',''), nullif(p->>'tax_id',''), nullif(p->>'address',''), nullif(p->>'city',''), nullif(p->>'district',''), (select email from auth.users where id = v_uid), nullif(p->>'phone',''), 'lead', v_uid)
    returning id into v_id;
  else
    update public.customers set type = coalesce(nullif(p->>'type',''), type), full_name = nullif(p->>'full_name',''), company_title = nullif(p->>'company_title',''), tax_office = nullif(p->>'tax_office',''), tax_id = nullif(p->>'tax_id',''), address = nullif(p->>'address',''), city = nullif(p->>'city',''), district = nullif(p->>'district',''), phone = nullif(p->>'phone',''), updated_at = now() where id = v_id;
  end if;
  return v_id;
end $$;
grant execute on function public.upsert_my_customer(jsonb) to authenticated;
create or replace function public.get_my_customer() returns jsonb
language sql security definer stable set search_path = '' as $$
  select to_jsonb(c) - 'notes' from public.customers c where c.profile_id = auth.uid() limit 1;
$$;
grant execute on function public.get_my_customer() to authenticated;

-- Hesap silme (KVKK): auth.users satırı silinir → profil cascade; talepler user_id null (FK set null); konfigürasyonlar cascade
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'delete_my_account: auth' using errcode = '42501'; end if;
  if exists (select 1 from public.profiles p where p.id = v_uid and p.role <> 'member') then raise exception 'delete_my_account: staff' using errcode = '42501'; end if;
  update public.customers set profile_id = null where profile_id = v_uid;
  delete from auth.users where id = v_uid;
end $$;
grant execute on function public.delete_my_account() to authenticated;
