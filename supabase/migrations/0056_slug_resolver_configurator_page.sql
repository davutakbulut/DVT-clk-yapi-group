-- 0056 · resolve_old_slug: 'configurator_page' → configurator_pages eşlemesi (K-107; 0055'te unutulmuştu → eski slug 308 vermiyordu)
create or replace function public.resolve_old_slug(p_entity_type text, p_locale text, p_old_slug text) returns text
language plpgsql stable set search_path = '' as $$
declare
  v_table text := case p_entity_type
    when 'service' then 'services' when 'solution' then 'solutions' when 'price_guide' then 'price_guides'
    when 'project' then 'projects' when 'project_category' then 'project_categories'
    when 'blog_post' then 'blog_posts' when 'blog_category' then 'blog_categories' when 'blog_tag' then 'blog_tags'
    when 'product' then 'products' when 'product_category' then 'product_categories'
    when 'job_posting' then 'job_postings' when 'static_page' then 'static_pages'
    when 'configurator_page' then 'configurator_pages' end;
  v_slug text;
begin
  if v_table is null or p_locale not in ('tr','en') then return null; end if;
  execute format('select t.slug->>$1 from public.slug_history h join public.%I t on t.id = h.entity_id
                   where h.entity_type = $2 and h.locale = $1 and h.old_slug = $3', v_table)
    into v_slug using p_locale, p_entity_type, p_old_slug;
  return v_slug;
end $$;
