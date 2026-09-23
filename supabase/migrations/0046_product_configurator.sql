-- 0046 · Ürün seçici (K-88): ölçü/kalınlık/kalite/boy/adet seçimi, ağırlık hesabı, teklif sepetine nitelikli kalem.
-- Prototip: ürün sahibinin kutu-profil.html dosyası (2026-09-23).

-- Ürün: seçim seçenekleri (kaliteler, stok boyları, özel boy, birim) ve başlık altı kısa gerçekler
alter table public.products add column if not exists options jsonb not null default '{}'::jsonb;
alter table public.products add column if not exists facts jsonb not null default '[]'::jsonb;
comment on column public.products.options is 'Seçici: {grades: [], lengths_m: [], custom_length: bool, unit: text} (K-88)';
comment on column public.products.facts is 'Başlık altı şerit: [{label: {tr,en}, value: {tr,en}}] (K-88)';

-- Varyant: kesit grubu (Kare/Dikdörtgen…) ve kesit değerleri (A, Ix, Iy, Wx, Wy, ix, iy, u)
alter table public.product_variants add column if not exists variant_group jsonb not null default '{}'::jsonb;
alter table public.product_variants add column if not exists props jsonb not null default '{}'::jsonb;
create index if not exists product_variants_product_group_idx on public.product_variants (product_id, (variant_group->>'tr'));

-- Talep kalemi: seçim nitelikleri (kalite, boy, kg/m, toplam kg) — ziyaretçi seçiminin anlık görüntüsü
alter table public.lead_items add column if not exists attributes jsonb not null default '{}'::jsonb;

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
    -- İlgili hizmet yalnız BU dilde yayındaysa (K-25 karşılıklı bağlantı; İngilizce sayfadan 404'e bağlantı yok)
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
      select jsonb_agg(jsonb_build_object('id', v.id, 'size_label', v.size_label, 'width_mm', v.width_mm, 'height_mm', v.height_mm, 'thickness_mm', v.thickness_mm, 'length_mm', v.length_mm, 'kg_per_m', v.kg_per_m, 'stock_code', v.stock_code,
                                          'variant_group', coalesce(v.variant_group->>p_locale, v.variant_group->>'tr'), 'props', v.props) order by v.sort_order)
        from public.product_variants v where v.product_id = p.id and v.is_active), '[]'::jsonb),
    'documents', coalesce((
      select jsonb_agg(jsonb_build_object('title', d.title->>p_locale, 'doc_type', d.doc_type, 'bucket', m.storage_bucket, 'path', m.storage_path, 'size_bytes', m.size_bytes) order by d.sort_order)
        from public.product_documents d join public.media_library m on m.id = d.media_id
       where d.product_id = p.id and p_locale = any(d.locales) and coalesce(d.title->>p_locale, '') <> ''), '[]'::jsonb),
    -- Kullanıldığı projeler: aynı hizmetin projeleri (ürün↔proje doğrudan bağı yok; hizmet üzerinden)
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
      -- Seçim nitelikleri (K-88: kalite, boy, kg/m, toplam kg): yalnız nesne, en çok 1 KB; ziyaretçi verisi olduğu için snapshot olarak saklanır
      insert into public.lead_items (lead_id, product_id, variant_id, product_name_snapshot, variant_label_snapshot, stock_code_snapshot, quantity, unit, note, sort_order, attributes)
      values (v_id, v_product_id, v_variant_id, coalesce(v_product_name, ''), v_variant_label, v_variant_code,
              greatest(coalesce(nullif(v_item->>'quantity', '')::numeric, 1), 0.001), nullif(btrim(v_item->>'unit'), ''), nullif(btrim(v_item->>'note'), ''), v_count,
              case when jsonb_typeof(v_item->'attributes') = 'object' and length((v_item->'attributes')::text) <= 1024 then v_item->'attributes' else '{}'::jsonb end);
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

