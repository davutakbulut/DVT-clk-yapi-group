-- 0025 · Çözüm sayfaları (Faz 15, K-26): slug çözümleme RPC'si (0011/0017 şablonu) + başlangıç içeriği.
-- 8 bölüm: hero (hero_summary) · sorun (problem, Markdown) · karşılaştırma (comparison: {alternative, rows[{criterion, steel, alternative}]})
-- · avantajlar (advantages: [{title, description}]) · teknik dayanak (technical_basis, Markdown) · örnek projeler (bağlı hizmetin
-- projeleri) · SSS (faqs entity_type='solution') · CTA (cta: {title, lead, button}). Hepsi dil anahtarlı JSONB.

-- security INVOKER: çağıranın RLS'i → anonim yalnız yayındaki çözümü görür. WHERE biçimi 0011'deki gibi (BitmapOr).
create function public.get_solution_by_slug(p_locale text, p_slug text) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', s.id,
    'slug', s.slug->>p_locale,
    'title', s.title->>p_locale,
    'hero_summary', s.hero_summary->>p_locale,
    'problem', s.problem->>p_locale,
    'technical_basis', s.technical_basis->>p_locale,
    'published_at', s.published_at,
    'updated_at', s.updated_at,
    'comparison', jsonb_build_object(
      'alternative', s.comparison->'alternative'->>p_locale,
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object('criterion', r->'criterion'->>p_locale, 'steel', r->'steel'->>p_locale, 'alternative', r->'alternative'->>p_locale))
          from jsonb_array_elements(coalesce(s.comparison->'rows', '[]'::jsonb)) r
         where coalesce(r->'criterion'->>p_locale, '') <> ''), '[]'::jsonb)),
    'advantages', coalesce((
      select jsonb_agg(jsonb_build_object('title', e->'title'->>p_locale, 'description', e->'description'->>p_locale))
        from jsonb_array_elements(s.advantages) e
       where coalesce(e->'title'->>p_locale, '') <> ''), '[]'::jsonb),
    'cta', jsonb_build_object('title', s.cta->'title'->>p_locale, 'lead', s.cta->'lead'->>p_locale, 'button', s.cta->'button'->>p_locale),
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
    -- Bağlı hizmet yalnız BU dilde yayındaysa (404'e bağlantı verilmez)
    'service', (select jsonb_build_object('slug', sv.slug->>p_locale, 'title', sv.title->>p_locale)
                  from public.services sv
                 where sv.id = s.service_id and sv.status = 'published' and p_locale = any(sv.published_locales)
                   and (sv.published_at is null or sv.published_at <= now())),
    -- Örnek projeler: bağlı hizmetin projeleri (K-26 "örnek projeler" bölümü), en fazla 6
    'projects', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('slug', p.slug->>p_locale, 'title', p.title->>p_locale, 'location', p.location->>p_locale,
                                  'cover', (select jsonb_build_object('bucket', m.storage_bucket, 'path', m.storage_path, 'width', m.width, 'height', m.height,
                                                                      'alt', m.alt->>p_locale, 'blur', m.blur_data_url, 'variants', m.variants)
                                              from public.media_library m where m.id = p.cover_image_id)) as x
          from public.service_projects sp join public.projects p on p.id = sp.project_id
         where sp.service_id = s.service_id and p.status = 'published' and p_locale = any(p.published_locales)
           and (p.published_at is null or p.published_at <= now())
         order by p.sort_order limit 6) q), '[]'::jsonb),
    'faqs', coalesce((
      select jsonb_agg(jsonb_build_object('question', f.question->>p_locale, 'answer', f.answer->>p_locale) order by f.sort_order)
        from public.faqs f
       where f.entity_type = 'solution' and f.entity_id = s.id and f.status = 'published' and p_locale = any(f.published_locales)), '[]'::jsonb)
  )
  from public.solutions s
  where ((p_locale = 'tr' and s.slug->>'tr' = p_slug)
      or (p_locale = 'en' and s.slug->>'en' = p_slug))
    and p_locale = any(s.published_locales)
    and s.status = 'published'
    and (s.published_at is null or s.published_at <= now())
$$;
revoke execute on function public.get_solution_by_slug(text, text) from public;
grant execute on function public.get_solution_by_slug(text, text) to anon, authenticated;

