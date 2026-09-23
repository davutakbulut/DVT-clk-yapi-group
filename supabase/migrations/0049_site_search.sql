-- 0049 · Site içi arama (K-102): yayındaki ürün, yazı, hizmet, çözüm, proje, sayfa ve SSS içeriğinde arama.
-- Uzantı gerektirmez: Türkçe-duyarlı normalizasyon (ç ğ ı ö ş ü / İ → ASCII, sonra lower) + ILIKE; alan ağırlığı ve
-- eşleşme konumuyla sıralama; eşleşen alan adı ve çevresinden kısa parça döner. RLS altında çalışır (yalnız yayında olanlar).

create or replace function app_private.search_norm(p text) returns text
language sql immutable strict set search_path = '' as $$
  select lower(translate(p, 'ÇĞİÖŞÜçğıöşüÂÎÛâîû', 'CGIOSUcgiosuAIUaiu'));
$$;

-- Eşleşme çevresinden parça: normalize metinde konumu bul, özgün metinden ±70 karakter al (tek karakterlik dönüşüm → konumlar aynı)
create or replace function app_private.search_snippet(p_text text, p_q text) returns text
language plpgsql immutable strict set search_path = '' as $$
declare
  v_pos integer;
  v_start integer;
  v_len constant integer := 150;
  v_plain text := regexp_replace(coalesce(p_text, ''), E'[#*_>`\\[\\]()|\\n\\r\\t]+', ' ', 'g');
begin
  v_pos := position(app_private.search_norm(p_q) in app_private.search_norm(v_plain));
  if v_pos = 0 then return left(v_plain, v_len); end if;
  v_start := greatest(1, v_pos - 60);
  return (case when v_start > 1 then '…' else '' end) || substr(v_plain, v_start, v_len) || (case when v_start + v_len < length(v_plain) then '…' else '' end);
end $$;

