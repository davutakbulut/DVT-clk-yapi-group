-- 0022 · Yasal sayfalar (Faz 12): gizlilik, çerez, KVKK aydınlatma, kullanım koşulları. TASLAK başlar — metin hukukçu
-- onayıyla panelden yazılır (ROADMAP engelleyicisi); slug'lar 01-PUBLIC-PAGES route tablosuyla birebir.
-- kind='legal' → auto_translate_disabled zorunlu (Kural 7, 0002 CHECK).
insert into public.static_pages (page_key, kind, slug, title, auto_translate_disabled, status, published_locales)
select * from (values
  ('privacy-policy',  'legal', '{"tr": "gizlilik-politikasi",    "en": "privacy-policy"}'::jsonb,  '{"tr": "Gizlilik Politikası",     "en": "Privacy Policy"}'::jsonb,  true, 'draft', '{}'::text[]),
  ('cookie-policy',   'legal', '{"tr": "cerez-politikasi",       "en": "cookie-policy"}'::jsonb,   '{"tr": "Çerez Politikası",        "en": "Cookie Policy"}'::jsonb,   true, 'draft', '{}'::text[]),
  ('data-protection', 'legal', '{"tr": "kvkk-aydinlatma-metni",  "en": "data-protection"}'::jsonb, '{"tr": "KVKK Aydınlatma Metni",   "en": "Data Protection Notice"}'::jsonb, true, 'draft', '{}'::text[]),
  ('terms-of-use',    'legal', '{"tr": "kullanim-kosullari",     "en": "terms-of-use"}'::jsonb,    '{"tr": "Kullanım Koşulları",      "en": "Terms of Use"}'::jsonb,    true, 'draft', '{}'::text[])
) as v(page_key, kind, slug, title, auto_translate_disabled, status, published_locales)
where not exists (select 1 from public.static_pages p where p.page_key = v.page_key);

-- Çerez bandı varsayılan metni (yalnız boşsa): analitik/pazarlama onayı Faz 23'te script yüklemeyi kapılar.
update public.site_settings
   set value = '{"tr": {"title": "Çerez kullanımı", "body": "Sitenin çalışması için zorunlu çerezler kullanılır. Analitik ve pazarlama çerezleri yalnız onayınızla yüklenir.", "accept": "Tümünü kabul et", "reject": "Yalnız zorunlu", "settings": "Çerez ayarları"}, "en": {"title": "Cookies", "body": "Essential cookies are required for the site to work. Analytics and marketing cookies load only with your consent.", "accept": "Accept all", "reject": "Essential only", "settings": "Cookie settings"}}'::jsonb
 where key = 'cookie_banner' and (value is null or value = 'null'::jsonb or value = '{}'::jsonb);

-- Doğrulama kodları <head>'de görünür: gizli değil; ön yüzün okuyabilmesi için herkese açık.
update public.site_settings set is_public = true where key in ('seo.verification', 'seo.default_og_media_id');
