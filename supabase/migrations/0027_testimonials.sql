-- 0027 · Müşteri yorumları (Faz 17): ziyaretçi yorumu RPC'si (bekleyen, KVKK onayı), Google Places senkron ayarı,
-- senkron koşuları için admin yazımı, cron heartbeat. Tohum yorum YOK (K-55: sahte yorum yazılmaz).

alter table public.testimonials
  add column consent_kvkk_at timestamptz,
  add column ip_masked text;

-- Google Places Place ID (yorum senkronu). API anahtarı ortam değişkenindedir (GOOGLE_PLACES_API_KEY), veritabanına yazılmaz.
insert into public.site_settings (key, value, is_public, description)
values ('reviews.google_place_id', '""', false, 'Google Places Place ID (yorum senkronu)')
on conflict (key) do nothing;

-- "Şimdi senkronla" panelden (admin) çalışır → koşu kaydını admin de yazabilir; cron service-role ile yazar.
call app_private.allow_staff_write('public.review_sync_runs', 'super_admin', 'admin');

insert into public.cron_heartbeats (job_key, expected_interval_seconds)
values ('review_sync', 129600)
on conflict (job_key) do nothing;

-- Ziyaretçi yorumu: security definer (K-56) — anonim tabloyu görmez; doğrulama + bağlı varlık kontrolü + rol bildirimi tek işlemde.
-- Her yorum 'pending' başlar; yayın kararı insanındır (K-08).
create function public.submit_testimonial(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_name text := nullif(btrim(p->>'author_name'), '');
  v_company text := nullif(btrim(p->>'company'), '');
  v_body text := nullif(btrim(p->>'body'), '');
  v_rating integer := nullif(p->>'rating', '')::integer;
  v_locale text := coalesce(p->>'locale', 'tr');
  v_service uuid := nullif(p->>'service_id', '')::uuid;
  v_project uuid := nullif(p->>'project_id', '')::uuid;
  v_product uuid := nullif(p->>'product_id', '')::uuid;
begin
  if v_locale not in ('tr','en') then raise exception 'submit_testimonial: locale' using errcode = '22023'; end if;
  if v_name is null or length(v_name) < 2 or length(v_name) > 120 then raise exception 'submit_testimonial: author_name' using errcode = '22023'; end if;
  if v_body is null or length(v_body) < 10 or length(v_body) > 2000 then raise exception 'submit_testimonial: body' using errcode = '22023'; end if;
  if v_rating is null or v_rating < 1 or v_rating > 5 then raise exception 'submit_testimonial: rating' using errcode = '22023'; end if;
  if coalesce((p->>'consent_kvkk')::boolean, false) is not true then raise exception 'submit_testimonial: consent' using errcode = '22023'; end if;
  if v_service is not null and not exists (select 1 from public.services s where s.id = v_service and s.status = 'published') then raise exception 'submit_testimonial: service' using errcode = '22023'; end if;
  if v_project is not null and not exists (select 1 from public.projects s where s.id = v_project and s.status = 'published') then raise exception 'submit_testimonial: project' using errcode = '22023'; end if;
  if v_product is not null and not exists (select 1 from public.products s where s.id = v_product and s.status = 'published') then raise exception 'submit_testimonial: product' using errcode = '22023'; end if;

  insert into public.testimonials (source, author_name, company, rating, body, original_locale, service_id, project_id, product_id, reviewed_on, status, consent_kvkk_at, ip_masked)
  values ('visitor', v_name, v_company, v_rating, jsonb_build_object(v_locale, v_body), v_locale, v_service, v_project, v_product, current_date, 'pending', now(), nullif(btrim(p->>'ip_masked'), ''))
  returning id into v_id;

  insert into public.notifications (target_role, type, payload, link_path)
  select r, 'testimonial.pending', jsonb_build_object('author_name', v_name, 'rating', v_rating), '/admin/testimonials?status=pending'
    from unnest(array['editor','admin']) r;

  return jsonb_build_object('id', v_id);
end $$;
revoke all on function public.submit_testimonial(jsonb) from public;
grant execute on function public.submit_testimonial(jsonb) to anon, authenticated;
