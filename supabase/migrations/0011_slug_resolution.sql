-- 0011 · Slug çözümleme RPC deseni + slug geçmişi → 308 + zamanlanmış bakım
-- Bu dosyadaki get_project_by_slug, diğer içerik tiplerinin (Faz 7, 9, 13…) izleyeceği ŞABLONDUR.

-- security INVOKER (varsayılan): çağıranın RLS'i geçerlidir → anonim yalnız yayındaki projeyi görür.
--
-- ⚠️ WHERE biçimi bilinçli: locale başına OR dallanması. Faz 1 deney #4 → generic plan'da bile
--    BitmapOr ile iki ifade indeksi kullanılıyor (0.16 ms). Aynı şeyi CASE ile yazmak tam tablo
--    taramasına düşürür (58× yavaş). supabase/tests/slug-resolution.test.ts bunu sabitler.
create function public.get_project_by_slug(p_locale text, p_slug text) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', p.id,
    'slug', p.slug->>p_locale,
    'title', p.title->>p_locale,
    'excerpt', p.excerpt->>p_locale,
    'body', p.body->p_locale,
    'location', p.location->>p_locale,
    'client_name', p.client_name,
    'area_m2', p.area_m2,
    'tonnage', p.tonnage,
    'started_on', p.started_on,
    'completed_on', p.completed_on,
    'published_at', p.published_at,
    'updated_at', p.updated_at,
    'seo', jsonb_build_object(
      'title', p.seo_title->>p_locale, 'description', p.seo_description->>p_locale,
      'canonical_url', p.canonical_url, 'noindex', p.noindex),
    -- Dil değiştirici ve hreflang AYNI nesneden beslenir → iki yönlü tutarlılık yapısal olarak garanti.
    -- Yayında olmayan dilin slug'ı null döner: o dile hreflang yazılmaz, değiştirici bölüm listesine düşer.
    'alternates', jsonb_build_object(
      'tr', case when 'tr' = any(p.published_locales) then p.slug->>'tr' end,
      'en', case when 'en' = any(p.published_locales) then p.slug->>'en' end),
    'cover', (select jsonb_build_object('bucket', m.storage_bucket, 'path', m.storage_path, 'width', m.width, 'height', m.height,
                                        'alt', m.alt->>p_locale, 'blur', m.blur_data_url, 'variants', m.variants)
                from public.media_library m where m.id = p.cover_image_id),
    'images', coalesce((
      select jsonb_agg(jsonb_build_object('bucket', m.storage_bucket, 'path', m.storage_path, 'width', m.width, 'height', m.height,
                                          'alt', coalesce(nullif(i.alt->>p_locale, ''), m.alt->>p_locale),
                                          'caption', i.caption->>p_locale, 'blur', m.blur_data_url, 'variants', m.variants)
                       order by i.sort_order)
        from public.project_images i join public.media_library m on m.id = i.media_id
       where i.project_id = p.id), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('slug', c.slug->>p_locale, 'name', c.name->>p_locale) order by c.sort_order)
        from public.project_category_relations r join public.project_categories c on c.id = r.category_id
       where r.project_id = p.id and c.slug->>p_locale is not null), '[]'::jsonb),
    -- İlgili hizmet yalnız BU dilde de yayındaysa bağlanır; yoksa İngilizce sayfadan 404'e bağlantı verirdik.
    'services', coalesce((
      select jsonb_agg(jsonb_build_object('slug', s.slug->>p_locale, 'title', s.title->>p_locale) order by s.sort_order)
        from public.service_projects sp join public.services s on s.id = sp.service_id
       where sp.project_id = p.id and p_locale = any(s.published_locales)), '[]'::jsonb)
  )
  from public.projects p
  where ((p_locale = 'tr' and p.slug->>'tr' = p_slug)
      or (p_locale = 'en' and p.slug->>'en' = p_slug))
    and p_locale = any(p.published_locales)
$$;
revoke execute on function public.get_project_by_slug(text, text) from public;
grant execute on function public.get_project_by_slug(text, text) to anon, authenticated;

-- Güncel slug bulunamadığında sayfa buraya sorar → permanentRedirect (308). (K-15)
-- Dinamik tablo adı yerine açık liste: entity_type kullanıcı girdisinden türeyebilir.
create function public.resolve_old_slug(p_entity_type text, p_locale text, p_old_slug text) returns text
language plpgsql stable set search_path = '' as $$
declare
  v_table text := case p_entity_type
    when 'service' then 'services' when 'solution' then 'solutions' when 'price_guide' then 'price_guides'
    when 'project' then 'projects' when 'project_category' then 'project_categories'
    when 'blog_post' then 'blog_posts' when 'blog_category' then 'blog_categories' when 'blog_tag' then 'blog_tags'
    when 'product' then 'products' when 'product_category' then 'product_categories'
    when 'job_posting' then 'job_postings' when 'static_page' then 'static_pages' end;
  v_slug text;
begin
  if v_table is null or p_locale not in ('tr','en') then return null; end if;
  -- İç sorgu çağıranın RLS'iyle çalışır: taslağa dönmüş bir kaydın yeni slug'ı anonime sızmaz.
  execute format('select t.slug->>$1 from public.slug_history h join public.%I t on t.id = h.entity_id
                   where h.entity_type = $2 and h.locale = $1 and h.old_slug = $3', v_table)
    into v_slug using p_locale, p_entity_type, p_old_slug;
  return v_slug;
end $$;
revoke execute on function public.resolve_old_slug(text, text, text) from public;
grant execute on function public.resolve_old_slug(text, text, text) to anon, authenticated;

-- ── Zamanlanmış bakım. pg_cron Supabase'de vardır, PGlite'ta (testler) yoktur → varlığa göre korumalı.
create function app_private.run_maintenance() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_started timestamptz := clock_timestamp();
begin
  perform app_private.purge_old_analytics(60);
  insert into public.cron_heartbeats as h (job_key, expected_interval_seconds, last_run_at, last_status, last_duration_ms)
  values ('db.maintenance', 86400, now(), 'ok', (extract(epoch from clock_timestamp() - v_started) * 1000)::int)
  on conflict (job_key) do update
    set last_run_at = excluded.last_run_at, last_status = 'ok', last_error = null, last_duration_ms = excluded.last_duration_ms;
end $$;
revoke execute on function app_private.run_maintenance() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron';
    perform cron.schedule('db-maintenance', '15 3 * * *', 'select app_private.run_maintenance()');   -- her gece 03:15 UTC
  else
    raise notice 'pg_cron yok — zamanlama atlandı (test ortamı)';
  end if;
end $$;
