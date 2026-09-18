-- 0021 · Kurumsal (Faz 11): iş başvurusu RPC'si (security definer, K-56 deseni), ziyaretçi CV yüklemesi için dar Storage
-- politikası (yalnız private-documents/cv/*, yalnız INSERT — okuma yine staff), başvuru mail şablonları.
-- Ekip, referans logoları, belgeler ve ilanlar gerçek veridir → BOŞ başlar (K-55).

create function public.submit_job_application(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_posting uuid := nullif(p->>'job_posting_id', '')::uuid;
  v_title text;
  v_email text := nullif(lower(btrim(p->>'email')), '');
  v_name text := nullif(btrim(p->>'full_name'), '');
  v_locale text := coalesce(p->>'locale', 'tr');
  v_cv text := nullif(btrim(p->>'cv_path'), '');
  v_company_to text := nullif(btrim((select s.value #>> '{}' from public.site_settings s where s.key = 'contact.email')), '');
begin
  if v_locale not in ('tr','en') then raise exception 'submit_job_application: locale' using errcode = '22023'; end if;
  if v_name is null or length(v_name) < 2 then raise exception 'submit_job_application: full_name' using errcode = '22023'; end if;
  if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'submit_job_application: email' using errcode = '22023'; end if;
  if coalesce((p->>'consent_kvkk')::boolean, false) is not true then raise exception 'submit_job_application: consent' using errcode = '22023'; end if;
  if v_cv is not null and v_cv !~ '^cv/[a-f0-9-]{36}\.(pdf|doc|docx)$' then raise exception 'submit_job_application: cv_path' using errcode = '22023'; end if;
  if v_posting is not null then
    select j.title->>v_locale into v_title from public.job_postings j
     where j.id = v_posting and j.is_open and j.status = 'published' and v_locale = any(j.published_locales)
       and (j.application_deadline is null or j.application_deadline >= current_date);
    if v_title is null then raise exception 'submit_job_application: posting' using errcode = '22023'; end if;
  end if;

  insert into public.job_applications (job_posting_id, full_name, email, phone, cover_letter, cv_path, locale, consent_kvkk_at)
  values (v_posting, v_name, v_email, nullif(btrim(p->>'phone'), ''), nullif(btrim(p->>'cover_letter'), ''), v_cv, v_locale, now())
  returning id into v_id;

  insert into public.email_queue (template_key, to_email, to_name, locale, payload, priority, related_type, related_id)
  values ('application.received.applicant', v_email, v_name, v_locale, jsonb_build_object('full_name', v_name, 'position', coalesce(v_title, '')), 3, 'job_application', v_id);
  if v_company_to is not null then
    insert into public.email_queue (template_key, to_email, locale, payload, priority, related_type, related_id)
    values ('application.received.company', v_company_to, 'tr', jsonb_build_object('full_name', v_name, 'email', v_email, 'position', coalesce(v_title, ''), 'admin_path', '/admin/careers/applications'), 2, 'job_application', v_id);
  end if;
  insert into public.notifications (target_role, type, payload, link_path)
  values ('admin', 'application.created', jsonb_build_object('full_name', v_name, 'position', coalesce(v_title, '')), '/admin/careers/applications');
  return jsonb_build_object('id', v_id);
end $$;
revoke all on function public.submit_job_application(jsonb) from public;
grant execute on function public.submit_job_application(jsonb) to anon, authenticated;

insert into public.email_templates (key, name, subject, body, variables)
select * from (values
  ('application.received.applicant', 'Başvuru alındı (aday)',
   '{"tr": "Başvurunuz alındı", "en": "We received your application"}'::jsonb,
   '{"tr": "Sayın {{full_name}},\n\n{{position}} pozisyonu için başvurunuz bize ulaştı. Değerlendirme sonrası sizinle iletişime geçeceğiz.\n\nSaygılarımızla,\nCLK Yapı Group", "en": "Dear {{full_name}},\n\nWe have received your application for {{position}}. We will contact you after review.\n\nKind regards,\nCLK Yapı Group"}'::jsonb,
   '["full_name","position"]'::jsonb),
  ('application.received.company', 'Yeni başvuru (İK)',
   '{"tr": "Yeni iş başvurusu: {{full_name}} — {{position}}"}'::jsonb,
   '{"tr": "Yeni bir iş başvurusu geldi.\n\nAd: {{full_name}}\nE-posta: {{email}}\nPozisyon: {{position}}\n\nPanel: {{site_url}}{{admin_path}}"}'::jsonb,
   '["full_name","email","position","admin_path","site_url"]'::jsonb)
) as v(key, name, subject, body, variables)
where not exists (select 1 from public.email_templates where key = v.key);

-- Ziyaretçi CV yüklemesi: yalnız INSERT, yalnız cv/ öneki, uuid adı; okuma/silme staff politikalarında kalır (0013).
do $$
begin
  if to_regclass('storage.objects') is null then
    raise notice '0021: storage şeması yok (PGlite) — CV politikası atlandı';
    return;
  end if;
  drop policy if exists "private visitor cv insert" on storage.objects;
  create policy "private visitor cv insert" on storage.objects for insert
    to anon, authenticated with check (bucket_id = 'private-documents' and name ~ '^cv/[a-f0-9-]{36}\.(pdf|doc|docx)$');
end $$;
