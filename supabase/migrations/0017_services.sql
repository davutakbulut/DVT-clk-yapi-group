-- 0017 · Hizmetler (Faz 7): slug çözümleme RPC'si (0011 şablonu), genel sıralama RPC'si, başlangıç içeriği.

-- security INVOKER: çağıranın RLS'i → anonim yalnız yayındaki hizmeti görür. WHERE biçimi 0011'deki gibi (BitmapOr).
create function public.get_service_by_slug(p_locale text, p_slug text) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', s.id,
    'slug', s.slug->>p_locale,
    'title', s.title->>p_locale,
    'excerpt', s.excerpt->>p_locale,
    'body', s.body->>p_locale,
    'icon', s.icon,
    'is_featured', s.is_featured,
    'published_at', s.published_at,
    'updated_at', s.updated_at,
    'process_steps', coalesce((
      select jsonb_agg(jsonb_build_object('title', e->'title'->>p_locale, 'description', e->'description'->>p_locale))
        from jsonb_array_elements(s.process_steps) e
       where coalesce(e->'title'->>p_locale, '') <> ''), '[]'::jsonb),
    'seo', jsonb_build_object(
      'title', s.seo_title->>p_locale, 'description', s.seo_description->>p_locale,
      'canonical_url', s.canonical_url, 'noindex', s.noindex,
      'og_image', (select jsonb_build_object('bucket', m.storage_bucket, 'path', m.storage_path, 'width', m.width, 'height', m.height)
                     from public.media_library m where m.id = s.og_image_id)),
    'alternates', jsonb_build_object(
      'tr', case when 'tr' = any(s.published_locales) then s.slug->>'tr' end,
      'en', case when 'en' = any(s.published_locales) then s.slug->>'en' end),
    'cover', (select jsonb_build_object('bucket', m.storage_bucket, 'path', m.storage_path, 'width', m.width, 'height', m.height,
                                        'alt', m.alt->>p_locale, 'blur', m.blur_data_url, 'variants', m.variants)
                from public.media_library m where m.id = s.cover_image_id),
    'images', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', m.storage_bucket, 'path', m.storage_path, 'width', m.width, 'height', m.height,
                                          'alt', coalesce(nullif(i.alt->>p_locale, ''), m.alt->>p_locale),
                                          'caption', i.caption->>p_locale, 'blur', m.blur_data_url, 'variants', m.variants)
                       order by i.sort_order)
        from public.service_images i join public.media_library m on m.id = i.media_id
       where i.service_id = s.id), '[]'::jsonb),
    -- İlgili proje yalnız BU dilde yayındaysa (İngilizce sayfadan 404'e bağlantı verilmez)
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object('slug', p.slug->>p_locale, 'title', p.title->>p_locale, 'location', p.location->>p_locale,
                                          'cover', (select jsonb_build_object('bucket', m.storage_bucket, 'path', m.storage_path, 'width', m.width, 'height', m.height,
                                                                              'alt', m.alt->>p_locale, 'blur', m.blur_data_url, 'variants', m.variants)
                                                      from public.media_library m where m.id = p.cover_image_id))
                       order by p.sort_order)
        from public.service_projects sp join public.projects p on p.id = sp.project_id
       where sp.service_id = s.id and p.status = 'published' and p_locale = any(p.published_locales)
         and (p.published_at is null or p.published_at <= now())), '[]'::jsonb),
    'faqs', coalesce((
      select jsonb_agg(jsonb_build_object('question', f.question->>p_locale, 'answer', f.answer->>p_locale) order by f.sort_order)
        from public.faqs f
       where f.entity_type = 'service' and f.entity_id = s.id and f.status = 'published' and p_locale = any(f.published_locales)), '[]'::jsonb)
  )
  from public.services s
  where ((p_locale = 'tr' and s.slug->>'tr' = p_slug)
      or (p_locale = 'en' and s.slug->>'en' = p_slug))
    and p_locale = any(s.published_locales)
$$;
revoke execute on function public.get_service_by_slug(text, text) from public;
grant execute on function public.get_service_by_slug(text, text) to anon, authenticated;

-- Genel sıralama: 0015 reorder_menu_items deseni, izinli tablo listesiyle (tablo adı kullanıcı girdisinden gelebilir).
-- security INVOKER: yazma yetkisi RLS'ten; anonim/yetkisiz rol için UPDATE reddedilir.
create function public.reorder_content(p_table text, p_ids uuid[]) returns integer
language plpgsql volatile set search_path = '' as $$
declare
  v_count integer;
begin
  if p_table not in ('services','projects','project_categories','products','product_categories','solutions','price_guides',
                     'testimonials','team_members','certificates','faqs','blog_categories','job_postings') then
    raise exception 'reorder_content: tablo izinli degil: %', p_table using errcode = '22023';
  end if;
  execute format($f$
    with ordered as (
      select id, ordinality::integer as new_order from unnest($1) with ordinality as u(id, ordinality)
    ),
    updated as (
      update public.%I t set sort_order = o.new_order
      from ordered o where t.id = o.id and t.sort_order is distinct from o.new_order
      returning 1
    )
    select count(*)::integer from updated$f$, p_table) into v_count using p_ids;
  return v_count;
