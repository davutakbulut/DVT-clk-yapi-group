-- 0014 · Menü yapısı (Faz 4). YAPISALDIR, içerik değil: bağlantı etiketleri ve hedef yollar
-- docs/modules/01-PUBLIC-PAGES.md › Header / Footer tablosundan birebir.
--
-- Yalnız menü BOŞSA yazar: panelden yapılmış düzenlemeyi ezmez, yeniden çalışsa da çoğaltmaz.
-- internal_path = src/i18n/routing.ts pathnames anahtarı. Route'u henüz olmayan öğe ön yüzde
-- gösterilmez (K-50); ilgili faz route'u ekleyince kendiliğinden görünür.
-- Şema düzeltmesi: 0001'deki sortable('menu_items','parent_id') kök öğeleri yalnız parent_id ile kapsamlıyordu →
-- farklı menülerin kök öğeleri (parent_id null) aynı sort_order'ı alamıyordu. Kapsam (menu_id, parent_id) olmalı.
alter table public.menu_items drop constraint menu_items_sort_order_uq;
alter table public.menu_items add constraint menu_items_sort_order_uq
  unique nulls not distinct (menu_id, parent_id, sort_order) deferrable initially deferred;

create function app_private.assign_menu_item_sort_order() returns trigger
language plpgsql as $$
begin
  if new.sort_order is null then
    select coalesce(max(sort_order), 0) + 1 into new.sort_order
    from public.menu_items where menu_id = new.menu_id and parent_id is not distinct from new.parent_id;
  end if;
  return new;
end $$;
drop trigger assign_sort_order on public.menu_items;
create trigger assign_sort_order before insert on public.menu_items for each row execute function app_private.assign_menu_item_sort_order();

do $$
declare
  v_header uuid := (select id from public.menus where key = 'header');
  v_footer uuid := (select id from public.menus where key = 'footer_primary');
  v_legal  uuid := (select id from public.menus where key = 'footer_legal');
  v_col    uuid;
begin
  if not exists (select 1 from public.menu_items where menu_id = v_header) then
    insert into public.menu_items (menu_id, label, link_type, internal_path, header_slot, is_cta, sort_order) values
      (v_header, '{"tr": "Hizmetler",    "en": "Services"}',     'internal', '/services',     'left',  false, 1),
      (v_header, '{"tr": "Ürünler",      "en": "Products"}',     'internal', '/products',     'left',  false, 2),
      (v_header, '{"tr": "Projeler",     "en": "Projects"}',     'internal', '/projects',     'left',  false, 3),
      (v_header, '{"tr": "Konfigüratör", "en": "Configurator"}', 'internal', '/configurator', 'left',  false, 4),
      (v_header, '{"tr": "Blog",         "en": "Blog"}',         'internal', '/blog',         'right', false, 5),
      (v_header, '{"tr": "Hakkımızda",   "en": "About"}',        'internal', '/about',        'right', false, 6),
      (v_header, '{"tr": "İletişim",     "en": "Contact"}',      'internal', '/contact',      'right', false, 7),
      (v_header, '{"tr": "Teklif Al",    "en": "Get a Quote"}',  'internal', '/get-quote',    'right', true,  8);
  end if;

  if not exists (select 1 from public.menu_items where menu_id = v_footer) then
    insert into public.menu_items (menu_id, label, link_type, sort_order) values (v_footer, '{"tr": "Kurumsal", "en": "Company"}', 'none', 1) returning id into v_col;
    insert into public.menu_items (menu_id, parent_id, label, link_type, internal_path, sort_order) values
      (v_footer, v_col, '{"tr": "Hakkımızda",      "en": "About"}',        'internal', '/about',        1),
      (v_footer, v_col, '{"tr": "Ekibimiz",        "en": "Team"}',         'internal', '/team',         2),
      (v_footer, v_col, '{"tr": "Referanslarımız", "en": "References"}',   'internal', '/references',   3),
      (v_footer, v_col, '{"tr": "Belgelerimiz",    "en": "Certificates"}', 'internal', '/certificates', 4),
      (v_footer, v_col, '{"tr": "Kariyer",         "en": "Careers"}',      'internal', '/careers',      5),
      (v_footer, v_col, '{"tr": "İletişim",        "en": "Contact"}',      'internal', '/contact',      6);

    -- Hizmet listesi Faz 7'de entity bağlantılarıyla (services tablosundan) bu sütunun altına gelir.
    insert into public.menu_items (menu_id, label, link_type, sort_order) values (v_footer, '{"tr": "Hizmetler", "en": "Services"}', 'none', 2) returning id into v_col;
    insert into public.menu_items (menu_id, parent_id, label, link_type, internal_path, sort_order) values
      (v_footer, v_col, '{"tr": "Tüm Hizmetler", "en": "All Services"}', 'internal', '/services',  1),
      (v_footer, v_col, '{"tr": "Çözümler",      "en": "Solutions"}',    'internal', '/solutions', 2),
      (v_footer, v_col, '{"tr": "Fiyat Rehberi", "en": "Price Guide"}',  'internal', '/pricing',   3);

    insert into public.menu_items (menu_id, label, link_type, sort_order) values (v_footer, '{"tr": "Ürün & Proje", "en": "Products & Projects"}', 'none', 3) returning id into v_col;
    insert into public.menu_items (menu_id, parent_id, label, link_type, internal_path, sort_order) values
      (v_footer, v_col, '{"tr": "Ürünler",      "en": "Products"}',     'internal', '/products',     1),
      (v_footer, v_col, '{"tr": "Projeler",     "en": "Projects"}',     'internal', '/projects',     2),
      (v_footer, v_col, '{"tr": "Konfigüratör", "en": "Configurator"}', 'internal', '/configurator', 3),
      (v_footer, v_col, '{"tr": "Blog",         "en": "Blog"}',         'internal', '/blog',         4);
  end if;

  if not exists (select 1 from public.menu_items where menu_id = v_legal) then
    insert into public.menu_items (menu_id, label, link_type, internal_path, sort_order) values
      (v_legal, '{"tr": "Gizlilik Politikası",  "en": "Privacy Policy"}',   'internal', '/privacy-policy',  1),
      (v_legal, '{"tr": "Çerez Politikası",     "en": "Cookie Policy"}',    'internal', '/cookie-policy',   2),
      (v_legal, '{"tr": "KVKK Aydınlatma Metni","en": "Data Protection"}',  'internal', '/data-protection', 3),
      (v_legal, '{"tr": "Kullanım Koşulları",   "en": "Terms of Use"}',     'internal', '/terms-of-use',    4),
      (v_legal, '{"tr": "Site Haritası",        "en": "Sitemap"}',          'internal', '/sitemap',         5);
  end if;
end $$;
