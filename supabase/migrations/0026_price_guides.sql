-- 0026 · Fiyat rehberi (Faz 16): yayındaki rehberin satırlarını, fiyatın TEK kaynağı material_prices'tan (0008) türetilmiş
-- min/max aralıkla döndüren RPC. material_prices anonime KAPALIDIR (K-29: konfigüratörde fiyat üyeye özel); rehber ise
-- bilinçli olarak herkese açık bir SEO sayfasıdır (01-PUBLIC-PAGES). Bu yüzden RPC security DEFINER'dır ve yalnız
-- status='published' + o dilde yayında rehberlere bağlı satırların türetilmiş aralığını verir; tablo kendisi açılmaz (K-59).

create function public.get_price_guide_by_slug(p_locale text, p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', g.id,
    'slug', g.slug->>p_locale,
    'title', g.title->>p_locale,
    'intro', g.intro->>p_locale,
    'factors', g.factors->>p_locale,
    'formula', g.formula->>p_locale,
    -- Uyarı zorunlu (0002 CHECK): o dilde yoksa TR gösterilir; sayfa uyarısız yayınlanmaz.
    'disclaimer', coalesce(nullif(g.disclaimer->>p_locale, ''), g.disclaimer->>'tr'),
    'quantity_unit', g.quantity_unit,
    'quantity_presets', to_jsonb(g.quantity_presets),
    'vat_included', g.vat_included,
    'prices_updated_at', g.prices_updated_at,
    'is_stale', (g.prices_updated_at is null or g.prices_updated_at + make_interval(days => g.stale_after_days) < now()),
    'published_at', g.published_at,
    'updated_at', g.updated_at,
    'seo', jsonb_build_object(
      'title', g.seo_title->>p_locale, 'description', g.seo_description->>p_locale,
      'canonical_url', g.canonical_url, 'noindex', g.noindex,
      'og_image', (select jsonb_build_object('bucket', m.storage_bucket, 'path', m.storage_path, 'width', m.width, 'height', m.height)
                     from public.media_library m where m.id = g.og_image_id)),
    'alternates', jsonb_build_object(
      'tr', case when 'tr' = any(g.published_locales) then g.slug->>'tr' end,
      'en', case when 'en' = any(g.published_locales) then g.slug->>'en' end),
    'service', (select jsonb_build_object('slug', sv.slug->>p_locale, 'title', sv.title->>p_locale)
                  from public.services sv
                 where sv.id = g.service_id and sv.status = 'published' and p_locale = any(sv.published_locales)
                   and (sv.published_at is null or sv.published_at <= now())),
    -- Satırlar: fiyat = material_prices.unit_price × çarpan; malzeme bağlı değilse fiyat alanları null (tablo "—" gösterir)
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', r.id,
               'system_type', r.system_type->>p_locale,
               'description', r.description->>p_locale,
               'min_factor', r.min_factor, 'max_factor', r.max_factor,
               'unit_price', m.unit_price, 'currency', m.currency, 'unit', m.unit, 'price_valid_from', m.valid_from,
               'min_price', case when m.unit_price is null then null else round(m.unit_price * r.min_factor, 2) end,
               'max_price', case when m.unit_price is null then null else round(m.unit_price * r.max_factor, 2) end)
             order by r.sort_order)
        from public.price_guide_rows r left join public.material_prices m on m.id = r.material_price_id
       where r.price_guide_id = g.id and coalesce(r.system_type->>p_locale, '') <> ''), '[]'::jsonb),
    'faqs', coalesce((
      select jsonb_agg(jsonb_build_object('question', f.question->>p_locale, 'answer', f.answer->>p_locale) order by f.sort_order)
        from public.faqs f
       where f.entity_type = 'price_guide' and f.entity_id = g.id and f.status = 'published' and p_locale = any(f.published_locales)), '[]'::jsonb)
  )
  from public.price_guides g
  where ((p_locale = 'tr' and g.slug->>'tr' = p_slug)
      or (p_locale = 'en' and g.slug->>'en' = p_slug))
    and p_locale = any(g.published_locales)
    and g.status = 'published'
    and (g.published_at is null or g.published_at <= now())
$$;
revoke execute on function public.get_price_guide_by_slug(text, text) from public;
grant execute on function public.get_price_guide_by_slug(text, text) to anon, authenticated;

-- Panel "bayat" uyarısı ve satır güncellemesi: satır ya da bağlı malzeme fiyatı değişince rehberin prices_updated_at'i yenilenir.
create function app_private.touch_price_guide() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'price_guide_rows' then
    update public.price_guides set prices_updated_at = now() where id = coalesce(new.price_guide_id, old.price_guide_id);
  elsif tg_table_name = 'material_prices' then
    update public.price_guides g set prices_updated_at = now()
     where exists (select 1 from public.price_guide_rows r where r.price_guide_id = g.id and r.material_price_id = new.id);
  end if;
  return coalesce(new, old);
end $$;
create trigger touch_price_guide after insert or update or delete on public.price_guide_rows
  for each row execute function app_private.touch_price_guide();
create trigger touch_price_guide after update of unit_price, currency on public.material_prices
  for each row execute function app_private.touch_price_guide();

-- Editörler rehber metnini yazar (content_policies), fiyatı yalnız admin değiştirir (0008). Fiyat geçmişi admin okur.
-- Tohum yok: fiyat "iddia" taşıyan veridir (K-55) — ürün sahibi gerçek fiyatları panelden girer (ROADMAP "Gerçek fiyat verileri").
