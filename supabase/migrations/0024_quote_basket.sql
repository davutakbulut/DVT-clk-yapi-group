-- 0024 · Teklif sepeti (Faz 14): submit_lead artık `items` dizisi alır → lead_items anlık görüntülerle (ürün sonradan
-- silinse/yeniden adlansa da talep okunabilir). Miktar ve birim ziyaretçiden; ad/stok kodu veritabanından alınır (sahtecilik yok).
create or replace function public.submit_lead(p jsonb) returns jsonb
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
  v_item jsonb;
  v_product_id uuid;
  v_product_name text;
  v_variant_id uuid;
  v_variant_label text;
  v_variant_code text;
  v_count integer := 0;
begin
  if v_locale not in ('tr','en') then raise exception 'submit_lead: locale' using errcode = '22023'; end if;
  if v_source not in ('contact_form','quote_form','quote_basket','configurator','whatsapp') then raise exception 'submit_lead: source' using errcode = '22023'; end if;
  if v_name is null or length(v_name) < 2 then raise exception 'submit_lead: full_name' using errcode = '22023'; end if;
  if v_email is null and v_phone is null then raise exception 'submit_lead: contact' using errcode = '22023'; end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'submit_lead: email' using errcode = '22023'; end if;
  if coalesce((p->>'consent_kvkk')::boolean, false) is not true then raise exception 'submit_lead: consent' using errcode = '22023'; end if;
  if jsonb_typeof(p->'items') = 'array' and jsonb_array_length(p->'items') > 50 then raise exception 'submit_lead: items' using errcode = '22023'; end if;
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

  -- Sepet kalemleri: yalnız yayındaki ürünler; ad ve stok kodu DB'den anlık görüntü
  if jsonb_typeof(p->'items') = 'array' then
    for v_item in select * from jsonb_array_elements(p->'items') loop
      v_product_id := null; v_product_name := null; v_variant_id := null; v_variant_label := null; v_variant_code := null;
      select pr.id, pr.name->>v_locale into v_product_id, v_product_name from public.products pr
       where pr.id = nullif(v_item->>'product_id', '')::uuid and pr.status = 'published' and v_locale = any(pr.published_locales);
      if v_product_id is null then continue; end if;
      if nullif(v_item->>'variant_id', '') is not null then
        select pv.id, pv.size_label, pv.stock_code into v_variant_id, v_variant_label, v_variant_code from public.product_variants pv where pv.id = (v_item->>'variant_id')::uuid and pv.product_id = v_product_id;
      end if;
      v_count := v_count + 1;
      insert into public.lead_items (lead_id, product_id, variant_id, product_name_snapshot, variant_label_snapshot, stock_code_snapshot, quantity, unit, note, sort_order)
      values (v_id, v_product_id, v_variant_id, coalesce(v_product_name, ''), v_variant_label, v_variant_code,
              greatest(coalesce(nullif(v_item->>'quantity', '')::numeric, 1), 0.001), nullif(btrim(v_item->>'unit'), ''), nullif(btrim(v_item->>'note'), ''), v_count);
    end loop;
  end if;

  if v_email is not null then
    insert into public.email_queue (template_key, to_email, to_name, locale, payload, priority, related_type, related_id)
    values ('lead.received.customer', v_email, v_name, v_locale,
            jsonb_build_object('ref_no', v_ref, 'full_name', v_name, 'service', coalesce(v_service_title, ''), 'message', coalesce(p->>'message', '')), 3, 'lead', v_id);
  end if;
  if v_company_to is not null then
    insert into public.email_queue (template_key, to_email, locale, payload, priority, related_type, related_id)
    values ('lead.received.company', v_company_to, 'tr',
            jsonb_build_object('ref_no', v_ref, 'full_name', v_name, 'email', coalesce(v_email, ''), 'phone', coalesce(v_phone, ''), 'company', coalesce(p->>'company', ''),
                               'service', coalesce(v_service_title, ''), 'message', coalesce(p->>'message', '') || case when v_count > 0 then E'\n\n' || v_count::text || ' kalem' else '' end,
                               'admin_path', '/admin/leads/' || v_id::text), 2, 'lead', v_id);
  end if;
  insert into public.notifications (target_role, type, payload, link_path)
  select r, 'lead.created', jsonb_build_object('ref_no', v_ref, 'full_name', v_name, 'source', v_source, 'items', v_count), '/admin/leads/' || v_id::text
    from unnest(array['sales','admin']) r;

  return jsonb_build_object('id', v_id, 'ref_no', v_ref, 'items', v_count);
end $$;