create or replace function public.search_site(p_locale text, p_q text, p_limit integer default 20)
returns table (kind text, slug text, title text, field text, snippet text, rank numeric)
language sql stable set search_path = '' as $$
  with q as (
    select app_private.search_norm(btrim(p_q)) as n, '%' || replace(replace(app_private.search_norm(btrim(p_q)), '%', ''), '_', '') || '%' as like
  ),
  hits as (
    -- ürünler: ad · kısa açıklama · açıklama/kullanım · ölçü tablosu (stok kodu, ölçü etiketi)
    select 'product'::text as kind, p.slug->>p_locale as slug, p.name->>p_locale as title,
      case when app_private.search_norm(p.name->>p_locale) like q.like then 'title'
           when app_private.search_norm(coalesce(p.short_description->>p_locale, '')) like q.like then 'excerpt'
           when app_private.search_norm(coalesce(p.description->>p_locale, '') || ' ' || coalesce(p.usage_areas->>p_locale, '')) like q.like then 'body'
           else 'variants' end as field,
      case when app_private.search_norm(p.name->>p_locale) like q.like then app_private.search_snippet(coalesce(p.short_description->>p_locale, p.name->>p_locale), p_q)
           when app_private.search_norm(coalesce(p.short_description->>p_locale, '')) like q.like then app_private.search_snippet(p.short_description->>p_locale, p_q)
           when app_private.search_norm(coalesce(p.description->>p_locale, '') || ' ' || coalesce(p.usage_areas->>p_locale, '')) like q.like then app_private.search_snippet(coalesce(p.description->>p_locale, '') || ' ' || coalesce(p.usage_areas->>p_locale, ''), p_q)
           else app_private.search_snippet(v.codes, p_q) end as snippet,
      case when app_private.search_norm(p.name->>p_locale) like q.like then 30
           when app_private.search_norm(coalesce(p.short_description->>p_locale, '')) like q.like then 20
           when app_private.search_norm(coalesce(p.description->>p_locale, '') || ' ' || coalesce(p.usage_areas->>p_locale, '')) like q.like then 10
           else 15 end as rank,
      coalesce(p.published_at, p.updated_at) as at
    from public.products p
    cross join q
    left join lateral (select string_agg(pv.stock_code || ' ' || pv.size_label, ' · ' order by pv.sort_order) as codes from public.product_variants pv where pv.product_id = p.id and pv.is_active) v on true
    where p.status = 'published' and p_locale = any(p.published_locales) and p.slug->>p_locale is not null
      and (app_private.search_norm(coalesce(p.name->>p_locale, '') || ' ' || coalesce(p.short_description->>p_locale, '') || ' ' || coalesce(p.description->>p_locale, '') || ' ' || coalesce(p.usage_areas->>p_locale, '') || ' ' || coalesce(v.codes, '')) like q.like)
    union all
    select 'post', b.slug->>p_locale, b.title->>p_locale,
      case when app_private.search_norm(b.title->>p_locale) like q.like then 'title' when app_private.search_norm(coalesce(b.excerpt->>p_locale, '')) like q.like then 'excerpt' else 'body' end,
      case when app_private.search_norm(b.title->>p_locale) like q.like then app_private.search_snippet(coalesce(b.excerpt->>p_locale, b.title->>p_locale), p_q)
           when app_private.search_norm(coalesce(b.excerpt->>p_locale, '')) like q.like then app_private.search_snippet(b.excerpt->>p_locale, p_q)
           else app_private.search_snippet(b.body->>p_locale, p_q) end,
      case when app_private.search_norm(b.title->>p_locale) like q.like then 28 when app_private.search_norm(coalesce(b.excerpt->>p_locale, '')) like q.like then 18 else 9 end,
      coalesce(b.published_at, b.updated_at)
    from public.blog_posts b cross join q
    where b.status = 'published' and p_locale = any(b.published_locales) and b.slug->>p_locale is not null and (b.published_at is null or b.published_at <= now())
      and app_private.search_norm(coalesce(b.title->>p_locale, '') || ' ' || coalesce(b.excerpt->>p_locale, '') || ' ' || coalesce(b.body->>p_locale, '')) like q.like
    union all
    select 'service', s.slug->>p_locale, s.title->>p_locale,
      case when app_private.search_norm(s.title->>p_locale) like q.like then 'title' when app_private.search_norm(coalesce(s.excerpt->>p_locale, '')) like q.like then 'excerpt' else 'body' end,
      case when app_private.search_norm(s.title->>p_locale) like q.like then app_private.search_snippet(coalesce(s.excerpt->>p_locale, s.title->>p_locale), p_q)
           when app_private.search_norm(coalesce(s.excerpt->>p_locale, '')) like q.like then app_private.search_snippet(s.excerpt->>p_locale, p_q)
           else app_private.search_snippet(s.body->>p_locale, p_q) end,
      case when app_private.search_norm(s.title->>p_locale) like q.like then 29 when app_private.search_norm(coalesce(s.excerpt->>p_locale, '')) like q.like then 19 else 9 end,
      coalesce(s.published_at, s.updated_at)
    from public.services s cross join q
    where s.status = 'published' and p_locale = any(s.published_locales) and s.slug->>p_locale is not null
      and app_private.search_norm(coalesce(s.title->>p_locale, '') || ' ' || coalesce(s.excerpt->>p_locale, '') || ' ' || coalesce(s.body->>p_locale, '')) like q.like
    union all
    select 'solution', o.slug->>p_locale, o.title->>p_locale,
      case when app_private.search_norm(o.title->>p_locale) like q.like then 'title' when app_private.search_norm(coalesce(o.hero_summary->>p_locale, '')) like q.like then 'excerpt' else 'body' end,
      case when app_private.search_norm(o.title->>p_locale) like q.like then app_private.search_snippet(coalesce(o.hero_summary->>p_locale, o.title->>p_locale), p_q)
           when app_private.search_norm(coalesce(o.hero_summary->>p_locale, '')) like q.like then app_private.search_snippet(o.hero_summary->>p_locale, p_q)
           else app_private.search_snippet(coalesce(o.problem->>p_locale, '') || ' ' || coalesce(o.technical_basis->>p_locale, ''), p_q) end,
      case when app_private.search_norm(o.title->>p_locale) like q.like then 27 when app_private.search_norm(coalesce(o.hero_summary->>p_locale, '')) like q.like then 17 else 8 end,
      coalesce(o.published_at, o.updated_at)
    from public.solutions o cross join q
    where o.status = 'published' and p_locale = any(o.published_locales) and o.slug->>p_locale is not null
      and app_private.search_norm(coalesce(o.title->>p_locale, '') || ' ' || coalesce(o.hero_summary->>p_locale, '') || ' ' || coalesce(o.problem->>p_locale, '') || ' ' || coalesce(o.technical_basis->>p_locale, '')) like q.like
    union all
    select 'project', r.slug->>p_locale, r.title->>p_locale,
      case when app_private.search_norm(r.title->>p_locale) like q.like then 'title' when app_private.search_norm(coalesce(r.excerpt->>p_locale, '') || ' ' || coalesce(r.location->>p_locale, '') || ' ' || coalesce(r.client_name, '')) like q.like then 'excerpt' else 'body' end,
      case when app_private.search_norm(r.title->>p_locale) like q.like then app_private.search_snippet(coalesce(r.excerpt->>p_locale, r.title->>p_locale), p_q)
           when app_private.search_norm(coalesce(r.excerpt->>p_locale, '') || ' ' || coalesce(r.location->>p_locale, '') || ' ' || coalesce(r.client_name, '')) like q.like then app_private.search_snippet(coalesce(r.excerpt->>p_locale, '') || ' · ' || coalesce(r.location->>p_locale, '') || ' ' || coalesce(r.client_name, ''), p_q)
           else app_private.search_snippet(r.body->>p_locale, p_q) end,
      case when app_private.search_norm(r.title->>p_locale) like q.like then 26 when app_private.search_norm(coalesce(r.excerpt->>p_locale, '') || ' ' || coalesce(r.location->>p_locale, '') || ' ' || coalesce(r.client_name, '')) like q.like then 16 else 8 end,
      coalesce(r.published_at, r.updated_at)
    from public.projects r cross join q
    where r.status = 'published' and p_locale = any(r.published_locales) and r.slug->>p_locale is not null and (r.published_at is null or r.published_at <= now())
      and app_private.search_norm(coalesce(r.title->>p_locale, '') || ' ' || coalesce(r.excerpt->>p_locale, '') || ' ' || coalesce(r.body->>p_locale, '') || ' ' || coalesce(r.location->>p_locale, '') || ' ' || coalesce(r.client_name, '')) like q.like
    union all
    select 'page', sp.page_key, sp.title->>p_locale,
      case when app_private.search_norm(sp.title->>p_locale) like q.like then 'title' else 'body' end,
      case when app_private.search_norm(sp.title->>p_locale) like q.like then app_private.search_snippet(sp.body->>p_locale, p_q) else app_private.search_snippet(sp.body->>p_locale, p_q) end,
      case when app_private.search_norm(sp.title->>p_locale) like q.like then 22 else 6 end,
      coalesce(sp.published_at, sp.updated_at)
    from public.static_pages sp cross join q
    where sp.kind in ('legal', 'generic') and sp.status = 'published' and p_locale = any(sp.published_locales)
      and app_private.search_norm(coalesce(sp.title->>p_locale, '') || ' ' || coalesce(sp.body->>p_locale, '')) like q.like
    union all
    select 'faq', f.id::text, f.question->>p_locale,
      case when app_private.search_norm(f.question->>p_locale) like q.like then 'title' else 'body' end,
      app_private.search_snippet(f.answer->>p_locale, p_q),
      case when app_private.search_norm(f.question->>p_locale) like q.like then 24 else 7 end,
      coalesce(f.published_at, f.updated_at)
    from public.faqs f cross join q
    where f.entity_type is null and f.status = 'published' and p_locale = any(f.published_locales)
      and app_private.search_norm(coalesce(f.question->>p_locale, '') || ' ' || coalesce(f.answer->>p_locale, '')) like q.like
  )
  select h.kind, h.slug, h.title, h.field, h.snippet, h.rank::numeric
  from hits h, q
  where length(q.n) >= 2 and h.slug is not null and h.title is not null
  order by h.rank desc, h.at desc nulls last
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;
comment on function public.search_site(text, text, integer) is 'Site içi arama (K-102): yayındaki içerikte Türkçe-duyarlı alt dize eşleşmesi; alan + parça + sıra';
grant execute on function public.search_site(text, text, integer) to anon, authenticated;
