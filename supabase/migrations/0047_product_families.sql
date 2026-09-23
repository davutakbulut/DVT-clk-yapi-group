-- 0047 · Ürün aileleri: kesit türüne göre çizim/3B, plaka (kg/m²) modu, ölçü anahtarı ve geometri (K-90)
-- Ürün sahibinin 2026-09-23 tarihli örnek ürün sayfaları (15 aile) tek bir genel seçici motoruyla sunulur:
--   products.options (jsonb, K-88'in genişletilmişi): draw (box|pipe|I|Itaper|U|L|T|flat|trap|plate), pattern, groups [{code,label{tr,en}}],
--     group_label/size_label/variant_label/grade_label/length_label/one_label/table_note {tr,en}, size_ui (chips|select), qty_default,
--     grades [] | grades_by_group {code: []}, lengths_m [], custom_length, unit, formats {code: [{w,l}]}, surfaces [] | surfaces_by_group {code: []}
--   product_variants.size_key  : seçicideki ölçü anahtarı ("HEA 100", "Ø21,3 (1/2\")", "50×50"); boşsa H×B türetilir
--   product_variants.kg_per_m2 : plaka/trapez birim ağırlığı (kg/m²)
--   product_variants.dims      : kesit geometrisi (mm): h,b,tw,tf,r,sl · D,t · a,b,t,r · w,t · H,B,t,ro,ri · kind,h,p,rt,rb,we,t; "dim" metni
alter table public.product_variants add column if not exists size_key text;
alter table public.product_variants add column if not exists kg_per_m2 numeric(10,3) check (kg_per_m2 is null or kg_per_m2 > 0);
alter table public.product_variants add column if not exists dims jsonb not null default '{}'::jsonb;
comment on column public.product_variants.size_key is 'Seçici ölçü anahtarı (K-90); boşsa yükseklik×genişlik';
comment on column public.product_variants.kg_per_m2 is 'Plaka/trapez birim ağırlığı kg/m² (K-90)';
comment on column public.product_variants.dims is 'Kesit geometrisi mm (çizim + 3B); "dim" görünen ölçü metni (K-90)';
comment on column public.products.options is 'Seçici: draw, groups, etiketler, kaliteler (grup bazlı), boylar, plaka ebatları, yüzeyler (K-88, K-90)';

-- Grup kodu: variant_group->>'code' (K-90); eski kayıtlarda dil etiketi (K-88)
create or replace function public.get_product_by_slug(p_locale text, p_slug text) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id,
    'slug', p.slug->>p_locale,
    'name', p.name->>p_locale,
    'short_description', p.short_description->>p_locale,
    'description', p.description->>p_locale,
    'usage_areas', p.usage_areas->>p_locale,
    'is_featured', p.is_featured,
    'options', p.options,
    'facts', p.facts,
    'published_at', p.published_at,
    'updated_at', p.updated_at,
    'seo', jsonb_build_object('title', p.seo_title->>p_locale, 'description', p.seo_description->>p_locale, 'canonical_url', p.canonical_url, 'noindex', p.noindex,
      'og_image', (select jsonb_build_object('bucket', m.storage_bucket, 'path', m.storage_path, 'width', m.width, 'height', m.height) from public.media_library m where m.id = p.og_image_id)),
    'alternates', jsonb_build_object(
      'tr', case when 'tr' = any(p.published_locales) then p.slug->>'tr' end,
      'en', case when 'en' = any(p.published_locales) then p.slug->>'en' end),
    'cover', (select jsonb_build_object('bucket', m.storage_bucket, 'path', m.storage_path, 'width', m.width, 'height', m.height, 'alt', m.alt->>p_locale, 'blur', m.blur_data_url, 'variants', m.variants)
                from public.media_library m where m.id = p.cover_image_id),
    'category', (select jsonb_build_object('id', c.id, 'slug', c.slug->>p_locale, 'name', c.name->>p_locale)
                   from public.product_categories c where c.id = p.category_id and c.is_active and c.slug->>p_locale is not null),
    'service', (select jsonb_build_object('slug', s.slug->>p_locale, 'title', s.title->>p_locale)
                  from public.services s where s.id = p.service_id and s.status = 'published' and p_locale = any(s.published_locales)),
    'images', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', m.storage_bucket, 'path', m.storage_path, 'width', m.width, 'height', m.height,
                                          'alt', coalesce(nullif(i.alt->>p_locale, ''), m.alt->>p_locale), 'blur', m.blur_data_url, 'variants', m.variants) order by i.sort_order)
        from public.product_images i join public.media_library m on m.id = i.media_id where i.product_id = p.id), '[]'::jsonb),
    'specs', coalesce((
      select jsonb_agg(jsonb_build_object('group', s.group_name->>p_locale, 'name', s.name->>p_locale, 'value', s.value->>p_locale, 'unit', s.unit) order by s.sort_order)
        from public.product_specs s where s.product_id = p.id and coalesce(s.name->>p_locale, '') <> ''), '[]'::jsonb),
    'variants', coalesce((
      select jsonb_agg(jsonb_build_object('id', v.id, 'size_label', v.size_label, 'size_key', v.size_key, 'width_mm', v.width_mm, 'height_mm', v.height_mm, 'thickness_mm', v.thickness_mm, 'length_mm', v.length_mm,
                                          'kg_per_m', v.kg_per_m, 'kg_per_m2', v.kg_per_m2, 'stock_code', v.stock_code, 'dims', v.dims,
                                          'variant_group', coalesce(v.variant_group->>'code', v.variant_group->>p_locale, v.variant_group->>'tr'), 'props', v.props) order by v.sort_order)
        from public.product_variants v where v.product_id = p.id and v.is_active), '[]'::jsonb),
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object('title', d.title->>p_locale, 'doc_type', d.doc_type, 'bucket', m.storage_bucket, 'path', m.storage_path, 'size_bytes', m.size_bytes) order by d.sort_order)
        from public.product_documents d join public.media_library m on m.id = d.media_id
       where d.product_id = p.id and p_locale = any(d.locales) and coalesce(d.title->>p_locale, '') <> ''), '[]'::jsonb),
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object('slug', pr.slug->>p_locale, 'title', pr.title->>p_locale) order by pr.sort_order)
        from public.service_projects sp join public.projects pr on pr.id = sp.project_id
       where sp.service_id = p.service_id and pr.status = 'published' and p_locale = any(pr.published_locales)
         and (pr.published_at is null or pr.published_at <= now())), '[]'::jsonb),
    'faqs', coalesce((
      select jsonb_agg(jsonb_build_object('question', f.question->>p_locale, 'answer', f.answer->>p_locale) order by f.sort_order)
        from public.faqs f where f.entity_type = 'product' and f.entity_id = p.id and f.status = 'published' and p_locale = any(f.published_locales)), '[]'::jsonb)
  )
  from public.products p
  where ((p_locale = 'tr' and p.slug->>'tr' = p_slug)
      or (p_locale = 'en' and p.slug->>'en' = p_slug))
    and p_locale = any(p.published_locales)
$$;
