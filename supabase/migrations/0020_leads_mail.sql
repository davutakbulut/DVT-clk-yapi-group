-- 0020 · Talep + mail kuyruğu (Faz 10).
-- leads/email_queue/notifications'a anonim doğrudan YAZAMAZ (0006/0009). Form gönderimi güvenilir bağlamdan geçer:
-- security definer RPC tek transaction'da talep + müşteri/firma maili kuyruğu + rol bildirimi yazar (07-MAIL).
-- Kuyruğu işleyen cron (app/api/cron/mail) service-role ile çalışır; bu kararın sınırı K-56'da.

create function public.submit_lead(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_ref text;
  v_locale text := coalesce(p->>'locale', 'tr');
  v_source text := coalesce(p->>'source', 'contact_form');
  v_email text := nullif(lower(btrim(p->>'email')), '');
  v_phone text := nullif(btrim(p->>'phone'), '');
  v_name text := nullif(btrim(p->>'full_name'), '');
  v_company_to text := nullif(btrim((select s.value #>> '{}' from public.site_settings s where s.key = 'contact.email')), '');
  v_service uuid := nullif(p->>'service_id', '')::uuid;
  v_service_title text;
begin
  if v_locale not in ('tr','en') then raise exception 'submit_lead: locale' using errcode = '22023'; end if;
  if v_source not in ('contact_form','quote_form','quote_basket','configurator','whatsapp') then raise exception 'submit_lead: source' using errcode = '22023'; end if;
  if v_name is null or length(v_name) < 2 then raise exception 'submit_lead: full_name' using errcode = '22023'; end if;
  if v_email is null and v_phone is null then raise exception 'submit_lead: contact' using errcode = '22023'; end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'submit_lead: email' using errcode = '22023'; end if;
  if coalesce((p->>'consent_kvkk')::boolean, false) is not true then raise exception 'submit_lead: consent' using errcode = '22023'; end if;
  if v_service is not null then
    select s.title->>v_locale into v_service_title from public.services s where s.id = v_service;
    if v_service_title is null then v_service := null; end if;
  end if;

  insert into public.leads (source, full_name, company, email, phone, city, subject, message, form_data, service_id, locale, user_id,
                            consent_kvkk_at, consent_marketing, utm, page_url, ip_masked)
  values (v_source, v_name, nullif(btrim(p->>'company'), ''), v_email, v_phone, nullif(btrim(p->>'city'), ''), nullif(btrim(p->>'subject'), ''),
          nullif(btrim(p->>'message'), ''), coalesce(p->'form_data', '{}'::jsonb), v_service, v_locale, auth.uid(),
          now(), coalesce((p->>'consent_marketing')::boolean, false), coalesce(p->'utm', '{}'::jsonb), nullif(p->>'page_url', ''), nullif(p->>'ip_masked', ''))
  returning id, ref_no into v_id, v_ref;

  -- Müşteriye "talebiniz alındı" (e-posta varsa), firmaya bildirim maili (ayar doluysa)
  if v_email is not null then
    insert into public.email_queue (template_key, to_email, to_name, locale, payload, priority, related_type, related_id)
    values ('lead.received.customer', v_email, v_name, v_locale,
            jsonb_build_object('ref_no', v_ref, 'full_name', v_name, 'service', coalesce(v_service_title, ''), 'message', coalesce(p->>'message', '')), 3, 'lead', v_id);
  end if;
  if v_company_to is not null then
    insert into public.email_queue (template_key, to_email, locale, payload, priority, related_type, related_id)
    values ('lead.received.company', v_company_to, 'tr',
            jsonb_build_object('ref_no', v_ref, 'full_name', v_name, 'email', coalesce(v_email, ''), 'phone', coalesce(v_phone, ''), 'company', coalesce(p->>'company', ''),
                               'service', coalesce(v_service_title, ''), 'message', coalesce(p->>'message', ''), 'admin_path', '/admin/leads/' || v_id::text), 2, 'lead', v_id);
  end if;
  insert into public.notifications (target_role, type, payload, link_path)
  select r, 'lead.created', jsonb_build_object('ref_no', v_ref, 'full_name', v_name, 'source', v_source), '/admin/leads/' || v_id::text
    from unnest(array['sales','admin']) r;

  return jsonb_build_object('id', v_id, 'ref_no', v_ref);
end $$;
revoke all on function public.submit_lead(jsonb) from public;
grant execute on function public.submit_lead(jsonb) to anon, authenticated;

-- Talebe cevap: personel yazar, müşteriye mail kuyruğa girer (lead_replies.email_log_id cron'da doldurulur).
create function public.reply_lead(p_lead_id uuid, p_subject text, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_reply uuid;
  v_email text;
  v_name text;
  v_locale text;
  v_ref text;
begin
  if not app_private.has_role('super_admin','admin','sales') then raise exception 'reply_lead: yetki yok' using errcode = '42501'; end if;
  if length(btrim(p_subject)) < 2 or length(btrim(p_body)) < 2 then raise exception 'reply_lead: bos' using errcode = '22023'; end if;
  select email, full_name, locale, ref_no into v_email, v_name, v_locale, v_ref from public.leads where id = p_lead_id;
  if v_email is null then raise exception 'reply_lead: e-posta yok' using errcode = '22023'; end if;
  insert into public.lead_replies (lead_id, author_id, subject, body) values (p_lead_id, auth.uid(), btrim(p_subject), btrim(p_body)) returning id into v_reply;
  insert into public.email_queue (template_key, to_email, to_name, locale, payload, priority, related_type, related_id)
  values ('lead.reply.customer', v_email, v_name, v_locale, jsonb_build_object('ref_no', v_ref, 'full_name', v_name, 'subject', btrim(p_subject), 'body', btrim(p_body), 'reply_id', v_reply), 2, 'lead_reply', v_reply);
  update public.leads set status = 'in_review' where id = p_lead_id and status = 'new';
  return v_reply;
end $$;
revoke all on function public.reply_lead(uuid, text, text) from public;
grant execute on function public.reply_lead(uuid, text, text) to authenticated;

-- Test gönderimi: personel kendi adresine şablonu kuyruğa atar (payload örnek değerlerle).
create function public.enqueue_test_email(p_template_key text, p_locale text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_email text;
begin
  if not app_private.has_role('super_admin','admin') then raise exception 'enqueue_test_email: yetki yok' using errcode = '42501'; end if;
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then raise exception 'enqueue_test_email: e-posta yok' using errcode = '22023'; end if;
  insert into public.email_queue (template_key, to_email, locale, payload, priority, related_type)
  values (p_template_key, v_email, coalesce(p_locale, 'tr'),
          jsonb_build_object('ref_no', 'TLP-TEST-0001', 'full_name', 'Test Kullanıcı', 'service', 'Test hizmeti', 'message', 'Bu bir test gönderimidir.', 'email', v_email, 'phone', '', 'company', '', 'subject', 'Test', 'body', 'Test gövdesi', 'admin_path', '/admin'), 1, 'test')
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.enqueue_test_email(text, text) from public;
grant execute on function public.enqueue_test_email(text, text) to authenticated;

-- Şablonlar (yalnız yoksa). {{degisken}} biçimi; otomatik çeviri YOK (hukuki/ticari metin).
insert into public.email_templates (key, name, subject, body, variables)
select * from (values
  ('lead.received.customer', 'Talep alındı (müşteri)',
   '{"tr": "Talebiniz alındı — {{ref_no}}", "en": "We received your request — {{ref_no}}"}'::jsonb,
   '{"tr": "Sayın {{full_name}},\n\n{{ref_no}} numaralı talebiniz bize ulaştı. {{service}} konusundaki mesajınızı inceleyip en kısa sürede size dönüş yapacağız.\n\nMesajınız:\n{{message}}\n\nSaygılarımızla,\nCLK Yapı Group", "en": "Dear {{full_name}},\n\nWe have received your request {{ref_no}}. We will review your message about {{service}} and get back to you shortly.\n\nYour message:\n{{message}}\n\nKind regards,\nCLK Yapı Group"}'::jsonb,
   '["ref_no","full_name","service","message"]'::jsonb),
  ('lead.received.company', 'Yeni talep (firma)',
   '{"tr": "Yeni talep: {{ref_no}} — {{full_name}}"}'::jsonb,
   '{"tr": "Yeni bir talep geldi.\n\nRef: {{ref_no}}\nAd: {{full_name}}\nFirma: {{company}}\nE-posta: {{email}}\nTelefon: {{phone}}\nHizmet: {{service}}\n\nMesaj:\n{{message}}\n\nPanel: {{site_url}}{{admin_path}}"}'::jsonb,
   '["ref_no","full_name","company","email","phone","service","message","admin_path","site_url"]'::jsonb),
  ('lead.reply.customer', 'Talep cevabı (müşteri)',
   '{"tr": "{{subject}} — {{ref_no}}", "en": "{{subject}} — {{ref_no}}"}'::jsonb,
   '{"tr": "Sayın {{full_name}},\n\n{{body}}\n\nSaygılarımızla,\nCLK Yapı Group", "en": "Dear {{full_name}},\n\n{{body}}\n\nKind regards,\nCLK Yapı Group"}'::jsonb,
   '["ref_no","full_name","subject","body"]'::jsonb)
) as v(key, name, subject, body, variables)
where not exists (select 1 from public.email_templates where key = v.key);

insert into public.cron_heartbeats (job_key, expected_interval_seconds)
values ('mail_queue', 120)
on conflict (job_key) do nothing;
