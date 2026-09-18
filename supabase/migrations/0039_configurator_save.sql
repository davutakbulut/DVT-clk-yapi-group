-- 0039 · Konfigüratör kaydetme/paylaşım/teklif (Faz 28): save_configuration (üye ya da anonim e-posta, K-30), sürümler + metraj kalemleri,
-- token ile okuma (kalemler dahil), fiyat paylaşım anahtarı, talebe bağlama (submit_lead configuration_token), e-posta doğrulanınca devralma.
-- Fiyat eşlemesi boş tohumlanır (K-55): malzeme kodları panelden girilir; fiyat uydurulmaz.

insert into public.configurator_rules (key, value, description) values
  ('price_map', '{"steel": "", "roof_panel": "", "wall_panel": "", "bolt": ""}', 'Fiyat kalemi → material_prices.code (boş = fiyat hesaplanmaz)')
on conflict (key) do nothing;

-- Admin silme (arşiv/temizlik); üye kendi kaydını zaten silebilir (own configurations for all).
create policy "admin delete" on public.configurations for delete to authenticated
  using ((select app_private.has_role('super_admin','admin')));

-- ── Kaydet: yeni konfigürasyon ya da var olana yeni sürüm. Sunucu eylemi metrajı kendisi hesaplar; istemci sayısı kabul edilmez.
create function public.save_configuration(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_email text := nullif(lower(btrim(p->>'owner_email')), '');
  v_name text := left(coalesce(nullif(btrim(p->>'name'), ''), ''), 120);
  v_locale text := coalesce(p->>'locale', 'tr');
  v_params jsonb := p->'params';
  v_existing uuid := nullif(p->>'configuration_id', '')::uuid;
  v_token uuid := nullif(p->>'token', '')::uuid;
  v_id uuid;
  v_ref text;
  v_public uuid;
  v_version integer;
  v_version_id uuid;
  v_item jsonb;
  v_i integer := 0;
begin
  if v_locale not in ('tr','en') then raise exception 'save_configuration: locale' using errcode = '22023'; end if;
  if jsonb_typeof(v_params) <> 'object' then raise exception 'save_configuration: params' using errcode = '22023'; end if;
  if v_uid is null then
    if v_email is null or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'save_configuration: email' using errcode = '22023'; end if;
    if coalesce((p->>'consent_kvkk')::boolean, false) is not true then raise exception 'save_configuration: consent' using errcode = '22023'; end if;
  end if;
  if jsonb_typeof(p->'items') = 'array' and jsonb_array_length(p->'items') > 100 then raise exception 'save_configuration: items' using errcode = '22023'; end if;

  if v_existing is not null then
    -- Sahiplik: üye → user_id; anonim → token (bağlantı yetki belgesidir, K-30)
    select c.id, c.ref_code, c.public_token, c.current_version + 1 into v_id, v_ref, v_public, v_version
      from public.configurations c
     where c.id = v_existing
       and ((v_uid is not null and c.user_id = v_uid) or (c.user_id is null and v_token is not null and c.public_token = v_token));
    if v_id is null then raise exception 'save_configuration: forbidden' using errcode = '42501'; end if;
    update public.configurations
       set params = v_params, current_version = v_version, tonnage_kg = nullif(p->>'tonnage_kg', '')::numeric,
           estimated_price = nullif(p->>'estimated_price', '')::numeric, currency = coalesce(nullif(p->>'currency', ''), currency),
           name = case when v_name <> '' then v_name else name end, locale = v_locale
     where id = v_id;
  else
    insert into public.configurations (name, user_id, owner_email, params, tonnage_kg, estimated_price, currency, locale, ip_masked)
    values (v_name, v_uid, case when v_uid is null then v_email end, v_params, nullif(p->>'tonnage_kg', '')::numeric,
            nullif(p->>'estimated_price', '')::numeric, coalesce(nullif(p->>'currency', ''), 'TRY'), v_locale, nullif(p->>'ip_masked', ''))
    returning id, ref_code, public_token, current_version into v_id, v_ref, v_public, v_version;
  end if;

  insert into public.configuration_versions (configuration_id, version, params, tonnage_kg, estimated_price, price_snapshot, note)
  values (v_id, v_version, v_params, nullif(p->>'tonnage_kg', '')::numeric, nullif(p->>'estimated_price', '')::numeric, coalesce(p->'price_snapshot', '{}'::jsonb), nullif(btrim(p->>'note'), ''))
  returning id into v_version_id;

  if jsonb_typeof(p->'items') = 'array' then
    for v_item in select * from jsonb_array_elements(p->'items') loop
      v_i := v_i + 1;
      insert into public.configuration_items (configuration_version_id, element_group, steel_profile_id, profile_code_snapshot, piece_count, total_length_m, total_area_m2, total_weight_kg, line_price, sort_order)
      values (v_version_id, left(coalesce(v_item->>'element_group', 'other'), 40),
              (select sp.id from public.steel_profiles sp where sp.code = v_item->>'profile_code'),
              nullif(v_item->>'profile_code', ''), nullif(v_item->>'piece_count', '')::integer,
              nullif(v_item->>'total_length_m', '')::numeric, nullif(v_item->>'total_area_m2', '')::numeric,
              nullif(v_item->>'total_weight_kg', '')::numeric, nullif(v_item->>'line_price', '')::numeric, v_i);
    end loop;
  end if;

  return jsonb_build_object('id', v_id, 'ref_code', v_ref, 'public_token', v_public, 'version', v_version);
end $$;
revoke all on function public.save_configuration(jsonb) from public;
grant execute on function public.save_configuration(jsonb) to anon, authenticated;

-- ── Token ile okuma: kalemler ve sürüm sayısı dahil; fiyat yalnız share_price ise (K-29)
create or replace function public.get_configuration_by_token(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
           'id', c.id, 'ref_code', c.ref_code, 'name', c.name, 'params', c.params, 'version', c.current_version,
           'tonnage_kg', c.tonnage_kg, 'locale', c.locale, 'updated_at', c.updated_at, 'status', c.status,
           'share_price', c.share_price, 'is_member', c.user_id is not null,
           'estimated_price', case when c.share_price then c.estimated_price end,
           'currency', case when c.share_price then c.currency end,
           'versions', (select count(*) from public.configuration_versions v where v.configuration_id = c.id),
           'items', coalesce((select jsonb_agg(jsonb_build_object('element_group', i.element_group, 'profile_code', i.profile_code_snapshot, 'piece_count', i.piece_count,
                                                                  'total_length_m', i.total_length_m, 'total_area_m2', i.total_area_m2, 'total_weight_kg', i.total_weight_kg) order by i.sort_order)
                              from public.configuration_items i join public.configuration_versions v on v.id = i.configuration_version_id
                             where v.configuration_id = c.id and v.version = c.current_version), '[]'::jsonb))
    from public.configurations c
   where c.public_token = p_token
$$;

-- ── Fiyat paylaşım anahtarı: üye sahibi ya da anonim sahibi (token)
create function public.set_configuration_sharing(p_token uuid, p_share_price boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  update public.configurations c
     set share_price = p_share_price, is_shared = true
   where c.public_token = p_token and (c.user_id = auth.uid() or c.user_id is null);
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;
revoke all on function public.set_configuration_sharing(uuid, boolean) from public;
grant execute on function public.set_configuration_sharing(uuid, boolean) to anon, authenticated;

-- ── E-posta doğrulanınca anonim kayıtlar devralınır (K-30). Doğrulanmamış e-postayla devralma YOK (başkasının e-postasıyla kayıt riski).
create function app_private.claim_configurations(p_user uuid, p_email text) returns void
language sql security definer set search_path = '' as $$
  update public.configurations set user_id = p_user, owner_email = null, claimed_at = now()
   where user_id is null and owner_email = lower(p_email);
$$;
create or replace function app_private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  if new.email_confirmed_at is not null and new.email is not null then perform app_private.claim_configurations(new.id, new.email); end if;
  return new;
end $$;
create function app_private.handle_user_confirmed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null and new.email is not null then
    perform app_private.claim_configurations(new.id, new.email);
  end if;
  return new;
end $$;
create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users
  for each row execute function app_private.handle_user_confirmed();

-- ── submit_lead: configuration_token → leads.configuration_id; konfigürasyon 'converted_to_lead'
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
  v_config uuid;
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
  if nullif(p->>'configuration_token', '') is not null then
    select c.id into v_config from public.configurations c where c.public_token = (p->>'configuration_token')::uuid;
  end if;

  insert into public.leads (source, full_name, company, email, phone, city, subject, message, form_data, service_id, locale, user_id,
                            consent_kvkk_at, consent_marketing, utm, page_url, ip_masked, configuration_id)
  values (v_source, v_name, nullif(btrim(p->>'company'), ''), v_email, v_phone, nullif(btrim(p->>'city'), ''), nullif(btrim(p->>'subject'), ''),
          nullif(btrim(p->>'message'), ''), coalesce(p->'form_data', '{}'::jsonb), v_service, v_locale, auth.uid(),
          now(), coalesce((p->>'consent_marketing')::boolean, false), coalesce(p->'utm', '{}'::jsonb), nullif(p->>'page_url', ''), nullif(p->>'ip_masked', ''), v_config)
  returning id, ref_no into v_id, v_ref;

  if v_config is not null then
    update public.configurations set status = 'converted_to_lead', lead_id = v_id where id = v_config and status = 'saved';
  end if;

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
                               'service', coalesce(v_service_title, ''), 'message', coalesce(p->>'message', '') || case when v_count > 0 then E'\n\n' || v_count::text || ' kalem' else '' end
                               || case when v_config is not null then E'\n\nKonfigürasyon: /admin/configurator/' || v_config::text else '' end,
                               'admin_path', '/admin/leads/' || v_id::text), 2, 'lead', v_id);
  end if;
  insert into public.notifications (target_role, type, payload, link_path)
  select r, 'lead.created', jsonb_build_object('ref_no', v_ref, 'full_name', v_name, 'source', v_source, 'items', v_count), '/admin/leads/' || v_id::text
    from unnest(array['sales','admin']) r;

  return jsonb_build_object('id', v_id, 'ref_no', v_ref, 'items', v_count);
end $$;