-- Başlangıç içeriği: yalnız tablo BOŞSA. Sayısal iddia yok (K-55); EN makine taslağı → onaysız, yalnız TR yayında (K-08).
insert into public.solutions (slug, title, service_id, hero_summary, problem, comparison, advantages, technical_basis, cta, sort_order, status, published_locales, published_at, translation_meta)
select
  '{"tr": "dar-parselde-hizli-yeniden-yapim", "en": "fast-rebuild-on-narrow-plots"}'::jsonb,
  '{"tr": "Dar Parselde Hızlı Yeniden Yapım", "en": "Fast Rebuild on Narrow Plots"}'::jsonb,
  (select id from public.services where slug->>'tr' = 'kentsel-donusum-celik-karkas'),
  '{"tr": "Riskli yapı kararı sonrası dar parselde, komşuyu ve kira sürecini en az etkileyen taşıyıcı sistem seçimi.", "en": "Choosing a structural system that least affects neighbours and rent support after a risky-building decision on a narrow plot."}'::jsonb,
  '{"tr": "Kentsel dönüşümde parsel dar, sokak dar, komşu yakındır. Betonarme şantiyede kalıp, demir, beton dökümü ve kür beklemesi sahada aylarca sürer; her ay kira yardımı, komşu şikâyeti ve lojistik zorluğu demektir.\n\nBina sahipleri için asıl soru şudur: **şantiye süresi nasıl kısalır ve bu süre baştan nasıl planlanır?**", "en": "In urban renewal the plot is narrow, the street is narrow and the neighbours are close. On a concrete site, formwork, rebar, pouring and curing take months; every month means rent support, neighbour complaints and logistics trouble.\n\nThe real question for owners is: **how can site time be shortened and planned from the start?**"}'::jsonb,
  '{"alternative": {"tr": "Betonarme", "en": "Reinforced concrete"}, "rows": [
     {"criterion": {"tr": "Saha süresi", "en": "Site time"}, "steel": {"tr": "Taşıyıcı sistem atölyede üretilir; sahada montaj kuru yöntemle yapılır", "en": "Frame is fabricated in the workshop; site assembly is dry"}, "alternative": {"tr": "Kalıp, döküm ve kür beklemesi kat kat tekrarlanır", "en": "Formwork, pour and curing repeat floor by floor"}},
     {"criterion": {"tr": "Dar sokakta lojistik", "en": "Logistics on narrow streets"}, "steel": {"tr": "Önceden üretilmiş parçalar planlı seferlerle gelir", "en": "Prefabricated members arrive in planned deliveries"}, "alternative": {"tr": "Mikser ve pompa trafiği döküm günlerinde yoğunlaşır", "en": "Mixer and pump traffic peaks on pour days"}},
     {"criterion": {"tr": "Süre planlanabilirliği", "en": "Schedule predictability"}, "steel": {"tr": "İmalat ve montaj takvimi proje onayıyla netleşir", "en": "Fabrication and assembly schedule is fixed at design approval"}, "alternative": {"tr": "Hava koşulları ve kür süresi takvimi etkiler", "en": "Weather and curing time affect the schedule"}},
     {"criterion": {"tr": "Yapı ağırlığı", "en": "Structure weight"}, "steel": {"tr": "Daha hafif taşıyıcı sistem, temel yükü azalır", "en": "Lighter frame, lower foundation load"}, "alternative": {"tr": "Daha ağır taşıyıcı sistem", "en": "Heavier structural system"}}
   ]}'::jsonb,
  '[{"title": {"tr": "Kısa şantiye süresi", "en": "Short site time"}, "description": {"tr": "Taşıyıcı sistem temel işleriyle eş zamanlı olarak atölyede üretilir.", "en": "The frame is fabricated in the workshop while foundations are under way."}},
    {"title": {"tr": "Öngörülebilir takvim", "en": "Predictable schedule"}, "description": {"tr": "İmalat ve montaj tarihleri proje onayıyla birlikte belirlenir.", "en": "Fabrication and assembly dates are set at design approval."}},
    {"title": {"tr": "Az komşu rahatsızlığı", "en": "Less neighbour disruption"}, "description": {"tr": "Kuru montaj; beton dökümü ve kür beklemesi yok.", "en": "Dry assembly; no concrete pour, no curing wait."}},
    {"title": {"tr": "Yönetmeliğe uygun tasarım", "en": "Code-compliant design"}, "description": {"tr": "TBDY 2018 ve Çelik Yapılar Yönetmeliği''ne göre hazırlanan statik proje ruhsat aşamasında sunulur.", "en": "The structural design to TBDY 2018 and the Steel Structures Regulation is submitted at the permit stage."}}]'::jsonb,
  '{"tr": "Tasarım **TBDY 2018** (Türkiye Bina Deprem Yönetmeliği) ve **Çelik Yapıların Tasarım, Hesap ve Yapım Esasları Yönetmeliği**''ne göre yapılır. Birleşimler bulonlu ya da kaynaklı olarak projelendirilir; kaynaklı imalat atölyede kontrollü ortamda gerçekleştirilir. Yangın ve korozyon koruması proje gereksinimine göre boya, galvaniz ya da kaplama olarak belirlenir.", "en": "Design follows **TBDY 2018** (Turkish Building Earthquake Code) and the **Steel Structures Design and Construction Regulation**. Connections are bolted or welded as designed; welded fabrication takes place in the controlled workshop environment. Fire and corrosion protection is specified as paint, galvanising or cladding according to project requirements."}'::jsonb,
  '{"title": {"tr": "Parseliniz için süre planı isteyin", "en": "Ask for a schedule for your plot"}, "lead": {"tr": "Parsel bilgisi ve mimari ön projeyle size özel imalat-montaj takvimi ve teklif hazırlayalım.", "en": "With your plot details and preliminary design we prepare a fabrication-assembly schedule and a quote."}, "button": {"tr": "Teklif alın", "en": "Get a quote"}}'::jsonb,
  1, 'published', '{tr}'::text[], now(), '{"en": {"machine": true, "reviewed": false}}'::jsonb
where not exists (select 1 from public.solutions);