end $$;
revoke all on function public.reorder_content(text, uuid[]) from public;
grant execute on function public.reorder_content(text, uuid[]) to authenticated;

-- Başlangıç içeriği: yalnız tablo BOŞSA. Sayısal iddia/sertifika yok; EN makine taslağı → onaysız, yalnız TR yayında (K-08).
insert into public.services (slug, title, excerpt, body, process_steps, icon, is_featured, sort_order, status, published_locales, published_at, translation_meta)
select * from (values
  ('{"tr": "kentsel-donusum-celik-karkas", "en": "urban-renewal-steel-frame"}'::jsonb,
   '{"tr": "Kentsel Dönüşüm Çelik Karkas", "en": "Urban Renewal Steel Frame"}'::jsonb,
   '{"tr": "Dar parsellerde, betonarmeye göre çok daha kısa sürede tamamlanan taşıyıcı sistem.", "en": "A structural frame for narrow plots, completed far faster than reinforced concrete."}'::jsonb,
   '{"tr": "Kentsel dönüşüm parsellerinde şantiye süresi doğrudan maliyettir: kira yardımı, komşu rahatsızlığı, dar sokakta lojistik. Çelik karkas, proje onayıyla birlikte atölyede imalata girer; sahada temel işleri sürerken taşıyıcı sistem hazır olur.\n\nMontaj kuru yöntemle yapılır — kalıp, beton dökümü ve kür beklemesi yoktur. Tasarım TBDY 2018 ve Çelik Yapılar Yönetmeliği''ne göre hazırlanır, statik proje ruhsat aşamasında sunulur.\n\n## Kimler için\n\n- Riskli yapı kararı alınmış, yeniden yapım sürecindeki bina sahipleri\n- Kat karşılığı çalışan müteahhitler\n- Kısıtlı sürede teslim taahhüdü olan projeler", "en": "On urban-renewal plots, site time is cost: rent support, neighbour disruption, logistics on narrow streets. The steel frame goes into workshop fabrication as soon as the project is approved and is ready while foundations are still under way.\n\nAssembly is dry — no formwork, no concrete pour, no curing wait. Design follows TBDY 2018 and the Steel Structures Regulation; the structural project is submitted at the permit stage.\n\n## Who it is for\n\n- Owners rebuilding after a risky-building decision\n- Contractors working on a build-and-share basis\n- Projects with a tight delivery commitment"}'::jsonb,
   '[{"title": {"tr": "Keşif ve ön proje", "en": "Survey and preliminary design"}, "description": {"tr": "Parsel, zemin raporu ve mimari proje incelenir; taşıyıcı sistem alternatifleri ve süre planı çıkarılır.", "en": "Plot, soil report and architectural drawings are reviewed; frame options and a schedule are prepared."}}, {"title": {"tr": "Statik proje ve ruhsat", "en": "Structural design and permit"}, "description": {"tr": "TBDY 2018''e uygun statik proje hazırlanır, ruhsat sürecine sunulur.", "en": "The structural project is prepared to TBDY 2018 and submitted for the permit."}}, {"title": {"tr": "Atölye imalatı", "en": "Workshop fabrication"}, "description": {"tr": "Kolon, kiriş ve bağlantı elemanları kontrollü ortamda üretilir; temel işleriyle eş zamanlı ilerler.", "en": "Columns, beams and connections are fabricated in a controlled environment, in parallel with foundations."}}, {"title": {"tr": "Saha montajı", "en": "Site assembly"}, "description": {"tr": "Önceden üretilmiş karkas vinçle monte edilir; kuru montaj, kür beklemesi yok.", "en": "The prefabricated frame is craned into place; dry assembly, no curing wait."}}]'::jsonb,
   'building', true, 1),
  ('{"tr": "endustriyel-tesis-ve-depo", "en": "industrial-facilities-and-warehouses"}'::jsonb,
   '{"tr": "Endüstriyel Tesis ve Depo", "en": "Industrial Facilities and Warehouses"}'::jsonb,
   '{"tr": "Geniş açıklıklı üretim, depolama ve lojistik yapıları için çelik taşıyıcı sistem.", "en": "Steel structures for wide-span production, storage and logistics buildings."}'::jsonb,
   '{"tr": "Fabrika, depo ve lojistik merkezlerinde büyük açıklık, yüksek tavan ve vinç yükü belirleyicidir. Çelik makas ve portal çerçeve sistemleri bu ihtiyacı ara kolonsuz karşılar; ileride genişleme için aks eklemek betonarmeye göre çok daha kolaydır.\n\nYapı; çatı-cephe kaplaması, yağmur suyu sistemi ve endüstriyel kapılarla birlikte anahtar teslim planlanabilir.", "en": "In factories, warehouses and logistics centres, span, clear height and crane loads decide the structure. Steel trusses and portal frames meet these needs without intermediate columns, and adding bays later is far easier than with concrete.\n\nThe building can be planned turnkey with roof and wall cladding, rainwater systems and industrial doors."}'::jsonb,
   '[{"title": {"tr": "İhtiyaç analizi", "en": "Needs analysis"}, "description": {"tr": "Açıklık, yükseklik, vinç ve genişleme planı netleştirilir.", "en": "Span, height, crane and expansion plans are defined."}}, {"title": {"tr": "Sistem seçimi ve statik", "en": "System choice and structural design"}, "description": {"tr": "Makas ya da portal çerçeve; yönetmeliğe uygun hesap.", "en": "Truss or portal frame; code-compliant calculation."}}, {"title": {"tr": "İmalat ve montaj", "en": "Fabrication and assembly"}, "description": {"tr": "Atölye imalatı, boyama/galvaniz, saha montajı.", "en": "Workshop fabrication, coating or galvanising, site assembly."}}]'::jsonb,
   'factory', true, 2),
  ('{"tr": "celik-cati-ve-cephe-sistemleri", "en": "steel-roof-and-facade-systems"}'::jsonb,
   '{"tr": "Çelik Çatı ve Cephe Sistemleri", "en": "Steel Roof and Facade Systems"}'::jsonb,
   '{"tr": "Mevcut ya da yeni yapılar için hafif çelik çatı, kaplama ve cephe taşıyıcıları.", "en": "Light steel roofs, cladding and facade supports for new or existing buildings."}'::jsonb,
   '{"tr": "Mevcut binaya kat ilavesi, teras kapatma ya da yeni yapıda hafif çatı: çelik, mevcut taşıyıcıya en az yük bindiren çözümdür. Sandviç panel, trapez sac ve membran kaplama seçenekleriyle ısı ve su yalıtımı birlikte projelendirilir.", "en": "Adding a storey, enclosing a terrace or roofing a new building: steel adds the least load to the existing structure. Sandwich panel, trapezoidal sheet and membrane options are designed together with thermal and water insulation."}'::jsonb,
   '[{"title": {"tr": "Mevcut yapı tespiti", "en": "Existing structure survey"}, "description": {"tr": "Taşıyıcı kapasite ve bağlantı noktaları belirlenir.", "en": "Load capacity and connection points are established."}}, {"title": {"tr": "Projelendirme", "en": "Design"}, "description": {"tr": "Çatı geometrisi, kaplama ve yalıtım detayları.", "en": "Roof geometry, cladding and insulation details."}}, {"title": {"tr": "Montaj", "en": "Assembly"}, "description": {"tr": "Hafif elemanlar, kısa saha süresi.", "en": "Light members, short site time."}}]'::jsonb,
   'roof', false, 3),
  ('{"tr": "celik-yapi-guclendirme", "en": "steel-structural-strengthening"}'::jsonb,
   '{"tr": "Çelik Yapı Güçlendirme", "en": "Steel Structural Strengthening"}'::jsonb,
   '{"tr": "Mevcut betonarme yapılarda çelik elemanlarla taşıyıcı sistem güçlendirmesi.", "en": "Strengthening existing concrete structures with steel members."}'::jsonb,
   '{"tr": "Yıkıp yeniden yapmanın mümkün olmadığı durumlarda çelik kolon mantolama, çapraz perde ve çelik kiriş takviyesi ile mevcut yapının deprem performansı artırılır. Uygulama, bina kullanımdayken kat kat planlanabilir.", "en": "Where demolition is not an option, steel jacketing, bracing and beam reinforcement raise the seismic performance of the existing building. Work can be phased floor by floor while the building stays in use."}'::jsonb,
   '[{"title": {"tr": "Performans analizi", "en": "Performance analysis"}, "description": {"tr": "Mevcut yapının deprem performansı yönetmeliğe göre değerlendirilir.", "en": "Seismic performance of the existing building is assessed to code."}}, {"title": {"tr": "Güçlendirme projesi", "en": "Strengthening design"}, "description": {"tr": "Çelik elemanların yerleşimi ve bağlantı detayları.", "en": "Placement and connection details of steel members."}}, {"title": {"tr": "Uygulama", "en": "Application"}, "description": {"tr": "Kat kat, kullanım kesintisi en aza indirilerek.", "en": "Floor by floor, minimising disruption."}}]'::jsonb,
   'hammer', false, 4)
) as v(slug, title, excerpt, body, process_steps, icon, is_featured, sort_order)
cross join lateral (select 'published'::text, '{tr}'::text[], now(), '{"en": {"machine": true, "reviewed": false}}'::jsonb) as pub(status, published_locales, published_at, translation_meta)
where not exists (select 1 from public.services);
