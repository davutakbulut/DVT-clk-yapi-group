-- 0012 · Referans verisi — sitenin AYAĞA KALKMASI için gereken yapısal kayıtlar.
-- Migration olarak yazıldı çünkü `supabase db push` seed.sql'i ÇALIŞTIRMAZ; bunlar üretimde de gerekli.
-- Tekrar çalışsa da zarar vermez (on conflict do nothing) ve panelden yapılmış düzenlemeyi EZMEZ.
--
-- ⛔ Burada gerçek olmayan veri YOKTUR: fiyat, müşteri yorumu, sertifika, proje, ekip üyesi, mühendislik
--    değeri yazılmadı. O tablolar boş başlar; firma doldurunca sayfalar kendiliğinden görünür olur.

insert into public.menus (key, title) values
  ('header',         '{"tr": "Üst menü",            "en": "Header"}'),
  ('footer_primary', '{"tr": "Alt menü",            "en": "Footer"}'),
  ('footer_legal',   '{"tr": "Alt menü — yasal",    "en": "Footer — legal"}'),
  ('mobile_extra',   '{"tr": "Mobil ek bağlantılar", "en": "Mobile extras"}'),
  ('account',        '{"tr": "Hesabım menüsü",      "en": "Account menu"}')
on conflict (key) do nothing;

-- Değerler BOŞ (null): firma bilgileri bekleniyor (docs/ROADMAP.md › Engelleyiciler). Ön yüz, değeri null olan
-- ayarın bölümünü render etmez — yer tutucu telefon/adres ASLA gösterilmez.
insert into public.site_settings (key, value, is_public, description) values
  ('site.name',              '{"tr": "CLK Yapı Group", "en": "CLK Yapı Group"}', true,  'Site adı'),
  ('site.tagline',           'null', true,  'Slogan {tr,en}'),
  ('site.logo_media_id',     'null', true,  'Logo (media_library.id)'),
  ('site.logo_dark_media_id','null', true,  'Koyu zemin logosu'),
  ('site.favicon_media_id',  'null', true,  'Favicon'),
  ('contact.phone',          'null', true,  'Telefon (E.164)'),
  ('contact.email',          'null', true,  'E-posta'),
  ('contact.address',        'null', true,  'Adres {tr,en}'),
  ('contact.map_url',        'null', true,  'Harita bağlantısı'),
  ('contact.working_hours',  'null', true,  'Çalışma saatleri'),
  ('social.links',           '[]',   true,  'Sosyal medya [{platform,url}]'),
  ('seo.default_description','null', true,  'Varsayılan meta açıklama {tr,en}'),
  ('seo.default_og_media_id','null', true,  'Varsayılan OG görseli'),
  ('seo.verification',       '{}',   false, 'Arama motoru doğrulama kodları'),
  ('cookie_banner',          'null', true,  'Çerez onay bandı metinleri {tr,en}'),
  ('maintenance',            '{"enabled": false}', true, 'Bakım modu'),
  ('quote_form.options',     '{}',   true,  'Teklif formu seçenekleri'),
  ('configurator.limits',    '{"max_per_member": 20}', false, 'Üye başına konfigürasyon üst limiti'),
  -- K-43 kill switch. Henüz yapılmamış modüller KAPALI başlar; her faz kendi modülünü açar.
  ('modules.enabled',        '{}',   false, 'Modül aç/kapa {modul: boolean}')
on conflict (key) do nothing;

insert into public.whatsapp_settings (key) values ('main') on conflict (key) do nothing;
insert into public.about_content (key) values ('main') on conflict (key) do nothing;

-- Hata sayfası metinleri — docs/modules/01-PUBLIC-PAGES.md › Hata Sayfaları. Gövde metni panelden yazılır.
-- EN başlıkları makine taslağıdır: reviewed=false → published_locales'e 'en' GİREMEZ (K-08, kısıt zorlar);
-- İngilizce sitede onaylanana kadar messages/en.json'daki nötr metin görünür.
insert into public.static_pages (page_key, kind, title, status, published_locales, published_at, translation_meta) values
  ('error-404',   'error',  '{"tr": "Bu kat henüz inşa edilmedi",      "en": "This floor has not been built yet"}',   'published', '{tr}', now(), '{"en": {"machine": true, "reviewed": false}}'),
  ('error-403',   'error',  '{"tr": "Bu şantiyeye giriş izniniz yok",  "en": "You are not cleared to enter this site"}', 'published', '{tr}', now(), '{"en": {"machine": true, "reviewed": false}}'),
  ('error-500',   'error',  '{"tr": "Yapısal bir hata oluştu",         "en": "A structural fault occurred"}',         'published', '{tr}', now(), '{"en": {"machine": true, "reviewed": false}}'),
  ('maintenance', 'system', '{"tr": "Tadilat halindeyiz",              "en": "We are under renovation"}',             'published', '{tr}', now(), '{"en": {"machine": true, "reviewed": false}}')
on conflict (page_key) do nothing;

-- Makine çevirisine verilecek terim sözlüğü — sektörün yerleşik karşılıkları (uydurma değil, terminoloji).
insert into public.translation_glossary (term_tr, term_en, context, do_not_translate) values
  ('CLK Yapı Group',       'CLK Yapı Group',           'marka',  true),
  ('çelik konstrüksiyon',  'steel construction',       '',       false),
  ('hafif çelik',          'light gauge steel',        '',       false),
  ('kutu profil',          'box profile',              '',       false),
  ('körkasa',              'subframe',                 'kapı/pencere', false),
  ('makas',                'truss',                    'çatı',   false),
  ('aşık',                 'purlin',                   'çatı',   false),
  ('kuşak',                'girt',                     'cephe',  false),
  ('mahya',                'ridge',                    'çatı',   false),
  ('saçak',                'eave',                     'çatı',   false),
  ('aks aralığı',          'bay spacing',              '',       false),
  ('sandviç panel',        'sandwich panel',           '',       false),
  ('metraj',               'quantity take-off',        '',       false),
  ('keşif',                'site survey',              'teklif', false),
  ('hakediş',              'progress payment',         'finans', false),
  ('tevkifat',             'VAT withholding',          'finans', false),
  ('kentsel dönüşüm',      'urban transformation',     '',       false)
on conflict (term_tr, context) do nothing;
