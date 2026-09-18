-- 0040 · Konfigürasyon → satış (Faz 29): talebi olan konfigürasyon, create_sale_from_lead ile müşteri+satış açar, güncel sürümün
-- metraj kalemleri satış kalemi olur (birim fiyat 0: satışçı doldurur; fiyat anlık görüntüsü notta). Talebi olmayan kayıt dönüştürülemez (müşteri kimliği yok).
create function public.create_sale_from_configuration(p_configuration_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_sale uuid;
  v_lead uuid;
  v_ref text;
  v_version integer;
  v_price numeric;
  v_currency text;
  v_n integer := 0;
begin
  if not app_private.has_role('super_admin', 'admin', 'sales') then raise exception 'create_sale_from_configuration: yetki yok' using errcode = '42501'; end if;
  select c.sale_id, c.lead_id, c.ref_code, c.current_version, c.estimated_price, c.currency into v_sale, v_lead, v_ref, v_version, v_price, v_currency
    from public.configurations c where c.id = p_configuration_id;
  if v_ref is null then raise exception 'create_sale_from_configuration: yok' using errcode = '22023'; end if;
  if v_sale is not null then return v_sale; end if;
  if v_lead is null then raise exception 'create_sale_from_configuration: talep yok' using errcode = '22023'; end if;
  v_sale := public.create_sale_from_lead(v_lead);
  select coalesce(max(si.sort_order), 0) into v_n from public.sale_items si where si.sale_id = v_sale;
  insert into public.sale_items (sale_id, description, quantity, unit, unit_price, line_total, sort_order)
  select v_sale,
         'Konfig ' || v_ref || ' v' || v_version::text || ' · ' || i.element_group || coalesce(' · ' || i.profile_code_snapshot, ''),
         greatest(coalesce(i.total_weight_kg, i.total_area_m2, i.total_length_m, i.piece_count::numeric), 0.001),
         case when i.total_weight_kg is not null then 'kg' when i.total_area_m2 is not null then 'm2' when i.total_length_m is not null then 'm' else 'adet' end,
         0, 0, v_n + i.sort_order
    from public.configuration_items i join public.configuration_versions v on v.id = i.configuration_version_id
   where v.configuration_id = p_configuration_id and v.version = v_version;
  update public.sales set configuration_id = p_configuration_id,
         notes = coalesce(notes, '') || E'\nKonfigürasyon ' || v_ref || ' v' || v_version::text
               || case when v_price is not null then ' · tahmini ' || v_price::text || ' ' || coalesce(v_currency, '') else '' end
   where id = v_sale;
  update public.configurations set sale_id = v_sale, status = 'converted_to_sale' where id = p_configuration_id;
  return v_sale;
end $$;
revoke all on function public.create_sale_from_configuration(uuid) from public, anon;
grant execute on function public.create_sale_from_configuration(uuid) to authenticated;