-- ─────────────────────────────────────────────────────────────────────────────
-- Kutu profil içeriği (ürün sahibinin 2026-09-23 tarihli kutu-profil.html dosyasından): 331 ölçü (121 kare, 210 dikdörtgen),
-- kg/m ve kesit değerleri TS EN 10219-2 köşe yarıçapları ve 7850 kg/m³ ile hesaplanmış NOMİNAL değerlerdir (K-75: standart değeri
-- uydurma sayılmaz). Ürün panelden 'kutu-profil' slug'ıyla oluşturulmuşsa uygulanır; yoksa (test veritabanı) atlanır.
do $$
declare v_pid uuid;
begin
  select id into v_pid from public.products where slug->>'tr' = 'kutu-profil' limit 1;
  if v_pid is null then return; end if;

  update public.products set
    options = jsonb_build_object('grades', jsonb_build_array('S235JRH','S275J0H','S355J2H'), 'lengths_m', jsonb_build_array(6, 12), 'custom_length', true, 'unit', 'adet'),
    facts = jsonb_build_array(
      jsonb_build_object('label', jsonb_build_object('tr','Üretim standardı','en','Standard'), 'value', jsonb_build_object('tr','TS EN 10219','en','EN 10219')),
      jsonb_build_object('label', jsonb_build_object('tr','Çelik kalitesi','en','Steel grade'), 'value', jsonb_build_object('tr','S235JRH – S355J2H','en','S235JRH – S355J2H')),
      jsonb_build_object('label', jsonb_build_object('tr','Stok boyları','en','Stock lengths'), 'value', jsonb_build_object('tr','6 m · 12 m','en','6 m · 12 m')))
  where id = v_pid;

  delete from public.product_variants where product_id = v_pid;
  insert into public.product_variants (product_id, size_label, width_mm, height_mm, thickness_mm, kg_per_m, stock_code, variant_group, props, sort_order)
  select v_pid, v.l, v.w, v.h, v.t, v.kg, v.sc, v.g, v.pr, v.o from (values
      ('15×15×1,2', 15, 15, 1.2, 0.49, 'KP-15X15X1.2', jsonb_build_object('tr','Kare','en','Square'), '{"A":0.63,"Ix":0.19,"Iy":0.19,"Wx":0.26,"Wy":0.26,"ix":0.55,"iy":0.55,"u":0.056}'::jsonb, 1),
      ('15×15×1,5', 15, 15, 1.5, 0.59, 'KP-15X15X1.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":0.75,"Ix":0.22,"Iy":0.22,"Wx":0.29,"Wy":0.29,"ix":0.54,"iy":0.54,"u":0.055}'::jsonb, 2),
      ('15×15×2', 15, 15, 2, 0.74, 'KP-15X15X2', jsonb_build_object('tr','Kare','en','Square'), '{"A":0.94,"Ix":0.25,"Iy":0.25,"Wx":0.33,"Wy":0.33,"ix":0.51,"iy":0.51,"u":0.053}'::jsonb, 3),
      ('20×20×1,2', 20, 20, 1.2, 0.68, 'KP-20X20X1.2', jsonb_build_object('tr','Kare','en','Square'), '{"A":0.87,"Ix":0.5,"Iy":0.5,"Wx":0.5,"Wy":0.5,"ix":0.76,"iy":0.76,"u":0.076}'::jsonb, 4),
      ('20×20×1,5', 20, 20, 1.5, 0.83, 'KP-20X20X1.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":1.05,"Ix":0.58,"Iy":0.58,"Wx":0.58,"Wy":0.58,"ix":0.74,"iy":0.74,"u":0.075}'::jsonb, 5),
      ('20×20×2', 20, 20, 2, 1.05, 'KP-20X20X2', jsonb_build_object('tr','Kare','en','Square'), '{"A":1.34,"Ix":0.69,"Iy":0.69,"Wx":0.69,"Wy":0.69,"ix":0.72,"iy":0.72,"u":0.073}'::jsonb, 6),
      ('25×25×1,2', 25, 25, 1.2, 0.87, 'KP-25X25X1.2', jsonb_build_object('tr','Kare','en','Square'), '{"A":1.11,"Ix":1.03,"Iy":1.03,"Wx":0.82,"Wy":0.82,"ix":0.96,"iy":0.96,"u":0.096}'::jsonb, 7),
      ('25×25×1,5', 25, 25, 1.5, 1.06, 'KP-25X25X1.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":1.35,"Ix":1.22,"Iy":1.22,"Wx":0.97,"Wy":0.97,"ix":0.95,"iy":0.95,"u":0.095}'::jsonb, 8),
      ('25×25×2', 25, 25, 2, 1.36, 'KP-25X25X2', jsonb_build_object('tr','Kare','en','Square'), '{"A":1.74,"Ix":1.48,"Iy":1.48,"Wx":1.19,"Wy":1.19,"ix":0.92,"iy":0.92,"u":0.093}'::jsonb, 9),
      ('25×25×2,5', 25, 25, 2.5, 1.64, 'KP-25X25X2.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":2.09,"Ix":1.69,"Iy":1.69,"Wx":1.35,"Wy":1.35,"ix":0.9,"iy":0.9,"u":0.091}'::jsonb, 10),
      ('25×25×3', 25, 25, 3, 1.89, 'KP-25X25X3', jsonb_build_object('tr','Kare','en','Square'), '{"A":2.41,"Ix":1.84,"Iy":1.84,"Wx":1.47,"Wy":1.47,"ix":0.87,"iy":0.87,"u":0.09}'::jsonb, 11),
      ('30×30×1,2', 30, 30, 1.2, 1.06, 'KP-30X30X1.2', jsonb_build_object('tr','Kare','en','Square'), '{"A":1.35,"Ix":1.83,"Iy":1.83,"Wx":1.22,"Wy":1.22,"ix":1.17,"iy":1.17,"u":0.116}'::jsonb, 12),
      ('30×30×1,5', 30, 30, 1.5, 1.3, 'KP-30X30X1.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":1.65,"Ix":2.2,"Iy":2.2,"Wx":1.46,"Wy":1.46,"ix":1.15,"iy":1.15,"u":0.115}'::jsonb, 13),
      ('30×30×2', 30, 30, 2, 1.68, 'KP-30X30X2', jsonb_build_object('tr','Kare','en','Square'), '{"A":2.14,"Ix":2.72,"Iy":2.72,"Wx":1.81,"Wy":1.81,"ix":1.13,"iy":1.13,"u":0.113}'::jsonb, 14),
      ('30×30×2,5', 30, 30, 2.5, 2.03, 'KP-30X30X2.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":2.59,"Ix":3.16,"Iy":3.16,"Wx":2.1,"Wy":2.1,"ix":1.1,"iy":1.1,"u":0.111}'::jsonb, 15),
      ('30×30×3', 30, 30, 3, 2.36, 'KP-30X30X3', jsonb_build_object('tr','Kare','en','Square'), '{"A":3.01,"Ix":3.5,"Iy":3.5,"Wx":2.34,"Wy":2.34,"ix":1.08,"iy":1.08,"u":0.11}'::jsonb, 16),
      ('35×35×1,5', 35, 35, 1.5, 1.53, 'KP-35X35X1.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":1.95,"Ix":3.6,"Iy":3.6,"Wx":2.05,"Wy":2.05,"ix":1.36,"iy":1.36,"u":0.135}'::jsonb, 17),
      ('35×35×2', 35, 35, 2, 1.99, 'KP-35X35X2', jsonb_build_object('tr','Kare','en','Square'), '{"A":2.54,"Ix":4.51,"Iy":4.51,"Wx":2.58,"Wy":2.58,"ix":1.33,"iy":1.33,"u":0.133}'::jsonb, 18),
      ('35×35×2,5', 35, 35, 2.5, 2.42, 'KP-35X35X2.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":3.09,"Ix":5.29,"Iy":5.29,"Wx":3.02,"Wy":3.02,"ix":1.31,"iy":1.31,"u":0.131}'::jsonb, 19),
      ('35×35×3', 35, 35, 3, 2.83, 'KP-35X35X3', jsonb_build_object('tr','Kare','en','Square'), '{"A":3.61,"Ix":5.95,"Iy":5.95,"Wx":3.4,"Wy":3.4,"ix":1.28,"iy":1.28,"u":0.13}'::jsonb, 20),
      ('35×35×4', 35, 35, 4, 3.57, 'KP-35X35X4', jsonb_build_object('tr','Kare','en','Square'), '{"A":4.55,"Ix":6.93,"Iy":6.93,"Wx":3.96,"Wy":3.96,"ix":1.23,"iy":1.23,"u":0.126}'::jsonb, 21),
      ('40×40×1,5', 40, 40, 1.5, 1.77, 'KP-40X40X1.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":2.25,"Ix":5.49,"Iy":5.49,"Wx":2.75,"Wy":2.75,"ix":1.56,"iy":1.56,"u":0.155}'::jsonb, 22),
      ('40×40×2', 40, 40, 2, 2.31, 'KP-40X40X2', jsonb_build_object('tr','Kare','en','Square'), '{"A":2.94,"Ix":6.94,"Iy":6.94,"Wx":3.47,"Wy":3.47,"ix":1.54,"iy":1.54,"u":0.153}'::jsonb, 23),
      ('40×40×2,5', 40, 40, 2.5, 2.82, 'KP-40X40X2.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":3.59,"Ix":8.22,"Iy":8.22,"Wx":4.11,"Wy":4.11,"ix":1.51,"iy":1.51,"u":0.151}'::jsonb, 24),
      ('40×40×3', 40, 40, 3, 3.3, 'KP-40X40X3', jsonb_build_object('tr','Kare','en','Square'), '{"A":4.21,"Ix":9.32,"Iy":9.32,"Wx":4.66,"Wy":4.66,"ix":1.49,"iy":1.49,"u":0.15}'::jsonb, 25),
      ('40×40×4', 40, 40, 4, 4.2, 'KP-40X40X4', jsonb_build_object('tr','Kare','en','Square'), '{"A":5.35,"Ix":11.07,"Iy":11.07,"Wx":5.54,"Wy":5.54,"ix":1.44,"iy":1.44,"u":0.146}'::jsonb, 26),
      ('45×45×1,5', 45, 45, 1.5, 2, 'KP-45X45X1.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":2.55,"Ix":7.96,"Iy":7.96,"Wx":3.54,"Wy":3.54,"ix":1.77,"iy":1.77,"u":0.175}'::jsonb, 27),
      ('45×45×2', 45, 45, 2, 2.62, 'KP-45X45X2', jsonb_build_object('tr','Kare','en','Square'), '{"A":3.34,"Ix":10.12,"Iy":10.12,"Wx":4.5,"Wy":4.5,"ix":1.74,"iy":1.74,"u":0.173}'::jsonb, 28),
      ('45×45×2,5', 45, 45, 2.5, 3.21, 'KP-45X45X2.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":4.09,"Ix":12.06,"Iy":12.06,"Wx":5.36,"Wy":5.36,"ix":1.72,"iy":1.72,"u":0.171}'::jsonb, 29),
      ('45×45×3', 45, 45, 3, 3.77, 'KP-45X45X3', jsonb_build_object('tr','Kare','en','Square'), '{"A":4.81,"Ix":13.78,"Iy":13.78,"Wx":6.12,"Wy":6.12,"ix":1.69,"iy":1.69,"u":0.17}'::jsonb, 30),
      ('45×45×4', 45, 45, 4, 4.83, 'KP-45X45X4', jsonb_build_object('tr','Kare','en','Square'), '{"A":6.15,"Ix":16.61,"Iy":16.61,"Wx":7.38,"Wy":7.38,"ix":1.64,"iy":1.64,"u":0.166}'::jsonb, 31),
      ('50×50×1,5', 50, 50, 1.5, 2.24, 'KP-50X50X1.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":2.85,"Ix":11.07,"Iy":11.07,"Wx":4.43,"Wy":4.43,"ix":1.97,"iy":1.97,"u":0.195}'::jsonb, 32),
      ('50×50×2', 50, 50, 2, 2.93, 'KP-50X50X2', jsonb_build_object('tr','Kare','en','Square'), '{"A":3.74,"Ix":14.15,"Iy":14.15,"Wx":5.66,"Wy":5.66,"ix":1.95,"iy":1.95,"u":0.193}'::jsonb, 33),
      ('50×50×2,5', 50, 50, 2.5, 3.6, 'KP-50X50X2.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":4.59,"Ix":16.94,"Iy":16.94,"Wx":6.78,"Wy":6.78,"ix":1.92,"iy":1.92,"u":0.191}'::jsonb, 34),
      ('50×50×3', 50, 50, 3, 4.25, 'KP-50X50X3', jsonb_build_object('tr','Kare','en','Square'), '{"A":5.41,"Ix":19.47,"Iy":19.47,"Wx":7.79,"Wy":7.79,"ix":1.9,"iy":1.9,"u":0.19}'::jsonb, 35),
      ('50×50×4', 50, 50, 4, 5.45, 'KP-50X50X4', jsonb_build_object('tr','Kare','en','Square'), '{"A":6.95,"Ix":23.74,"Iy":23.74,"Wx":9.49,"Wy":9.49,"ix":1.85,"iy":1.85,"u":0.186}'::jsonb, 36),
      ('60×60×2', 60, 60, 2, 3.56, 'KP-60X60X2', jsonb_build_object('tr','Kare','en','Square'), '{"A":4.54,"Ix":25.14,"Iy":25.14,"Wx":8.38,"Wy":8.38,"ix":2.35,"iy":2.35,"u":0.233}'::jsonb, 37),
      ('60×60×2,5', 60, 60, 2.5, 4.39, 'KP-60X60X2.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":5.59,"Ix":30.34,"Iy":30.34,"Wx":10.11,"Wy":10.11,"ix":2.33,"iy":2.33,"u":0.231}'::jsonb, 38),
      ('60×60×3', 60, 60, 3, 5.19, 'KP-60X60X3', jsonb_build_object('tr','Kare','en','Square'), '{"A":6.61,"Ix":35.13,"Iy":35.13,"Wx":11.71,"Wy":11.71,"ix":2.31,"iy":2.31,"u":0.23}'::jsonb, 39),
      ('60×60×4', 60, 60, 4, 6.71, 'KP-60X60X4', jsonb_build_object('tr','Kare','en','Square'), '{"A":8.55,"Ix":43.55,"Iy":43.55,"Wx":14.52,"Wy":14.52,"ix":2.26,"iy":2.26,"u":0.226}'::jsonb, 40),
      ('60×60×5', 60, 60, 5, 8.13, 'KP-60X60X5', jsonb_build_object('tr','Kare','en','Square'), '{"A":10.36,"Ix":50.49,"Iy":50.49,"Wx":16.83,"Wy":16.83,"ix":2.21,"iy":2.21,"u":0.223}'::jsonb, 41),
      ('70×70×2', 70, 70, 2, 4.19, 'KP-70X70X2', jsonb_build_object('tr','Kare','en','Square'), '{"A":5.34,"Ix":40.73,"Iy":40.73,"Wx":11.64,"Wy":11.64,"ix":2.76,"iy":2.76,"u":0.273}'::jsonb, 42),
      ('70×70×2,5', 70, 70, 2.5, 5.17, 'KP-70X70X2.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":6.59,"Ix":49.41,"Iy":49.41,"Wx":14.12,"Wy":14.12,"ix":2.74,"iy":2.74,"u":0.271}'::jsonb, 43),
      ('70×70×3', 70, 70, 3, 6.13, 'KP-70X70X3', jsonb_build_object('tr','Kare','en','Square'), '{"A":7.81,"Ix":57.53,"Iy":57.53,"Wx":16.44,"Wy":16.44,"ix":2.71,"iy":2.71,"u":0.27}'::jsonb, 44),
      ('70×70×4', 70, 70, 4, 7.97, 'KP-70X70X4', jsonb_build_object('tr','Kare','en','Square'), '{"A":10.15,"Ix":72.12,"Iy":72.12,"Wx":20.61,"Wy":20.61,"ix":2.67,"iy":2.67,"u":0.266}'::jsonb, 45),
      ('70×70×5', 70, 70, 5, 9.7, 'KP-70X70X5', jsonb_build_object('tr','Kare','en','Square'), '{"A":12.36,"Ix":84.63,"Iy":84.63,"Wx":24.18,"Wy":24.18,"ix":2.62,"iy":2.62,"u":0.263}'::jsonb, 46),
      ('80×80×2', 80, 80, 2, 4.82, 'KP-80X80X2', jsonb_build_object('tr','Kare','en','Square'), '{"A":6.14,"Ix":61.7,"Iy":61.7,"Wx":15.42,"Wy":15.42,"ix":3.17,"iy":3.17,"u":0.313}'::jsonb, 47),
      ('80×80×2,5', 80, 80, 2.5, 5.96, 'KP-80X80X2.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":7.59,"Ix":75.15,"Iy":75.15,"Wx":18.79,"Wy":18.79,"ix":3.15,"iy":3.15,"u":0.311}'::jsonb, 48),
      ('80×80×3', 80, 80, 3, 7.07, 'KP-80X80X3', jsonb_build_object('tr','Kare','en','Square'), '{"A":9.01,"Ix":87.84,"Iy":87.84,"Wx":21.96,"Wy":21.96,"ix":3.12,"iy":3.12,"u":0.31}'::jsonb, 49),
      ('80×80×4', 80, 80, 4, 9.22, 'KP-80X80X4', jsonb_build_object('tr','Kare','en','Square'), '{"A":11.75,"Ix":111.04,"Iy":111.04,"Wx":27.76,"Wy":27.76,"ix":3.07,"iy":3.07,"u":0.306}'::jsonb, 50),
      ('80×80×5', 80, 80, 5, 11.27, 'KP-80X80X5', jsonb_build_object('tr','Kare','en','Square'), '{"A":14.36,"Ix":131.44,"Iy":131.44,"Wx":32.86,"Wy":32.86,"ix":3.03,"iy":3.03,"u":0.303}'::jsonb, 51),
      ('90×90×2', 90, 90, 2, 5.45, 'KP-90X90X2', jsonb_build_object('tr','Kare','en','Square'), '{"A":6.94,"Ix":88.86,"Iy":88.86,"Wx":19.75,"Wy":19.75,"ix":3.58,"iy":3.58,"u":0.353}'::jsonb, 52),
      ('90×90×2,5', 90, 90, 2.5, 6.74, 'KP-90X90X2.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":8.59,"Ix":108.55,"Iy":108.55,"Wx":24.12,"Wy":24.12,"ix":3.56,"iy":3.56,"u":0.351}'::jsonb, 53),
      ('90×90×3', 90, 90, 3, 8.01, 'KP-90X90X3', jsonb_build_object('tr','Kare','en','Square'), '{"A":10.21,"Ix":127.28,"Iy":127.28,"Wx":28.28,"Wy":28.28,"ix":3.53,"iy":3.53,"u":0.35}'::jsonb, 54),
      ('90×90×4', 90, 90, 4, 10.48, 'KP-90X90X4', jsonb_build_object('tr','Kare','en','Square'), '{"A":13.35,"Ix":161.92,"Iy":161.92,"Wx":35.98,"Wy":35.98,"ix":3.48,"iy":3.48,"u":0.346}'::jsonb, 55),
      ('90×90×5', 90, 90, 5, 12.84, 'KP-90X90X5', jsonb_build_object('tr','Kare','en','Square'), '{"A":16.36,"Ix":192.93,"Iy":192.93,"Wx":42.87,"Wy":42.87,"ix":3.43,"iy":3.43,"u":0.343}'::jsonb, 56),
      ('90×90×6', 90, 90, 6, 15.1, 'KP-90X90X6', jsonb_build_object('tr','Kare','en','Square'), '{"A":19.23,"Ix":220.47,"Iy":220.47,"Wx":48.99,"Wy":48.99,"ix":3.39,"iy":3.39,"u":0.339}'::jsonb, 57),
      ('100×100×2', 100, 100, 2, 6.07, 'KP-100X100X2', jsonb_build_object('tr','Kare','en','Square'), '{"A":7.74,"Ix":123.01,"Iy":123.01,"Wx":24.6,"Wy":24.6,"ix":3.99,"iy":3.99,"u":0.393}'::jsonb, 58),
      ('100×100×2,5', 100, 100, 2.5, 7.53, 'KP-100X100X2.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":9.59,"Ix":150.63,"Iy":150.63,"Wx":30.13,"Wy":30.13,"ix":3.96,"iy":3.96,"u":0.391}'::jsonb, 59),
      ('100×100×3', 100, 100, 3, 8.96, 'KP-100X100X3', jsonb_build_object('tr','Kare','en','Square'), '{"A":11.41,"Ix":177.05,"Iy":177.05,"Wx":35.41,"Wy":35.41,"ix":3.94,"iy":3.94,"u":0.39}'::jsonb, 60),
      ('100×100×4', 100, 100, 4, 11.73, 'KP-100X100X4', jsonb_build_object('tr','Kare','en','Square'), '{"A":14.95,"Ix":226.35,"Iy":226.35,"Wx":45.27,"Wy":45.27,"ix":3.89,"iy":3.89,"u":0.386}'::jsonb, 61),
      ('100×100×5', 100, 100, 5, 14.41, 'KP-100X100X5', jsonb_build_object('tr','Kare','en','Square'), '{"A":18.36,"Ix":271.1,"Iy":271.1,"Wx":54.22,"Wy":54.22,"ix":3.84,"iy":3.84,"u":0.383}'::jsonb, 62),
      ('100×100×6', 100, 100, 6, 16.98, 'KP-100X100X6', jsonb_build_object('tr','Kare','en','Square'), '{"A":21.63,"Ix":311.47,"Iy":311.47,"Wx":62.29,"Wy":62.29,"ix":3.79,"iy":3.79,"u":0.379}'::jsonb, 63),
      ('120×120×3', 120, 120, 3, 10.84, 'KP-120X120X3', jsonb_build_object('tr','Kare','en','Square'), '{"A":13.81,"Ix":312.35,"Iy":312.35,"Wx":52.06,"Wy":52.06,"ix":4.76,"iy":4.76,"u":0.47}'::jsonb, 64),
      ('120×120×4', 120, 120, 4, 14.25, 'KP-120X120X4', jsonb_build_object('tr','Kare','en','Square'), '{"A":18.15,"Ix":402.27,"Iy":402.27,"Wx":67.05,"Wy":67.05,"ix":4.71,"iy":4.71,"u":0.466}'::jsonb, 65),
      ('120×120×5', 120, 120, 5, 17.55, 'KP-120X120X5', jsonb_build_object('tr','Kare','en','Square'), '{"A":22.36,"Ix":485.47,"Iy":485.47,"Wx":80.91,"Wy":80.91,"ix":4.66,"iy":4.66,"u":0.463}'::jsonb, 66),
      ('120×120×6', 120, 120, 6, 20.75, 'KP-120X120X6', jsonb_build_object('tr','Kare','en','Square'), '{"A":26.43,"Ix":562.15,"Iy":562.15,"Wx":93.69,"Wy":93.69,"ix":4.61,"iy":4.61,"u":0.459}'::jsonb, 67),
      ('120×120×8', 120, 120, 8, 26.41, 'KP-120X120X8', jsonb_build_object('tr','Kare','en','Square'), '{"A":33.64,"Ix":676.86,"Iy":676.86,"Wx":112.81,"Wy":112.81,"ix":4.49,"iy":4.49,"u":0.446}'::jsonb, 68),
      ('140×140×3', 140, 140, 3, 12.72, 'KP-140X140X3', jsonb_build_object('tr','Kare','en','Square'), '{"A":16.21,"Ix":503.34,"Iy":503.34,"Wx":71.91,"Wy":71.91,"ix":5.57,"iy":5.57,"u":0.55}'::jsonb, 69),
      ('140×140×4', 140, 140, 4, 16.76, 'KP-140X140X4', jsonb_build_object('tr','Kare','en','Square'), '{"A":21.35,"Ix":651.61,"Iy":651.61,"Wx":93.09,"Wy":93.09,"ix":5.52,"iy":5.52,"u":0.546}'::jsonb, 70),
      ('140×140×5', 140, 140, 5, 20.69, 'KP-140X140X5', jsonb_build_object('tr','Kare','en','Square'), '{"A":26.36,"Ix":790.55,"Iy":790.55,"Wx":112.94,"Wy":112.94,"ix":5.48,"iy":5.48,"u":0.543}'::jsonb, 71),
      ('140×140×6', 140, 140, 6, 24.52, 'KP-140X140X6', jsonb_build_object('tr','Kare','en','Square'), '{"A":31.23,"Ix":920.42,"Iy":920.42,"Wx":131.49,"Wy":131.49,"ix":5.43,"iy":5.43,"u":0.539}'::jsonb, 72),
      ('140×140×8', 140, 140, 8, 31.43, 'KP-140X140X8', jsonb_build_object('tr','Kare','en','Square'), '{"A":40.04,"Ix":1126.76,"Iy":1126.76,"Wx":160.97,"Wy":160.97,"ix":5.3,"iy":5.3,"u":0.526}'::jsonb, 73),
      ('150×150×3', 150, 150, 3, 13.67, 'KP-150X150X3', jsonb_build_object('tr','Kare','en','Square'), '{"A":17.41,"Ix":622.73,"Iy":622.73,"Wx":83.03,"Wy":83.03,"ix":5.98,"iy":5.98,"u":0.59}'::jsonb, 74),
      ('150×150×4', 150, 150, 4, 18.01, 'KP-150X150X4', jsonb_build_object('tr','Kare','en','Square'), '{"A":22.95,"Ix":807.81,"Iy":807.81,"Wx":107.71,"Wy":107.71,"ix":5.93,"iy":5.93,"u":0.586}'::jsonb, 75),
      ('150×150×5', 150, 150, 5, 22.26, 'KP-150X150X5', jsonb_build_object('tr','Kare','en','Square'), '{"A":28.36,"Ix":982.11,"Iy":982.11,"Wx":130.95,"Wy":130.95,"ix":5.89,"iy":5.89,"u":0.583}'::jsonb, 76),
      ('150×150×6', 150, 150, 6, 26.4, 'KP-150X150X6', jsonb_build_object('tr','Kare','en','Square'), '{"A":33.63,"Ix":1145.9,"Iy":1145.9,"Wx":152.79,"Wy":152.79,"ix":5.84,"iy":5.84,"u":0.579}'::jsonb, 77),
      ('150×150×8', 150, 150, 8, 33.95, 'KP-150X150X8', jsonb_build_object('tr','Kare','en','Square'), '{"A":43.24,"Ix":1411.81,"Iy":1411.81,"Wx":188.24,"Wy":188.24,"ix":5.71,"iy":5.71,"u":0.566}'::jsonb, 78),
      ('160×160×4', 160, 160, 4, 19.27, 'KP-160X160X4', jsonb_build_object('tr','Kare','en','Square'), '{"A":24.55,"Ix":987.17,"Iy":987.17,"Wx":123.4,"Wy":123.4,"ix":6.34,"iy":6.34,"u":0.626}'::jsonb, 79),
      ('160×160×5', 160, 160, 5, 23.83, 'KP-160X160X5', jsonb_build_object('tr','Kare','en','Square'), '{"A":30.36,"Ix":1202.35,"Iy":1202.35,"Wx":150.29,"Wy":150.29,"ix":6.29,"iy":6.29,"u":0.623}'::jsonb, 80),
      ('160×160×6', 160, 160, 6, 28.29, 'KP-160X160X6', jsonb_build_object('tr','Kare','en','Square'), '{"A":36.03,"Ix":1405.47,"Iy":1405.47,"Wx":175.68,"Wy":175.68,"ix":6.25,"iy":6.25,"u":0.619}'::jsonb, 81),
      ('160×160×8', 160, 160, 8, 36.46, 'KP-160X160X8', jsonb_build_object('tr','Kare','en','Square'), '{"A":46.44,"Ix":1741.21,"Iy":1741.21,"Wx":217.65,"Wy":217.65,"ix":6.12,"iy":6.12,"u":0.606}'::jsonb, 82),
      ('160×160×10', 160, 160, 10, 44.4, 'KP-160X160X10', jsonb_build_object('tr','Kare','en','Square'), '{"A":56.57,"Ix":2047.63,"Iy":2047.63,"Wx":255.95,"Wy":255.95,"ix":6.02,"iy":6.02,"u":0.597}'::jsonb, 83),
      ('180×180×4', 180, 180, 4, 21.78, 'KP-180X180X4', jsonb_build_object('tr','Kare','en','Square'), '{"A":27.75,"Ix":1421.74,"Iy":1421.74,"Wx":157.97,"Wy":157.97,"ix":7.16,"iy":7.16,"u":0.706}'::jsonb, 84),
      ('180×180×5', 180, 180, 5, 26.97, 'KP-180X180X5', jsonb_build_object('tr','Kare','en','Square'), '{"A":34.36,"Ix":1736.86,"Iy":1736.86,"Wx":192.98,"Wy":192.98,"ix":7.11,"iy":7.11,"u":0.703}'::jsonb, 85),
      ('180×180×6', 180, 180, 6, 32.05, 'KP-180X180X6', jsonb_build_object('tr','Kare','en','Square'), '{"A":40.83,"Ix":2036.51,"Iy":2036.51,"Wx":226.28,"Wy":226.28,"ix":7.06,"iy":7.06,"u":0.699}'::jsonb, 86),
      ('180×180×8', 180, 180, 8, 41.48, 'KP-180X180X8', jsonb_build_object('tr','Kare','en','Square'), '{"A":52.84,"Ix":2545.83,"Iy":2545.83,"Wx":282.87,"Wy":282.87,"ix":6.94,"iy":6.94,"u":0.686}'::jsonb, 87),
      ('180×180×10', 180, 180, 10, 50.68, 'KP-180X180X10', jsonb_build_object('tr','Kare','en','Square'), '{"A":64.57,"Ix":3016.75,"Iy":3016.75,"Wx":335.19,"Wy":335.19,"ix":6.84,"iy":6.84,"u":0.677}'::jsonb, 88),
      ('200×200×4', 200, 200, 4, 24.29, 'KP-200X200X4', jsonb_build_object('tr','Kare','en','Square'), '{"A":30.95,"Ix":1968.12,"Iy":1968.12,"Wx":196.81,"Wy":196.81,"ix":7.97,"iy":7.97,"u":0.786}'::jsonb, 89),
      ('200×200×5', 200, 200, 5, 30.11, 'KP-200X200X5', jsonb_build_object('tr','Kare','en','Square'), '{"A":38.36,"Ix":2410.08,"Iy":2410.08,"Wx":241.01,"Wy":241.01,"ix":7.93,"iy":7.93,"u":0.783}'::jsonb, 90),
      ('200×200×6', 200, 200, 6, 35.82, 'KP-200X200X6', jsonb_build_object('tr','Kare','en','Square'), '{"A":45.63,"Ix":2832.73,"Iy":2832.73,"Wx":283.27,"Wy":283.27,"ix":7.88,"iy":7.88,"u":0.779}'::jsonb, 91),
      ('200×200×8', 200, 200, 8, 46.51, 'KP-200X200X8', jsonb_build_object('tr','Kare','en','Square'), '{"A":59.24,"Ix":3566.22,"Iy":3566.22,"Wx":356.62,"Wy":356.62,"ix":7.76,"iy":7.76,"u":0.766}'::jsonb, 92),
      ('200×200×10', 200, 200, 10, 56.96, 'KP-200X200X10', jsonb_build_object('tr','Kare','en','Square'), '{"A":72.57,"Ix":4251,"Iy":4251,"Wx":425.1,"Wy":425.1,"ix":7.65,"iy":7.65,"u":0.757}'::jsonb, 93),
      ('220×220×5', 220, 220, 5, 33.25, 'KP-220X220X5', jsonb_build_object('tr','Kare','en','Square'), '{"A":42.36,"Ix":3238.01,"Iy":3238.01,"Wx":294.36,"Wy":294.36,"ix":8.74,"iy":8.74,"u":0.863}'::jsonb, 94),
      ('220×220×6', 220, 220, 6, 39.59, 'KP-220X220X6', jsonb_build_object('tr','Kare','en','Square'), '{"A":50.43,"Ix":3813.34,"Iy":3813.34,"Wx":346.67,"Wy":346.67,"ix":8.7,"iy":8.7,"u":0.859}'::jsonb, 95),
      ('220×220×8', 220, 220, 8, 51.53, 'KP-220X220X8', jsonb_build_object('tr','Kare','en','Square'), '{"A":65.64,"Ix":4827.96,"Iy":4827.96,"Wx":438.91,"Wy":438.91,"ix":8.58,"iy":8.58,"u":0.846}'::jsonb, 96),
      ('220×220×10', 220, 220, 10, 63.24, 'KP-220X220X10', jsonb_build_object('tr','Kare','en','Square'), '{"A":80.57,"Ix":5782.39,"Iy":5782.39,"Wx":525.67,"Wy":525.67,"ix":8.47,"iy":8.47,"u":0.837}'::jsonb, 97),
      ('220×220×12,5', 220, 220, 12.5, 76.18, 'KP-220X220X12.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":97.04,"Ix":6673.85,"Iy":6673.85,"Wx":606.71,"Wy":606.71,"ix":8.29,"iy":8.29,"u":0.816}'::jsonb, 98),
      ('250×250×5', 250, 250, 5, 37.96, 'KP-250X250X5', jsonb_build_object('tr','Kare','en','Square'), '{"A":48.36,"Ix":4804.99,"Iy":4804.99,"Wx":384.4,"Wy":384.4,"ix":9.97,"iy":9.97,"u":0.983}'::jsonb, 99),
      ('250×250×6', 250, 250, 6, 45.24, 'KP-250X250X6', jsonb_build_object('tr','Kare','en','Square'), '{"A":57.63,"Ix":5671.98,"Iy":5671.98,"Wx":453.76,"Wy":453.76,"ix":9.92,"iy":9.92,"u":0.979}'::jsonb, 100),
      ('250×250×8', 250, 250, 8, 59.07, 'KP-250X250X8', jsonb_build_object('tr','Kare','en','Square'), '{"A":75.24,"Ix":7229.15,"Iy":7229.15,"Wx":578.33,"Wy":578.33,"ix":9.8,"iy":9.8,"u":0.966}'::jsonb, 101),
      ('250×250×10', 250, 250, 10, 72.66, 'KP-250X250X10', jsonb_build_object('tr','Kare','en','Square'), '{"A":92.57,"Ix":8706.58,"Iy":8706.58,"Wx":696.53,"Wy":696.53,"ix":9.7,"iy":9.7,"u":0.957}'::jsonb, 102),
      ('250×250×12,5', 250, 250, 12.5, 87.95, 'KP-250X250X12.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":112.04,"Ix":10161.14,"Iy":10161.14,"Wx":812.89,"Wy":812.89,"ix":9.52,"iy":9.52,"u":0.936}'::jsonb, 103),
      ('260×260×5', 260, 260, 5, 39.53, 'KP-260X260X5', jsonb_build_object('tr','Kare','en','Square'), '{"A":50.36,"Ix":5422.01,"Iy":5422.01,"Wx":417.08,"Wy":417.08,"ix":10.38,"iy":10.38,"u":1.023}'::jsonb, 104),
      ('260×260×6', 260, 260, 6, 47.13, 'KP-260X260X6', jsonb_build_object('tr','Kare','en','Square'), '{"A":60.03,"Ix":6404.51,"Iy":6404.51,"Wx":492.65,"Wy":492.65,"ix":10.33,"iy":10.33,"u":1.019}'::jsonb, 105),
      ('260×260×8', 260, 260, 8, 61.58, 'KP-260X260X8', jsonb_build_object('tr','Kare','en','Square'), '{"A":78.44,"Ix":8177.95,"Iy":8177.95,"Wx":629.07,"Wy":629.07,"ix":10.21,"iy":10.21,"u":1.006}'::jsonb, 106),
      ('260×260×10', 260, 260, 10, 75.8, 'KP-260X260X10', jsonb_build_object('tr','Kare','en','Square'), '{"A":96.57,"Ix":9864.55,"Iy":9864.55,"Wx":758.81,"Wy":758.81,"ix":10.11,"iy":10.11,"u":0.997}'::jsonb, 107),
      ('260×260×12,5', 260, 260, 12.5, 91.88, 'KP-260X260X12.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":117.04,"Ix":11547.7,"Iy":11547.7,"Wx":888.28,"Wy":888.28,"ix":9.93,"iy":9.93,"u":0.976}'::jsonb, 108),
      ('300×300×5', 300, 300, 5, 45.81, 'KP-300X300X5', jsonb_build_object('tr','Kare','en','Square'), '{"A":58.36,"Ix":8416.86,"Iy":8416.86,"Wx":561.12,"Wy":561.12,"ix":12.01,"iy":12.01,"u":1.183}'::jsonb, 109),
      ('300×300×6', 300, 300, 6, 54.66, 'KP-300X300X6', jsonb_build_object('tr','Kare','en','Square'), '{"A":69.63,"Ix":9963.63,"Iy":9963.63,"Wx":664.24,"Wy":664.24,"ix":11.96,"iy":11.96,"u":1.179}'::jsonb, 110),
      ('300×300×8', 300, 300, 8, 71.63, 'KP-300X300X8', jsonb_build_object('tr','Kare','en','Square'), '{"A":91.24,"Ix":12800.6,"Iy":12800.6,"Wx":853.37,"Wy":853.37,"ix":11.84,"iy":11.84,"u":1.166}'::jsonb, 111),
      ('300×300×10', 300, 300, 10, 88.36, 'KP-300X300X10', jsonb_build_object('tr','Kare','en','Square'), '{"A":112.57,"Ix":15519.23,"Iy":15519.23,"Wx":1034.62,"Wy":1034.62,"ix":11.74,"iy":11.74,"u":1.157}'::jsonb, 112),
      ('300×300×12,5', 300, 300, 12.5, 107.58, 'KP-300X300X12.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":137.04,"Ix":18347.88,"Iy":18347.88,"Wx":1223.19,"Wy":1223.19,"ix":11.57,"iy":11.57,"u":1.136}'::jsonb, 113),
      ('350×350×6', 350, 350, 6, 64.08, 'KP-350X350X6', jsonb_build_object('tr','Kare','en','Square'), '{"A":81.63,"Ix":16007.69,"Iy":16007.69,"Wx":914.73,"Wy":914.73,"ix":14,"iy":14,"u":1.379}'::jsonb, 114),
      ('350×350×8', 350, 350, 8, 84.19, 'KP-350X350X8', jsonb_build_object('tr','Kare','en','Square'), '{"A":107.24,"Ix":20680.58,"Iy":20680.58,"Wx":1181.75,"Wy":1181.75,"ix":13.89,"iy":13.89,"u":1.366}'::jsonb, 115),
      ('350×350×10', 350, 350, 10, 104.06, 'KP-350X350X10', jsonb_build_object('tr','Kare','en','Square'), '{"A":132.57,"Ix":25188.95,"Iy":25188.95,"Wx":1439.37,"Wy":1439.37,"ix":13.78,"iy":13.78,"u":1.357}'::jsonb, 116),
      ('350×350×12,5', 350, 350, 12.5, 127.2, 'KP-350X350X12.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":162.04,"Ix":30044.52,"Iy":30044.52,"Wx":1716.83,"Wy":1716.83,"ix":13.62,"iy":13.62,"u":1.336}'::jsonb, 117),
      ('400×400×6', 400, 400, 6, 73.5, 'KP-400X400X6', jsonb_build_object('tr','Kare','en','Square'), '{"A":93.63,"Ix":24104.17,"Iy":24104.17,"Wx":1205.21,"Wy":1205.21,"ix":16.04,"iy":16.04,"u":1.579}'::jsonb, 118),
      ('400×400×8', 400, 400, 8, 96.75, 'KP-400X400X8', jsonb_build_object('tr','Kare','en','Square'), '{"A":123.24,"Ix":31269.09,"Iy":31269.09,"Wx":1563.45,"Wy":1563.45,"ix":15.93,"iy":15.93,"u":1.566}'::jsonb, 119),
      ('400×400×10', 400, 400, 10, 119.76, 'KP-400X400X10', jsonb_build_object('tr','Kare','en','Square'), '{"A":152.57,"Ix":38215.75,"Iy":38215.75,"Wx":1910.79,"Wy":1910.79,"ix":15.83,"iy":15.83,"u":1.557}'::jsonb, 120),
      ('400×400×12,5', 400, 400, 12.5, 146.83, 'KP-400X400X12.5', jsonb_build_object('tr','Kare','en','Square'), '{"A":187.04,"Ix":45876.07,"Iy":45876.07,"Wx":2293.8,"Wy":2293.8,"ix":15.66,"iy":15.66,"u":1.536}'::jsonb, 121),
      ('20×10×1,2', 10, 20, 1.2, 0.49, 'KP-20X10X1.2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":0.63,"Ix":0.29,"Iy":0.09,"Wx":0.29,"Wy":0.19,"ix":0.68,"iy":0.39,"u":0.056}'::jsonb, 122),
      ('20×10×1,5', 10, 20, 1.5, 0.59, 'KP-20X10X1.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":0.75,"Ix":0.33,"Iy":0.11,"Wx":0.33,"Wy":0.21,"ix":0.66,"iy":0.37,"u":0.055}'::jsonb, 123),
      ('20×10×2', 10, 20, 2, 0.74, 'KP-20X10X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":0.94,"Ix":0.37,"Iy":0.12,"Wx":0.37,"Wy":0.23,"ix":0.63,"iy":0.35,"u":0.053}'::jsonb, 124),
      ('30×15×1,2', 15, 30, 1.2, 0.77, 'KP-30X15X1.2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":0.99,"Ix":1.09,"Iy":0.36,"Wx":0.72,"Wy":0.49,"ix":1.05,"iy":0.61,"u":0.086}'::jsonb, 125),
      ('30×15×1,5', 15, 30, 1.5, 0.94, 'KP-30X15X1.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":1.2,"Ix":1.28,"Iy":0.42,"Wx":0.85,"Wy":0.57,"ix":1.03,"iy":0.59,"u":0.085}'::jsonb, 126),
      ('30×15×2', 15, 30, 2, 1.21, 'KP-30X15X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":1.54,"Ix":1.54,"Iy":0.5,"Wx":1.03,"Wy":0.67,"ix":1,"iy":0.57,"u":0.083}'::jsonb, 127),
      ('30×15×2,5', 15, 30, 2.5, 1.44, 'KP-30X15X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":1.84,"Ix":1.73,"Iy":0.56,"Wx":1.16,"Wy":0.74,"ix":0.97,"iy":0.55,"u":0.081}'::jsonb, 128),
      ('30×15×3', 15, 30, 3, 1.65, 'KP-30X15X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":2.11,"Ix":1.86,"Iy":0.59,"Wx":1.24,"Wy":0.78,"ix":0.94,"iy":0.53,"u":0.08}'::jsonb, 129),
      ('30×20×1,2', 20, 30, 1.2, 0.87, 'KP-30X20X1.2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":1.11,"Ix":1.34,"Iy":0.71,"Wx":0.89,"Wy":0.71,"ix":1.1,"iy":0.8,"u":0.096}'::jsonb, 130),
      ('30×20×1,5', 20, 30, 1.5, 1.06, 'KP-30X20X1.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":1.35,"Ix":1.59,"Iy":0.84,"Wx":1.06,"Wy":0.84,"ix":1.08,"iy":0.79,"u":0.095}'::jsonb, 131),
      ('30×20×2', 20, 30, 2, 1.36, 'KP-30X20X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":1.74,"Ix":1.94,"Iy":1.02,"Wx":1.29,"Wy":1.02,"ix":1.06,"iy":0.77,"u":0.093}'::jsonb, 132),
      ('30×20×2,5', 20, 30, 2.5, 1.64, 'KP-30X20X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":2.09,"Ix":2.21,"Iy":1.15,"Wx":1.47,"Wy":1.15,"ix":1.03,"iy":0.74,"u":0.091}'::jsonb, 133),
      ('30×20×3', 20, 30, 3, 1.89, 'KP-30X20X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":2.41,"Ix":2.41,"Iy":1.25,"Wx":1.6,"Wy":1.25,"ix":1,"iy":0.72,"u":0.09}'::jsonb, 134),
      ('40×10×1,5', 10, 40, 1.5, 1.06, 'KP-40X10X1.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":1.35,"Ix":2.15,"Iy":0.21,"Wx":1.08,"Wy":0.43,"ix":1.26,"iy":0.4,"u":0.095}'::jsonb, 135),
      ('40×10×2', 10, 40, 2, 1.36, 'KP-40X10X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":1.74,"Ix":2.6,"Iy":0.25,"Wx":1.3,"Wy":0.49,"ix":1.22,"iy":0.38,"u":0.093}'::jsonb, 136),
      ('40×10×2,5', 10, 40, 2.5, 1.64, 'KP-40X10X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":2.09,"Ix":2.93,"Iy":0.26,"Wx":1.47,"Wy":0.53,"ix":1.19,"iy":0.36,"u":0.091}'::jsonb, 137),
      ('40×15×1,5', 15, 40, 1.5, 1.18, 'KP-40X15X1.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":1.5,"Ix":2.71,"Iy":0.56,"Wx":1.35,"Wy":0.75,"ix":1.34,"iy":0.61,"u":0.105}'::jsonb, 138),
      ('40×15×2', 15, 40, 2, 1.52, 'KP-40X15X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":1.94,"Ix":3.33,"Iy":0.67,"Wx":1.66,"Wy":0.9,"ix":1.31,"iy":0.59,"u":0.103}'::jsonb, 139),
      ('40×15×2,5', 15, 40, 2.5, 1.84, 'KP-40X15X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":2.34,"Ix":3.81,"Iy":0.75,"Wx":1.91,"Wy":1.01,"ix":1.28,"iy":0.57,"u":0.101}'::jsonb, 140),
      ('40×15×3', 15, 40, 3, 2.13, 'KP-40X15X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":2.71,"Ix":4.18,"Iy":0.81,"Wx":2.09,"Wy":1.08,"ix":1.24,"iy":0.55,"u":0.1}'::jsonb, 141),
      ('40×20×1,5', 20, 40, 1.5, 1.3, 'KP-40X20X1.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":1.65,"Ix":3.27,"Iy":1.1,"Wx":1.63,"Wy":1.1,"ix":1.41,"iy":0.81,"u":0.115}'::jsonb, 142),
      ('40×20×2', 20, 40, 2, 1.68, 'KP-40X20X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":2.14,"Ix":4.05,"Iy":1.34,"Wx":2.02,"Wy":1.34,"ix":1.38,"iy":0.79,"u":0.113}'::jsonb, 143),
      ('40×20×2,5', 20, 40, 2.5, 2.03, 'KP-40X20X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":2.59,"Ix":4.69,"Iy":1.54,"Wx":2.35,"Wy":1.54,"ix":1.35,"iy":0.77,"u":0.111}'::jsonb, 144),
      ('40×20×3', 20, 40, 3, 2.36, 'KP-40X20X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":3.01,"Ix":5.21,"Iy":1.68,"Wx":2.6,"Wy":1.68,"ix":1.32,"iy":0.75,"u":0.11}'::jsonb, 145),
      ('40×20×4', 20, 40, 4, 2.94, 'KP-40X20X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":3.75,"Ix":5.87,"Iy":1.86,"Wx":2.93,"Wy":1.86,"ix":1.25,"iy":0.7,"u":0.106}'::jsonb, 146),
      ('40×30×1,5', 30, 40, 1.5, 1.53, 'KP-40X30X1.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":1.95,"Ix":4.38,"Iy":2.81,"Wx":2.19,"Wy":1.87,"ix":1.5,"iy":1.2,"u":0.135}'::jsonb, 147),
      ('40×30×2', 30, 40, 2, 1.99, 'KP-40X30X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":2.54,"Ix":5.49,"Iy":3.51,"Wx":2.75,"Wy":2.34,"ix":1.47,"iy":1.18,"u":0.133}'::jsonb, 148),
      ('40×30×2,5', 30, 40, 2.5, 2.42, 'KP-40X30X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":3.09,"Ix":6.45,"Iy":4.1,"Wx":3.23,"Wy":2.74,"ix":1.45,"iy":1.15,"u":0.131}'::jsonb, 149),
      ('40×30×3', 30, 40, 3, 2.83, 'KP-40X30X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":3.61,"Ix":7.27,"Iy":4.6,"Wx":3.63,"Wy":3.07,"ix":1.42,"iy":1.13,"u":0.13}'::jsonb, 150),
      ('40×30×4', 30, 40, 4, 3.57, 'KP-40X30X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":4.55,"Ix":8.47,"Iy":5.33,"Wx":4.24,"Wy":3.55,"ix":1.36,"iy":1.08,"u":0.126}'::jsonb, 151),
      ('50×20×1,5', 20, 50, 1.5, 1.53, 'KP-50X20X1.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":1.95,"Ix":5.77,"Iy":1.35,"Wx":2.31,"Wy":1.35,"ix":1.72,"iy":0.83,"u":0.135}'::jsonb, 152),
      ('50×20×2', 20, 50, 2, 1.99, 'KP-50X20X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":2.54,"Ix":7.23,"Iy":1.67,"Wx":2.89,"Wy":1.67,"ix":1.69,"iy":0.81,"u":0.133}'::jsonb, 153),
      ('50×20×2,5', 20, 50, 2.5, 2.42, 'KP-50X20X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":3.09,"Ix":8.47,"Iy":1.92,"Wx":3.39,"Wy":1.92,"ix":1.66,"iy":0.79,"u":0.131}'::jsonb, 154),
      ('50×20×3', 20, 50, 3, 2.83, 'KP-50X20X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":3.61,"Ix":9.51,"Iy":2.12,"Wx":3.81,"Wy":2.12,"ix":1.62,"iy":0.77,"u":0.13}'::jsonb, 155),
      ('50×20×4', 20, 50, 4, 3.57, 'KP-50X20X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":4.55,"Ix":11.01,"Iy":2.38,"Wx":4.4,"Wy":2.38,"ix":1.56,"iy":0.72,"u":0.126}'::jsonb, 156),
      ('50×25×1,5', 25, 50, 1.5, 1.65, 'KP-50X25X1.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":2.1,"Ix":6.65,"Iy":2.25,"Wx":2.66,"Wy":1.8,"ix":1.78,"iy":1.04,"u":0.145}'::jsonb, 157),
      ('50×25×2', 25, 50, 2, 2.15, 'KP-50X25X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":2.74,"Ix":8.38,"Iy":2.81,"Wx":3.35,"Wy":2.25,"ix":1.75,"iy":1.01,"u":0.143}'::jsonb, 158),
      ('50×25×2,5', 25, 50, 2.5, 2.62, 'KP-50X25X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":3.34,"Ix":9.89,"Iy":3.28,"Wx":3.95,"Wy":2.62,"ix":1.72,"iy":0.99,"u":0.141}'::jsonb, 159),
      ('50×25×3', 25, 50, 3, 3.07, 'KP-50X25X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":3.91,"Ix":11.17,"Iy":3.67,"Wx":4.47,"Wy":2.93,"ix":1.69,"iy":0.97,"u":0.14}'::jsonb, 160),
      ('50×25×4', 25, 50, 4, 3.88, 'KP-50X25X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":4.95,"Ix":13.13,"Iy":4.23,"Wx":5.25,"Wy":3.38,"ix":1.63,"iy":0.92,"u":0.136}'::jsonb, 161),
      ('50×30×1,5', 30, 50, 1.5, 1.77, 'KP-50X30X1.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":2.25,"Ix":7.54,"Iy":3.42,"Wx":3.01,"Wy":2.28,"ix":1.83,"iy":1.23,"u":0.155}'::jsonb, 162),
      ('50×30×2', 30, 50, 2, 2.31, 'KP-50X30X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":2.94,"Ix":9.54,"Iy":4.29,"Wx":3.81,"Wy":2.86,"ix":1.8,"iy":1.21,"u":0.153}'::jsonb, 163),
      ('50×30×2,5', 30, 50, 2.5, 2.82, 'KP-50X30X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":3.59,"Ix":11.3,"Iy":5.05,"Wx":4.52,"Wy":3.37,"ix":1.77,"iy":1.19,"u":0.151}'::jsonb, 164),
      ('50×30×3', 30, 50, 3, 3.3, 'KP-50X30X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":4.21,"Ix":12.83,"Iy":5.7,"Wx":5.13,"Wy":3.8,"ix":1.75,"iy":1.16,"u":0.15}'::jsonb, 165),
      ('50×30×4', 30, 50, 4, 4.2, 'KP-50X30X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":5.35,"Ix":15.25,"Iy":6.69,"Wx":6.1,"Wy":4.46,"ix":1.69,"iy":1.12,"u":0.146}'::jsonb, 166),
      ('60×20×2', 20, 60, 2, 2.31, 'KP-60X20X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":2.94,"Ix":11.68,"Iy":1.99,"Wx":3.89,"Wy":1.99,"ix":1.99,"iy":0.82,"u":0.153}'::jsonb, 167),
      ('60×20×2,5', 20, 60, 2.5, 2.82, 'KP-60X20X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":3.59,"Ix":13.8,"Iy":2.31,"Wx":4.6,"Wy":2.31,"ix":1.96,"iy":0.8,"u":0.151}'::jsonb, 168),
      ('60×20×3', 20, 60, 3, 3.3, 'KP-60X20X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":4.21,"Ix":15.62,"Iy":2.56,"Wx":5.21,"Wy":2.56,"ix":1.93,"iy":0.78,"u":0.15}'::jsonb, 169),
      ('60×20×4', 20, 60, 4, 4.2, 'KP-60X20X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":5.35,"Ix":18.42,"Iy":2.9,"Wx":6.14,"Wy":2.9,"ix":1.86,"iy":0.74,"u":0.146}'::jsonb, 170),
      ('60×20×5', 20, 60, 5, 4.99, 'KP-60X20X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":6.36,"Ix":20.16,"Iy":3.07,"Wx":6.72,"Wy":3.07,"ix":1.78,"iy":0.69,"u":0.143}'::jsonb, 171),
      ('60×30×2', 30, 60, 2, 2.62, 'KP-60X30X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":3.34,"Ix":15.05,"Iy":5.08,"Wx":5.02,"Wy":3.39,"ix":2.12,"iy":1.23,"u":0.173}'::jsonb, 172),
      ('60×30×2,5', 30, 60, 2.5, 3.21, 'KP-60X30X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":4.09,"Ix":17.94,"Iy":6,"Wx":5.98,"Wy":4,"ix":2.09,"iy":1.21,"u":0.171}'::jsonb, 173),
      ('60×30×3', 30, 60, 3, 3.77, 'KP-60X30X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":4.81,"Ix":20.5,"Iy":6.8,"Wx":6.83,"Wy":4.53,"ix":2.06,"iy":1.19,"u":0.17}'::jsonb, 174),
      ('60×30×4', 30, 60, 4, 4.83, 'KP-60X30X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":6.15,"Ix":24.7,"Iy":8.06,"Wx":8.23,"Wy":5.37,"ix":2,"iy":1.14,"u":0.166}'::jsonb, 175),
      ('60×30×5', 30, 60, 5, 5.77, 'KP-60X30X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":7.36,"Ix":27.74,"Iy":8.91,"Wx":9.25,"Wy":5.94,"ix":1.94,"iy":1.1,"u":0.163}'::jsonb, 176),
      ('60×40×2', 40, 60, 2, 2.93, 'KP-60X40X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":3.74,"Ix":18.41,"Iy":9.83,"Wx":6.14,"Wy":4.92,"ix":2.22,"iy":1.62,"u":0.193}'::jsonb, 177),
      ('60×40×2,5', 40, 60, 2.5, 3.6, 'KP-60X40X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":4.59,"Ix":22.07,"Iy":11.74,"Wx":7.36,"Wy":5.87,"ix":2.19,"iy":1.6,"u":0.191}'::jsonb, 178),
      ('60×40×3', 40, 60, 3, 4.25, 'KP-60X40X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":5.41,"Ix":25.38,"Iy":13.44,"Wx":8.46,"Wy":6.72,"ix":2.17,"iy":1.58,"u":0.19}'::jsonb, 179),
      ('60×40×4', 40, 60, 4, 5.45, 'KP-60X40X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":6.95,"Ix":30.99,"Iy":16.28,"Wx":10.33,"Wy":8.14,"ix":2.11,"iy":1.53,"u":0.186}'::jsonb, 180),
      ('60×40×5', 40, 60, 5, 6.56, 'KP-60X40X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":8.36,"Ix":35.33,"Iy":18.43,"Wx":11.78,"Wy":9.21,"ix":2.06,"iy":1.48,"u":0.183}'::jsonb, 181),
      ('70×30×2', 30, 70, 2, 2.93, 'KP-70X30X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":3.74,"Ix":22.22,"Iy":5.86,"Wx":6.35,"Wy":3.91,"ix":2.44,"iy":1.25,"u":0.193}'::jsonb, 182),
      ('70×30×2,5', 30, 70, 2.5, 3.6, 'KP-70X30X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":4.59,"Ix":26.62,"Iy":6.95,"Wx":7.61,"Wy":4.63,"ix":2.41,"iy":1.23,"u":0.191}'::jsonb, 183),
      ('70×30×3', 30, 70, 3, 4.25, 'KP-70X30X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":5.41,"Ix":30.57,"Iy":7.9,"Wx":8.74,"Wy":5.26,"ix":2.38,"iy":1.21,"u":0.19}'::jsonb, 184),
      ('70×30×4', 30, 70, 4, 5.45, 'KP-70X30X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":6.95,"Ix":37.23,"Iy":9.42,"Wx":10.64,"Wy":6.28,"ix":2.31,"iy":1.16,"u":0.186}'::jsonb, 185),
      ('70×30×5', 30, 70, 5, 6.56, 'KP-70X30X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":8.36,"Ix":42.29,"Iy":10.49,"Wx":12.08,"Wy":6.99,"ix":2.25,"iy":1.12,"u":0.183}'::jsonb, 186),
      ('70×40×2', 40, 70, 2, 3.25, 'KP-70X40X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":4.14,"Ix":26.85,"Iy":11.28,"Wx":7.67,"Wy":5.64,"ix":2.55,"iy":1.65,"u":0.213}'::jsonb, 187),
      ('70×40×2,5', 40, 70, 2.5, 3.99, 'KP-70X40X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":5.09,"Ix":32.32,"Iy":13.5,"Wx":9.23,"Wy":6.75,"ix":2.52,"iy":1.63,"u":0.211}'::jsonb, 188),
      ('70×40×3', 40, 70, 3, 4.72, 'KP-70X40X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":6.01,"Ix":37.31,"Iy":15.5,"Wx":10.66,"Wy":7.75,"ix":2.49,"iy":1.61,"u":0.21}'::jsonb, 189),
      ('70×40×4', 40, 70, 4, 6.08, 'KP-70X40X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":7.75,"Ix":45.95,"Iy":18.88,"Wx":13.13,"Wy":9.44,"ix":2.44,"iy":1.56,"u":0.206}'::jsonb, 190),
      ('70×40×5', 40, 70, 5, 7.34, 'KP-70X40X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":9.36,"Ix":52.88,"Iy":21.51,"Wx":15.11,"Wy":10.75,"ix":2.38,"iy":1.52,"u":0.203}'::jsonb, 191),
      ('70×50×2', 50, 70, 2, 3.56, 'KP-70X50X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":4.54,"Ix":31.48,"Iy":18.76,"Wx":8.99,"Wy":7.5,"ix":2.63,"iy":2.03,"u":0.233}'::jsonb, 192),
      ('70×50×2,5', 50, 70, 2.5, 4.39, 'KP-70X50X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":5.59,"Ix":38.01,"Iy":22.59,"Wx":10.86,"Wy":9.04,"ix":2.61,"iy":2.01,"u":0.231}'::jsonb, 193),
      ('70×50×3', 50, 70, 3, 5.19, 'KP-70X50X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":6.61,"Ix":44.05,"Iy":26.1,"Wx":12.59,"Wy":10.44,"ix":2.58,"iy":1.99,"u":0.23}'::jsonb, 194),
      ('70×50×4', 50, 70, 4, 6.71, 'KP-70X50X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":8.55,"Ix":54.67,"Iy":32.22,"Wx":15.62,"Wy":12.89,"ix":2.53,"iy":1.94,"u":0.226}'::jsonb, 195),
      ('70×50×5', 50, 70, 5, 8.13, 'KP-70X50X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":10.36,"Ix":63.46,"Iy":37.2,"Wx":18.13,"Wy":14.88,"ix":2.48,"iy":1.9,"u":0.223}'::jsonb, 196),
      ('80×20×2', 20, 80, 2, 2.93, 'KP-80X20X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":3.74,"Ix":25.19,"Iy":2.64,"Wx":6.3,"Wy":2.64,"ix":2.6,"iy":0.84,"u":0.193}'::jsonb, 197),
      ('80×20×2,5', 20, 80, 2.5, 3.6, 'KP-80X20X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":4.59,"Ix":30.08,"Iy":3.08,"Wx":7.52,"Wy":3.08,"ix":2.56,"iy":0.82,"u":0.191}'::jsonb, 198),
      ('80×20×3', 20, 80, 3, 4.25, 'KP-80X20X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":5.41,"Ix":34.45,"Iy":3.44,"Wx":8.61,"Wy":3.44,"ix":2.52,"iy":0.8,"u":0.19}'::jsonb, 199),
      ('80×20×4', 20, 80, 4, 5.45, 'KP-80X20X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":6.95,"Ix":41.67,"Iy":3.95,"Wx":10.42,"Wy":3.95,"ix":2.45,"iy":0.75,"u":0.186}'::jsonb, 200),
      ('80×20×5', 20, 80, 5, 6.56, 'KP-80X20X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":8.36,"Ix":46.94,"Iy":4.24,"Wx":11.74,"Wy":4.24,"ix":2.37,"iy":0.71,"u":0.183}'::jsonb, 201),
      ('80×40×2', 40, 80, 2, 3.56, 'KP-80X40X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":4.54,"Ix":37.36,"Iy":12.72,"Wx":9.34,"Wy":6.36,"ix":2.87,"iy":1.67,"u":0.233}'::jsonb, 202),
      ('80×40×2,5', 40, 80, 2.5, 4.39, 'KP-80X40X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":5.59,"Ix":45.11,"Iy":15.26,"Wx":11.28,"Wy":7.63,"ix":2.84,"iy":1.65,"u":0.231}'::jsonb, 203),
      ('80×40×3', 40, 80, 3, 5.19, 'KP-80X40X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":6.61,"Ix":52.25,"Iy":17.56,"Wx":13.06,"Wy":8.78,"ix":2.81,"iy":1.63,"u":0.23}'::jsonb, 204),
      ('80×40×4', 40, 80, 4, 6.71, 'KP-80X40X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":8.55,"Ix":64.79,"Iy":21.49,"Wx":16.2,"Wy":10.74,"ix":2.75,"iy":1.59,"u":0.226}'::jsonb, 205),
      ('80×40×5', 40, 80, 5, 8.13, 'KP-80X40X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":10.36,"Ix":75.11,"Iy":24.59,"Wx":18.78,"Wy":12.3,"ix":2.69,"iy":1.54,"u":0.223}'::jsonb, 206),
      ('80×60×2', 60, 80, 2, 4.19, 'KP-80X60X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":5.34,"Ix":49.53,"Iy":31.87,"Wx":12.38,"Wy":10.62,"ix":3.05,"iy":2.44,"u":0.273}'::jsonb, 207),
      ('80×60×2,5', 60, 80, 2.5, 5.17, 'KP-80X60X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":6.59,"Ix":60.13,"Iy":38.61,"Wx":15.03,"Wy":12.87,"ix":3.02,"iy":2.42,"u":0.271}'::jsonb, 208),
      ('80×60×3', 60, 80, 3, 6.13, 'KP-80X60X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":7.81,"Ix":70.05,"Iy":44.89,"Wx":17.51,"Wy":14.96,"ix":3,"iy":2.4,"u":0.27}'::jsonb, 209),
      ('80×60×4', 60, 80, 4, 7.97, 'KP-80X60X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":10.15,"Ix":87.92,"Iy":56.12,"Wx":21.98,"Wy":18.71,"ix":2.94,"iy":2.35,"u":0.266}'::jsonb, 210),
      ('80×60×5', 60, 80, 5, 9.7, 'KP-80X60X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":12.36,"Ix":103.27,"Iy":65.66,"Wx":25.82,"Wy":21.89,"ix":2.89,"iy":2.31,"u":0.263}'::jsonb, 211),
      ('90×50×2', 50, 90, 2, 4.19, 'KP-90X50X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":5.34,"Ix":57.88,"Iy":23.37,"Wx":12.86,"Wy":9.35,"ix":3.29,"iy":2.09,"u":0.273}'::jsonb, 212),
      ('90×50×2,5', 50, 90, 2.5, 5.17, 'KP-90X50X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":6.59,"Ix":70.26,"Iy":28.24,"Wx":15.61,"Wy":11.29,"ix":3.27,"iy":2.07,"u":0.271}'::jsonb, 213),
      ('90×50×3', 50, 90, 3, 6.13, 'KP-90X50X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":7.81,"Ix":81.85,"Iy":32.74,"Wx":18.19,"Wy":13.1,"ix":3.24,"iy":2.05,"u":0.27}'::jsonb, 214),
      ('90×50×4', 50, 90, 4, 7.97, 'KP-90X50X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":10.15,"Ix":102.71,"Iy":40.71,"Wx":22.82,"Wy":16.28,"ix":3.18,"iy":2,"u":0.266}'::jsonb, 215),
      ('90×50×5', 50, 90, 5, 9.7, 'KP-90X50X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":12.36,"Ix":120.6,"Iy":47.37,"Wx":26.8,"Wy":18.95,"ix":3.12,"iy":1.96,"u":0.263}'::jsonb, 216),
      ('90×50×6', 50, 90, 6, 11.33, 'KP-90X50X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":14.43,"Ix":135.66,"Iy":52.83,"Wx":30.15,"Wy":21.13,"ix":3.07,"iy":1.91,"u":0.259}'::jsonb, 217),
      ('100×20×2', 20, 100, 2, 3.56, 'KP-100X20X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":4.54,"Ix":46.17,"Iy":3.29,"Wx":9.23,"Wy":3.29,"ix":3.19,"iy":0.85,"u":0.233}'::jsonb, 218),
      ('100×20×2,5', 20, 100, 2.5, 4.39, 'KP-100X20X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":5.59,"Ix":55.55,"Iy":3.85,"Wx":11.11,"Wy":3.85,"ix":3.15,"iy":0.83,"u":0.231}'::jsonb, 219),
      ('100×20×3', 20, 100, 3, 5.19, 'KP-100X20X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":6.61,"Ix":64.1,"Iy":4.31,"Wx":12.82,"Wy":4.31,"ix":3.11,"iy":0.81,"u":0.23}'::jsonb, 220),
      ('100×20×4', 20, 100, 4, 6.71, 'KP-100X20X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":8.55,"Ix":78.81,"Iy":5,"Wx":15.76,"Wy":5,"ix":3.04,"iy":0.76,"u":0.226}'::jsonb, 221),
      ('100×20×5', 20, 100, 5, 8.13, 'KP-100X20X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":10.36,"Ix":90.43,"Iy":5.4,"Wx":18.09,"Wy":5.4,"ix":2.96,"iy":0.72,"u":0.223}'::jsonb, 222),
      ('100×30×2', 30, 100, 2, 3.88, 'KP-100X30X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":4.94,"Ix":55.77,"Iy":8.22,"Wx":11.15,"Wy":5.48,"ix":3.36,"iy":1.29,"u":0.253}'::jsonb, 223),
      ('100×30×2,5', 30, 100, 2.5, 4.78, 'KP-100X30X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":6.09,"Ix":67.43,"Iy":9.79,"Wx":13.49,"Wy":6.53,"ix":3.33,"iy":1.27,"u":0.251}'::jsonb, 224),
      ('100×30×3', 30, 100, 3, 5.66, 'KP-100X30X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":7.21,"Ix":78.22,"Iy":11.19,"Wx":15.64,"Wy":7.46,"ix":3.29,"iy":1.25,"u":0.25}'::jsonb, 225),
      ('100×30×4', 30, 100, 4, 7.34, 'KP-100X30X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":9.35,"Ix":97.25,"Iy":13.51,"Wx":19.45,"Wy":9,"ix":3.23,"iy":1.2,"u":0.246}'::jsonb, 226),
      ('100×30×5', 30, 100, 5, 8.91, 'KP-100X30X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":11.36,"Ix":113.02,"Iy":15.24,"Wx":22.6,"Wy":10.16,"ix":3.15,"iy":1.16,"u":0.243}'::jsonb, 227),
      ('100×30×6', 30, 100, 6, 10.39, 'KP-100X30X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":13.23,"Ix":125.66,"Iy":16.47,"Wx":25.13,"Wy":10.98,"ix":3.08,"iy":1.12,"u":0.239}'::jsonb, 228),
      ('100×40×2', 40, 100, 2, 4.19, 'KP-100X40X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":5.34,"Ix":65.38,"Iy":15.61,"Wx":13.08,"Wy":7.81,"ix":3.5,"iy":1.71,"u":0.273}'::jsonb, 229),
      ('100×40×2,5', 40, 100, 2.5, 5.17, 'KP-100X40X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":6.59,"Ix":79.32,"Iy":18.78,"Wx":15.86,"Wy":9.39,"ix":3.47,"iy":1.69,"u":0.271}'::jsonb, 230),
      ('100×40×3', 40, 100, 3, 6.13, 'KP-100X40X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":7.81,"Ix":92.34,"Iy":21.67,"Wx":18.47,"Wy":10.84,"ix":3.44,"iy":1.67,"u":0.27}'::jsonb, 231),
      ('100×40×4', 40, 100, 4, 7.97, 'KP-100X40X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":10.15,"Ix":115.69,"Iy":26.69,"Wx":23.14,"Wy":13.35,"ix":3.38,"iy":1.62,"u":0.266}'::jsonb, 232),
      ('100×40×5', 40, 100, 5, 9.7, 'KP-100X40X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":12.36,"Ix":135.6,"Iy":30.76,"Wx":27.12,"Wy":15.38,"ix":3.31,"iy":1.58,"u":0.263}'::jsonb, 233),
      ('100×40×6', 40, 100, 6, 11.33, 'KP-100X40X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":14.43,"Ix":152.21,"Iy":33.96,"Wx":30.44,"Wy":16.98,"ix":3.25,"iy":1.53,"u":0.259}'::jsonb, 234),
      ('100×50×2', 50, 100, 2, 4.5, 'KP-100X50X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":5.74,"Ix":74.98,"Iy":25.67,"Wx":15,"Wy":10.27,"ix":3.62,"iy":2.12,"u":0.293}'::jsonb, 235),
      ('100×50×2,5', 50, 100, 2.5, 5.56, 'KP-100X50X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":7.09,"Ix":91.2,"Iy":31.06,"Wx":18.24,"Wy":12.42,"ix":3.59,"iy":2.09,"u":0.291}'::jsonb, 236),
      ('100×50×3', 50, 100, 3, 6.6, 'KP-100X50X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":8.41,"Ix":106.46,"Iy":36.06,"Wx":21.29,"Wy":14.42,"ix":3.56,"iy":2.07,"u":0.29}'::jsonb, 237),
      ('100×50×4', 50, 100, 4, 8.59, 'KP-100X50X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":10.95,"Ix":134.14,"Iy":44.95,"Wx":26.83,"Wy":17.98,"ix":3.5,"iy":2.03,"u":0.286}'::jsonb, 238),
      ('100×50×5', 50, 100, 5, 10.48, 'KP-100X50X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":13.36,"Ix":158.18,"Iy":52.45,"Wx":31.64,"Wy":20.98,"ix":3.44,"iy":1.98,"u":0.283}'::jsonb, 239),
      ('100×50×6', 50, 100, 6, 12.27, 'KP-100X50X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":15.63,"Ix":178.75,"Iy":58.67,"Wx":35.75,"Wy":23.47,"ix":3.38,"iy":1.94,"u":0.279}'::jsonb, 240),
      ('100×60×2', 60, 100, 2, 4.82, 'KP-100X60X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":6.14,"Ix":84.59,"Iy":38.6,"Wx":16.92,"Wy":12.87,"ix":3.71,"iy":2.51,"u":0.313}'::jsonb, 241),
      ('100×60×2,5', 60, 100, 2.5, 5.96, 'KP-100X60X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":7.59,"Ix":103.09,"Iy":46.88,"Wx":20.62,"Wy":15.63,"ix":3.69,"iy":2.49,"u":0.311}'::jsonb, 242),
      ('100×60×3', 60, 100, 3, 7.07, 'KP-100X60X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":9.01,"Ix":120.57,"Iy":54.65,"Wx":24.11,"Wy":18.22,"ix":3.66,"iy":2.46,"u":0.31}'::jsonb, 243),
      ('100×60×4', 60, 100, 4, 9.22, 'KP-100X60X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":11.75,"Ix":152.58,"Iy":68.68,"Wx":30.52,"Wy":22.89,"ix":3.6,"iy":2.42,"u":0.306}'::jsonb, 244),
      ('100×60×5', 60, 100, 5, 11.27, 'KP-100X60X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":14.36,"Ix":180.77,"Iy":80.83,"Wx":36.15,"Wy":26.94,"ix":3.55,"iy":2.37,"u":0.303}'::jsonb, 245),
      ('100×60×6', 60, 100, 6, 13.21, 'KP-100X60X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":16.83,"Ix":205.29,"Iy":91.2,"Wx":41.06,"Wy":30.4,"ix":3.49,"iy":2.33,"u":0.299}'::jsonb, 246),
      ('100×80×2', 80, 100, 2, 5.45, 'KP-100X80X2', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":6.94,"Ix":103.8,"Iy":73.87,"Wx":20.76,"Wy":18.47,"ix":3.87,"iy":3.26,"u":0.353}'::jsonb, 247),
      ('100×80×2,5', 80, 100, 2.5, 6.74, 'KP-100X80X2.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":8.59,"Ix":126.86,"Iy":90.17,"Wx":25.37,"Wy":22.54,"ix":3.84,"iy":3.24,"u":0.351}'::jsonb, 248),
      ('100×80×3', 80, 100, 3, 8.01, 'KP-100X80X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":10.21,"Ix":148.81,"Iy":105.64,"Wx":29.76,"Wy":26.41,"ix":3.82,"iy":3.22,"u":0.35}'::jsonb, 249),
      ('100×80×4', 80, 100, 4, 10.48, 'KP-100X80X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":13.35,"Ix":189.46,"Iy":134.17,"Wx":37.89,"Wy":33.54,"ix":3.77,"iy":3.17,"u":0.346}'::jsonb, 250),
      ('100×80×5', 80, 100, 5, 12.84, 'KP-100X80X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":16.36,"Ix":225.93,"Iy":159.61,"Wx":45.19,"Wy":39.9,"ix":3.72,"iy":3.12,"u":0.343}'::jsonb, 251),
      ('100×80×6', 80, 100, 6, 15.1, 'KP-100X80X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":19.23,"Ix":258.38,"Iy":182.1,"Wx":51.68,"Wy":45.53,"ix":3.67,"iy":3.08,"u":0.339}'::jsonb, 252),
      ('120×40×3', 40, 120, 3, 7.07, 'KP-120X40X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":9.01,"Ix":148.04,"Iy":25.79,"Wx":24.67,"Wy":12.89,"ix":4.05,"iy":1.69,"u":0.31}'::jsonb, 253),
      ('120×40×4', 40, 120, 4, 9.22, 'KP-120X40X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":11.75,"Ix":186.89,"Iy":31.9,"Wx":31.15,"Wy":15.95,"ix":3.99,"iy":1.65,"u":0.306}'::jsonb, 254),
      ('120×40×5', 40, 120, 5, 11.27, 'KP-120X40X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":14.36,"Ix":220.8,"Iy":36.93,"Wx":36.8,"Wy":18.46,"ix":3.92,"iy":1.6,"u":0.303}'::jsonb, 255),
      ('120×40×6', 40, 120, 6, 13.21, 'KP-120X40X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":16.83,"Ix":249.96,"Iy":40.97,"Wx":41.66,"Wy":20.49,"ix":3.85,"iy":1.56,"u":0.299}'::jsonb, 256),
      ('120×40×8', 40, 120, 8, 16.36, 'KP-120X40X8', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":20.84,"Ix":274.77,"Iy":44.39,"Wx":45.8,"Wy":22.19,"ix":3.63,"iy":1.46,"u":0.286}'::jsonb, 257),
      ('120×60×3', 60, 120, 3, 8.01, 'KP-120X60X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":10.21,"Ix":189.12,"Iy":64.4,"Wx":31.52,"Wy":21.47,"ix":4.3,"iy":2.51,"u":0.35}'::jsonb, 258),
      ('120×60×4', 60, 120, 4, 10.48, 'KP-120X60X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":13.35,"Ix":240.74,"Iy":81.25,"Wx":40.12,"Wy":27.08,"ix":4.25,"iy":2.47,"u":0.346}'::jsonb, 259),
      ('120×60×5', 60, 120, 5, 12.84, 'KP-120X60X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":16.36,"Ix":286.97,"Iy":95.99,"Wx":47.83,"Wy":32,"ix":4.19,"iy":2.42,"u":0.343}'::jsonb, 260),
      ('120×60×6', 60, 120, 6, 15.1, 'KP-120X60X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":19.23,"Ix":328.01,"Iy":108.77,"Wx":54.67,"Wy":36.26,"ix":4.13,"iy":2.38,"u":0.339}'::jsonb, 261),
      ('120×60×8', 60, 120, 8, 18.87, 'KP-120X60X8', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":24.04,"Ix":375.3,"Iy":123.98,"Wx":62.55,"Wy":41.33,"ix":3.95,"iy":2.27,"u":0.326}'::jsonb, 262),
      ('120×80×3', 80, 120, 3, 8.96, 'KP-120X80X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":11.41,"Ix":230.19,"Iy":123.43,"Wx":38.37,"Wy":30.86,"ix":4.49,"iy":3.29,"u":0.39}'::jsonb, 263),
      ('120×80×4', 80, 120, 4, 11.73, 'KP-120X80X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":14.95,"Ix":294.58,"Iy":157.29,"Wx":49.1,"Wy":39.32,"ix":4.44,"iy":3.24,"u":0.386}'::jsonb, 264),
      ('120×80×5', 80, 120, 5, 14.41, 'KP-120X80X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":18.36,"Ix":353.14,"Iy":187.77,"Wx":58.86,"Wy":46.94,"ix":4.39,"iy":3.2,"u":0.383}'::jsonb, 265),
      ('120×80×6', 80, 120, 6, 16.98, 'KP-120X80X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":21.63,"Ix":406.06,"Iy":215.03,"Wx":67.68,"Wy":53.76,"ix":4.33,"iy":3.15,"u":0.379}'::jsonb, 266),
      ('120×80×8', 80, 120, 8, 21.39, 'KP-120X80X8', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":27.24,"Ix":475.82,"Iy":251.66,"Wx":79.3,"Wy":62.91,"ix":4.18,"iy":3.04,"u":0.366}'::jsonb, 267),
      ('140×60×3', 60, 140, 3, 8.96, 'KP-140X60X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":11.41,"Ix":278.08,"Iy":74.16,"Wx":39.73,"Wy":24.72,"ix":4.94,"iy":2.55,"u":0.39}'::jsonb, 268),
      ('140×60×4', 60, 140, 4, 11.73, 'KP-140X60X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":14.95,"Ix":355.59,"Iy":93.81,"Wx":50.8,"Wy":31.27,"ix":4.88,"iy":2.51,"u":0.386}'::jsonb, 269),
      ('140×60×5', 60, 140, 5, 14.41, 'KP-140X60X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":18.36,"Ix":425.89,"Iy":111.16,"Wx":60.84,"Wy":37.05,"ix":4.82,"iy":2.46,"u":0.383}'::jsonb, 270),
      ('140×60×6', 60, 140, 6, 16.98, 'KP-140X60X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":21.63,"Ix":489.19,"Iy":126.34,"Wx":69.88,"Wy":42.11,"ix":4.76,"iy":2.42,"u":0.379}'::jsonb, 271),
      ('140×60×8', 60, 140, 8, 21.39, 'KP-140X60X8', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":27.24,"Ix":568.5,"Iy":145.78,"Wx":81.21,"Wy":48.59,"ix":4.57,"iy":2.31,"u":0.366}'::jsonb, 272),
      ('140×80×3', 80, 140, 3, 9.9, 'KP-140X80X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":12.61,"Ix":334.39,"Iy":141.23,"Wx":47.77,"Wy":35.31,"ix":5.15,"iy":3.35,"u":0.43}'::jsonb, 273),
      ('140×80×4', 80, 140, 4, 12.99, 'KP-140X80X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":16.55,"Ix":429.6,"Iy":180.42,"Wx":61.37,"Wy":45.1,"ix":5.1,"iy":3.3,"u":0.426}'::jsonb, 274),
      ('140×80×5', 80, 140, 5, 15.98, 'KP-140X80X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":20.36,"Ix":517.05,"Iy":215.94,"Wx":73.86,"Wy":53.99,"ix":5.04,"iy":3.26,"u":0.423}'::jsonb, 275),
      ('140×80×6', 80, 140, 6, 18.87, 'KP-140X80X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":24.03,"Ix":596.99,"Iy":247.96,"Wx":85.28,"Wy":61.99,"ix":4.98,"iy":3.21,"u":0.419}'::jsonb, 276),
      ('140×80×8', 80, 140, 8, 23.9, 'KP-140X80X8', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":30.44,"Ix":708.07,"Iy":293.3,"Wx":101.15,"Wy":73.32,"ix":4.82,"iy":3.1,"u":0.406}'::jsonb, 277),
      ('150×50×3', 50, 150, 3, 8.96, 'KP-150X50X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":11.41,"Ix":298.55,"Iy":52.65,"Wx":39.81,"Wy":21.06,"ix":5.12,"iy":2.15,"u":0.39}'::jsonb, 278),
      ('150×50×4', 50, 150, 4, 11.73, 'KP-150X50X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":14.95,"Ix":381.39,"Iy":66.16,"Wx":50.85,"Wy":26.46,"ix":5.05,"iy":2.1,"u":0.386}'::jsonb, 279),
      ('150×50×5', 50, 150, 5, 14.41, 'KP-150X50X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":18.36,"Ix":456.28,"Iy":77.87,"Wx":60.84,"Wy":31.15,"ix":4.99,"iy":2.06,"u":0.383}'::jsonb, 280),
      ('150×50×6', 50, 150, 6, 16.98, 'KP-150X50X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":21.63,"Ix":523.46,"Iy":87.89,"Wx":69.79,"Wy":35.16,"ix":4.92,"iy":2.02,"u":0.379}'::jsonb, 281),
      ('150×50×8', 50, 150, 8, 21.39, 'KP-150X50X8', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":27.24,"Ix":604.4,"Iy":100,"Wx":80.59,"Wy":40,"ix":4.71,"iy":1.92,"u":0.366}'::jsonb, 282),
      ('150×100×3', 100, 150, 3, 11.31, 'KP-150X100X3', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":14.41,"Ix":460.64,"Iy":247.64,"Wx":61.42,"Wy":49.53,"ix":5.65,"iy":4.15,"u":0.49}'::jsonb, 283),
      ('150×100×4', 100, 150, 4, 14.87, 'KP-150X100X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":18.95,"Ix":594.6,"Iy":318.56,"Wx":79.28,"Wy":63.71,"ix":5.6,"iy":4.1,"u":0.486}'::jsonb, 284),
      ('150×100×5', 100, 150, 5, 18.33, 'KP-150X100X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":23.36,"Ix":719.2,"Iy":384.02,"Wx":95.89,"Wy":76.8,"ix":5.55,"iy":4.05,"u":0.483}'::jsonb, 285),
      ('150×100×6', 100, 150, 6, 21.69, 'KP-150X100X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":27.63,"Ix":834.68,"Iy":444.19,"Wx":111.29,"Wy":88.84,"ix":5.5,"iy":4.01,"u":0.479}'::jsonb, 286),
      ('150×100×8', 100, 150, 8, 27.67, 'KP-150X100X8', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":35.24,"Ix":1008.11,"Iy":535.64,"Wx":134.41,"Wy":107.13,"ix":5.35,"iy":3.9,"u":0.466}'::jsonb, 287),
      ('160×80×4', 80, 160, 4, 14.25, 'KP-160X80X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":18.15,"Ix":597.71,"Iy":203.54,"Wx":74.71,"Wy":50.89,"ix":5.74,"iy":3.35,"u":0.466}'::jsonb, 288),
      ('160×80×5', 80, 160, 5, 17.55, 'KP-160X80X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":22.36,"Ix":721.68,"Iy":244.11,"Wx":90.21,"Wy":61.03,"ix":5.68,"iy":3.3,"u":0.463}'::jsonb, 289),
      ('160×80×6', 80, 160, 6, 20.75, 'KP-160X80X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":26.43,"Ix":836,"Iy":280.89,"Wx":104.5,"Wy":70.22,"ix":5.62,"iy":3.26,"u":0.459}'::jsonb, 290),
      ('160×80×8', 80, 160, 8, 26.41, 'KP-160X80X8', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":33.64,"Ix":1001.2,"Iy":334.94,"Wx":125.15,"Wy":83.74,"ix":5.46,"iy":3.16,"u":0.446}'::jsonb, 291),
      ('160×80×10', 80, 160, 10, 31.84, 'KP-160X80X10', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":40.57,"Ix":1146.3,"Iy":379.8,"Wx":143.29,"Wy":94.95,"ix":5.32,"iy":3.06,"u":0.437}'::jsonb, 292),
      ('180×100×4', 100, 180, 4, 16.76, 'KP-180X100X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":21.35,"Ix":926.04,"Iy":373.89,"Wx":102.89,"Wy":74.78,"ix":6.59,"iy":4.18,"u":0.546}'::jsonb, 293),
      ('180×100×5', 100, 180, 5, 20.69, 'KP-180X100X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":26.36,"Ix":1124.19,"Iy":451.77,"Wx":124.91,"Wy":90.35,"ix":6.53,"iy":4.14,"u":0.543}'::jsonb, 294),
      ('180×100×6', 100, 180, 6, 24.52, 'KP-180X100X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":31.23,"Ix":1309.6,"Iy":523.82,"Wx":145.51,"Wy":104.76,"ix":6.48,"iy":4.1,"u":0.539}'::jsonb, 295),
      ('180×100×8', 100, 180, 8, 31.43, 'KP-180X100X8', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":40.04,"Ix":1598.46,"Iy":637.47,"Wx":177.61,"Wy":127.49,"ix":6.32,"iy":3.99,"u":0.526}'::jsonb, 296),
      ('180×100×10', 100, 180, 10, 38.12, 'KP-180X100X10', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":48.57,"Ix":1859.42,"Iy":736.4,"Wx":206.6,"Wy":147.28,"ix":6.19,"iy":3.89,"u":0.517}'::jsonb, 297),
      ('200×100×4', 100, 200, 4, 18.01, 'KP-200X100X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":22.95,"Ix":1199.7,"Iy":410.78,"Wx":119.97,"Wy":82.16,"ix":7.23,"iy":4.23,"u":0.586}'::jsonb, 298),
      ('200×100×5', 100, 200, 5, 22.26, 'KP-200X100X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":28.36,"Ix":1459.24,"Iy":496.93,"Wx":145.92,"Wy":99.39,"ix":7.17,"iy":4.19,"u":0.583}'::jsonb, 299),
      ('200×100×6', 100, 200, 6, 26.4, 'KP-200X100X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":33.63,"Ix":1703.29,"Iy":576.91,"Wx":170.33,"Wy":115.38,"ix":7.12,"iy":4.14,"u":0.579}'::jsonb, 300),
      ('200×100×8', 100, 200, 8, 33.95, 'KP-200X100X8', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":43.24,"Ix":2090.8,"Iy":705.35,"Wx":209.08,"Wy":141.07,"ix":6.95,"iy":4.04,"u":0.566}'::jsonb, 301),
      ('200×100×10', 100, 200, 10, 41.26, 'KP-200X100X10', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":52.57,"Ix":2444.34,"Iy":817.73,"Wx":244.43,"Wy":163.55,"ix":6.82,"iy":3.94,"u":0.557}'::jsonb, 302),
      ('200×120×4', 120, 200, 4, 19.27, 'KP-200X120X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":24.55,"Ix":1353.38,"Iy":617.65,"Wx":135.34,"Wy":102.94,"ix":7.43,"iy":5.02,"u":0.626}'::jsonb, 303),
      ('200×120×5', 120, 200, 5, 23.83, 'KP-200X120X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":30.36,"Ix":1649.41,"Iy":750.14,"Wx":164.94,"Wy":125.02,"ix":7.37,"iy":4.97,"u":0.623}'::jsonb, 304),
      ('200×120×6', 120, 200, 6, 28.29, 'KP-200X120X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":36.03,"Ix":1929.18,"Iy":874.34,"Wx":192.92,"Wy":145.72,"ix":7.32,"iy":4.93,"u":0.619}'::jsonb, 305),
      ('200×120×8', 120, 200, 8, 36.46, 'KP-200X120X8', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":46.44,"Ix":2385.89,"Iy":1078.95,"Wx":238.59,"Wy":179.83,"ix":7.17,"iy":4.82,"u":0.606}'::jsonb, 306),
      ('200×120×10', 120, 200, 10, 44.4, 'KP-200X120X10', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":56.57,"Ix":2805.67,"Iy":1262.12,"Wx":280.57,"Wy":210.35,"ix":7.04,"iy":4.72,"u":0.597}'::jsonb, 307),
      ('200×150×4', 150, 200, 4, 21.15, 'KP-200X150X4', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":26.95,"Ix":1583.91,"Iy":1021.03,"Wx":158.39,"Wy":136.14,"ix":7.67,"iy":6.16,"u":0.686}'::jsonb, 308),
      ('200×150×5', 150, 200, 5, 26.18, 'KP-200X150X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":33.36,"Ix":1934.66,"Iy":1245.03,"Wx":193.47,"Wy":166,"ix":7.62,"iy":6.11,"u":0.683}'::jsonb, 309),
      ('200×150×6', 150, 200, 6, 31.11, 'KP-200X150X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":39.63,"Ix":2268.01,"Iy":1457.12,"Wx":226.8,"Wy":194.28,"ix":7.56,"iy":6.06,"u":0.679}'::jsonb, 310),
      ('200×150×8', 150, 200, 8, 40.23, 'KP-200X150X8', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":51.24,"Ix":2828.51,"Iy":1815.52,"Wx":282.85,"Wy":242.07,"ix":7.43,"iy":5.95,"u":0.666}'::jsonb, 311),
      ('200×150×10', 150, 200, 10, 49.11, 'KP-200X150X10', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":62.57,"Ix":3347.67,"Iy":2143.33,"Wx":334.77,"Wy":285.78,"ix":7.31,"iy":5.85,"u":0.657}'::jsonb, 312),
      ('250×150×5', 150, 250, 5, 30.11, 'KP-250X150X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":38.36,"Ix":3304.16,"Iy":1507.95,"Wx":264.33,"Wy":201.06,"ix":9.28,"iy":6.27,"u":0.783}'::jsonb, 313),
      ('250×150×6', 150, 250, 6, 35.82, 'KP-250X150X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":45.63,"Ix":3885.54,"Iy":1768.34,"Wx":310.84,"Wy":235.78,"ix":9.23,"iy":6.23,"u":0.779}'::jsonb, 314),
      ('250×150×8', 150, 250, 8, 46.51, 'KP-250X150X8', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":59.24,"Ix":4885.73,"Iy":2219.23,"Wx":390.86,"Wy":295.9,"ix":9.08,"iy":6.12,"u":0.766}'::jsonb, 315),
      ('250×150×10', 150, 250, 10, 56.96, 'KP-250X150X10', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":72.57,"Ix":5824.92,"Iy":2634.17,"Wx":465.99,"Wy":351.22,"ix":8.96,"iy":6.02,"u":0.757}'::jsonb, 316),
      ('250×150×12,5', 150, 250, 12.5, 68.33, 'KP-250X150X12.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":87.04,"Ix":6632.49,"Iy":3002.28,"Wx":530.6,"Wy":400.3,"ix":8.73,"iy":5.87,"u":0.736}'::jsonb, 317),
      ('300×100×5', 100, 300, 5, 30.11, 'KP-300X100X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":38.36,"Ix":4065.19,"Iy":722.77,"Wx":271.01,"Wy":144.55,"ix":10.29,"iy":4.34,"u":0.783}'::jsonb, 318),
      ('300×100×6', 100, 300, 6, 35.82, 'KP-300X100X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":45.63,"Ix":4776.75,"Iy":842.35,"Wx":318.45,"Wy":168.47,"ix":10.23,"iy":4.3,"u":0.779}'::jsonb, 319),
      ('300×100×8', 100, 300, 8, 46.51, 'KP-300X100X8', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":59.24,"Ix":5977.77,"Iy":1044.76,"Wx":398.52,"Wy":208.95,"ix":10.05,"iy":4.2,"u":0.766}'::jsonb, 320),
      ('300×100×10', 100, 300, 10, 56.96, 'KP-300X100X10', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":72.57,"Ix":7105.9,"Iy":1224.4,"Wx":473.73,"Wy":244.88,"ix":9.9,"iy":4.11,"u":0.757}'::jsonb, 321),
      ('300×100×12,5', 100, 300, 12.5, 68.33, 'KP-300X100X12.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":87.04,"Ix":8009.34,"Iy":1373.9,"Wx":533.96,"Wy":274.78,"ix":9.59,"iy":3.97,"u":0.736}'::jsonb, 322),
      ('300×200×5', 200, 300, 5, 37.96, 'KP-300X200X5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":48.36,"Ix":6241.02,"Iy":3360.91,"Wx":416.07,"Wy":336.09,"ix":11.36,"iy":8.34,"u":0.983}'::jsonb, 323),
      ('300×200×6', 200, 300, 6, 45.24, 'KP-300X200X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":57.63,"Ix":7370.19,"Iy":3962.17,"Wx":491.35,"Wy":396.22,"ix":11.31,"iy":8.29,"u":0.979}'::jsonb, 324),
      ('300×200×8', 200, 300, 8, 59.07, 'KP-300X200X8', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":75.24,"Ix":9389.19,"Iy":5041.63,"Wx":625.95,"Wy":504.16,"ix":11.17,"iy":8.19,"u":0.966}'::jsonb, 325),
      ('300×200×10', 200, 300, 10, 72.66, 'KP-300X200X10', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":92.57,"Ix":11312.57,"Iy":6057.67,"Wx":754.17,"Wy":605.77,"ix":11.05,"iy":8.09,"u":0.957}'::jsonb, 326),
      ('300×200×12,5', 200, 300, 12.5, 87.95, 'KP-300X200X12.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":112.04,"Ix":13178.61,"Iy":7059.83,"Wx":878.57,"Wy":705.98,"ix":10.85,"iy":7.94,"u":0.936}'::jsonb, 327),
      ('400×200×6', 200, 400, 6, 54.66, 'KP-400X200X6', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":69.63,"Ix":14789.29,"Iy":5091.61,"Wx":739.46,"Wy":509.16,"ix":14.57,"iy":8.55,"u":1.179}'::jsonb, 328),
      ('400×200×8', 200, 400, 8, 71.63, 'KP-400X200X8', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":91.24,"Ix":18974.26,"Iy":6517.04,"Wx":948.71,"Wy":651.7,"ix":14.42,"iy":8.45,"u":1.166}'::jsonb, 329),
      ('400×200×10', 200, 400, 10, 88.36, 'KP-400X200X10', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":112.57,"Ix":23002.41,"Iy":7864.34,"Wx":1150.12,"Wy":786.43,"ix":14.29,"iy":8.36,"u":1.157}'::jsonb, 330),
      ('400×200×12,5', 200, 400, 12.5, 107.58, 'KP-400X200X12.5', jsonb_build_object('tr','Dikdörtgen','en','Rectangular'), '{"A":137.04,"Ix":27100.03,"Iy":9260.35,"Wx":1355,"Wy":926.03,"ix":14.06,"iy":8.22,"u":1.136}'::jsonb, 331)
  ) as v(l, w, h, t, kg, sc, g, pr, o);

  if not exists (select 1 from public.product_specs where product_id = v_pid) then
    insert into public.product_specs (product_id, group_name, name, value, unit, sort_order)
    select v_pid, s.g, s.n, s.v, s.u, s.o from (values
      (jsonb_build_object('tr','Malzeme','en','Material'), jsonb_build_object('tr','Standart','en','Standard'), jsonb_build_object('tr','TS EN 10219-1/-2','en','EN 10219-1/-2'), null, 1),
      (jsonb_build_object('tr','Malzeme','en','Material'), jsonb_build_object('tr','Kalite','en','Grade'), jsonb_build_object('tr','S235JRH, S275J0H, S355J2H','en','S235JRH, S275J0H, S355J2H'), null, 2),
      (jsonb_build_object('tr','Malzeme','en','Material'), jsonb_build_object('tr','Et kalınlığı','en','Wall thickness'), jsonb_build_object('tr','1,2 – 12,5','en','1.2 – 12.5'), 'mm', 3),
      (jsonb_build_object('tr','Malzeme','en','Material'), jsonb_build_object('tr','Belge','en','Certificate'), jsonb_build_object('tr','EN 10204 3.1 sertifika','en','EN 10204 3.1 certificate'), null, 4),
      (jsonb_build_object('tr','Teslim','en','Delivery'), jsonb_build_object('tr','Boy','en','Length'), jsonb_build_object('tr','6 m standart, 12 m talebe göre','en','6 m standard, 12 m on request'), null, 5),
      (jsonb_build_object('tr','Teslim','en','Delivery'), jsonb_build_object('tr','Kesim','en','Cutting'), jsonb_build_object('tr','Ölçüye kesim yapılır','en','Cut to size'), null, 6),
      (jsonb_build_object('tr','Teslim','en','Delivery'), jsonb_build_object('tr','Yüzey','en','Surface'), jsonb_build_object('tr','Siyah, antipaslı, sıcak daldırma galvaniz','en','Black, primed, hot-dip galvanised'), null, 7),
      (jsonb_build_object('tr','Uygulama','en','Application'), jsonb_build_object('tr','Birleşim','en','Connection'), jsonb_build_object('tr','Kaynak veya bulon','en','Welded or bolted'), null, 8),
      (jsonb_build_object('tr','Uygulama','en','Application'), jsonb_build_object('tr','Koruma','en','Protection'), jsonb_build_object('tr','Antipas astar, kaynak sonrası rötuş','en','Primer, touch-up after welding'), null, 9),
      (jsonb_build_object('tr','Uygulama','en','Application'), jsonb_build_object('tr','Kullanım','en','Use'), jsonb_build_object('tr','Karkas, aşık, cephe, korkuluk, şase','en','Frames, purlins, façades, railings, chassis'), null, 10)
    ) as s(g, n, v, u, o);
  end if;

  if not exists (select 1 from public.faqs where entity_type = 'product' and entity_id = v_pid) then
    insert into public.faqs (entity_type, entity_id, question, answer, status, published_locales, sort_order)
    select 'product', v_pid, f.q, f.a, 'published', '{tr}', f.o from (values
      (jsonb_build_object('tr','Kutu profil ağırlığı nasıl hesaplanır?'), jsonb_build_object('tr','Tablodaki kg/m değeri ile toplam metrajı çarpın. Örneğin 10 adet 6 m 100×50×3 profil: 6,60 × 6 × 10 = 396 kg. Sayfadaki hesaplayıcı bunu otomatik yapar.'), 1),
      (jsonb_build_object('tr','Kare ve dikdörtgen profil arasında nasıl seçim yapılır?'), jsonb_build_object('tr','Kare profil iki yönde eşit rijitlik sağlar; kolon ve eksenel yüklü elemanlar için uygundur. Dikdörtgen profil tek yönde eğilmeye çalışan kiriş ve aşıklarda daha ekonomiktir; uzun kenar yük yönüne gelecek şekilde yerleştirilir.'), 2),
      (jsonb_build_object('tr','Hangi çelik kalitesini seçmeliyim?'), jsonb_build_object('tr','Genel konstrüksiyonda S235JRH yeterlidir. Taşıyıcı sistemde daha yüksek dayanım veya düşük sıcaklıkta tokluk gerekiyorsa S275J0H ya da S355J2H tercih edilir. Proje hesabında kullanılan kaliteyi belirtin.'), 3),
      (jsonb_build_object('tr','Ölçüye kesim ve galvaniz yapıyor musunuz?'), jsonb_build_object('tr','Evet. Kesim listenizi gönderin; kesim, delik, antipas veya sıcak daldırma galvaniz dahil teklif hazırlayalım.'), 4)
    ) as f(q, a, o);
  end if;
end $$;
