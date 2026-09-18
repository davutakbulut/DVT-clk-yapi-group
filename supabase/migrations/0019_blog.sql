-- 0019 · Blog (Faz 9): yazı RPC'si (0011 şablonu), anonim yorum gönderimi (yalnız 'pending', dar kolon listesi),
-- kategori başlangıç verisi (taksonomi, K-55). Yazılar BOŞ başlar.

create function public.get_blog_post_by_slug(p_locale text, p_slug text) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', b.id,
    'slug', b.slug->>p_locale,
    'title', b.title->>p_locale,
    'excerpt', b.excerpt->>p_locale,
    'body', b.body->>p_locale,
    'reading_minutes', (b.reading_minutes->>p_locale)::int,
    'is_featured', b.is_featured,
    'allow_comments', b.allow_comments,
    'published_at', b.published_at,
    'updated_at', b.updated_at,
    'seo', jsonb_build_object(
      'title', b.seo_title->>p_locale, 'description', b.seo_description->>p_locale,
      'canonical_url', b.canonical_url, 'noindex', b.noindex, 'focus_keyword', b.focus_keyword->>p_locale,
      'og_image', (select jsonb_build_object('bucket', m.storage_bucket, 'path', m.storage_path, 'width', m.width, 'height', m.height)
                     from public.media_library m where m.id = b.og_image_id)),
    'alternates', jsonb_build_object(
      'tr', case when 'tr' = any(b.published_locales) then b.slug->>'tr' end,
      'en', case when 'en' = any(b.published_locales) then b.slug->>'en' end),
    'cover', (select jsonb_build_object('bucket', m.storage_bucket, 'path', m.storage_path, 'width', m.width, 'height', m.height,
                                        'alt', m.alt->>p_locale, 'blur', m.blur_data_url, 'variants', m.variants)
                from public.media_library m where m.id = b.cover_image_id),
    'category', (select jsonb_build_object('slug', c.slug->>p_locale, 'name', c.name->>p_locale)
                   from public.blog_categories c where c.id = b.category_id and c.is_active and c.slug->>p_locale is not null),
    'tags', coalesce((
      select jsonb_agg(jsonb_build_object('slug', t.slug->>p_locale, 'name', t.name->>p_locale) order by t.name->>p_locale)
        from public.blog_post_tags pt join public.blog_tags t on t.id = pt.tag_id
       where pt.post_id = b.id and t.slug->>p_locale is not null), '[]'::jsonb),
    -- Yazar yalnız yayındaysa (E-E-A-T: gerçek ekip üyesi)
    'author', (select jsonb_build_object('name', tm.full_name, 'position', tm.position->>p_locale, 'bio', tm.bio->>p_locale, 'linkedin_url', tm.linkedin_url,
                                         'photo', (select jsonb_build_object('bucket', m.storage_bucket, 'path', m.storage_path, 'width', m.width, 'height', m.height, 'alt', m.alt->>p_locale, 'blur', m.blur_data_url, 'variants', m.variants)
                                                     from public.media_library m where m.id = tm.photo_id))
                 from public.team_members tm where tm.id = b.author_id and tm.status = 'published' and p_locale = any(tm.published_locales))
  )
  from public.blog_posts b
  where ((p_locale = 'tr' and b.slug->>'tr' = p_slug)
      or (p_locale = 'en' and b.slug->>'en' = p_slug))
    and p_locale = any(b.published_locales)
$$;
revoke execute on function public.get_blog_post_by_slug(text, text) from public;
grant execute on function public.get_blog_post_by_slug(text, text) to anon, authenticated;

-- Ziyaretçi yorumu: yalnız INSERT, yalnız 'pending', yalnız yayındaki ve yoruma açık yazıya. Okuma published_comments görünümünden.
grant insert (post_id, parent_id, author_name, author_email, body, locale, ip_masked, user_id) on public.post_comments to anon, authenticated;
create policy "visitor comment" on public.post_comments for insert to anon, authenticated
  with check (
    status = 'pending'
    and (user_id is null or user_id = auth.uid())
    and exists (select 1 from public.blog_posts b where b.id = post_id and b.allow_comments and b.status = 'published'
                  and (b.published_at is null or b.published_at <= now()))
  );

insert into public.blog_categories (slug, name, description, sort_order)
select * from (values
  ('{"tr": "celik-konstruksiyon", "en": "steel-construction"}'::jsonb, '{"tr": "Çelik Konstrüksiyon", "en": "Steel Construction"}'::jsonb, '{"tr": "Sistemler, malzeme ve imalat.", "en": "Systems, materials and fabrication."}'::jsonb, 1),
  ('{"tr": "kentsel-donusum", "en": "urban-renewal"}'::jsonb, '{"tr": "Kentsel Dönüşüm", "en": "Urban Renewal"}'::jsonb, '{"tr": "Süreç, mevzuat ve deneyimler.", "en": "Process, regulation and lessons learned."}'::jsonb, 2),
  ('{"tr": "mevzuat", "en": "regulation"}'::jsonb, '{"tr": "Mevzuat", "en": "Regulation"}'::jsonb, '{"tr": "TBDY 2018, yönetmelikler, standartlar.", "en": "TBDY 2018, codes and standards."}'::jsonb, 3)
) as v(slug, name, description, sort_order)
where not exists (select 1 from public.blog_categories);
