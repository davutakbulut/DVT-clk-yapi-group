-- 0060 · Yeni ana sayfa (K-111): ürün kategorisi ikon anahtarı + ana sayfa bölüm metinleri (site_settings: home.page).
-- Referans: clk-grup-yeni-anasayfa.html (ürün sahibi, 2026-10-09). Yerleşim ve bilgi mimarisi alındı; renk/köşe/yazı tipi site tokenları.
-- Uydurma içerik YOK: kategori/ürün/hizmet/proje/yazı veritabanından; burada yalnız bölüm metinleri tohumlanır (panelden düzenlenir).

-- ── Ürün kategorisi ikonu (ana sayfa 01 Malzeme kartları; src/modules/products ProductCategoryIcon ile aynı küme) ────
create or replace function app_private.is_category_icon_key(p text) returns boolean language sql immutable as $$
  select p is null or p in ('profile','sheet','rebar','panel','insulation','board','drywall','wall','cement','generic')
$$;
alter table public.product_categories
  add column if not exists icon_key text check (app_private.is_category_icon_key(icon_key));

update public.product_categories set icon_key = v.k
from (values
  ('celik-profiller', 'profile'),
  ('sac', 'sheet'),
  ('sandvic-panel', 'panel'),
  ('ahsap-levhalar', 'board'),
  ('alci-levhalar', 'drywall'),
  ('yalitim-malzemeleri', 'insulation'),
  ('duvar-yapi-malzemeleri', 'wall'),
  ('yapi-malzemeleri', 'cement')
) as v(slug, k)
where product_categories.slug->>'tr' = v.slug and product_categories.icon_key is null;

-- ── Ana sayfa bölüm metinleri (panel: /admin/pages/home) ──────────────────────────────────────────────────────────────
insert into public.site_settings (key, value, is_public, description) values
('home.page', '{
  "hero": {
    "eyebrow": {"tr": "Yapı malzemesi · Çelik yapı uygulaması", "en": "Building materials · Steel construction"},
    "materialsCta": {"tr": "Malzemeleri gör", "en": "See the materials"},
    "servicesCta": {"tr": "Uygulama hizmetleri", "en": "Construction services"},
    "note": {"tr": "Ölçünüzü girin, tonajı ve metrajı hemen görün:", "en": "Enter your dimensions and see the tonnage and take-off instantly:"},
    "noteLink": {"tr": "3D konfigüratör", "en": "3D configurator"},
    "paths": [
      {"tag": {"tr": "Malzeme satışı", "en": "Materials"}, "title": {"tr": "Malzemesini satıyoruz", "en": "We sell the materials"}, "text": {"tr": "Çelik profil, sac, inşaat demiri, yalıtım, sandviç panel, alçıpan ve ahşap levha. Toptan ve proje bazlı tedarik.", "en": "Steel sections, sheet, rebar, insulation, sandwich panels, drywall and wood boards. Wholesale and project-based supply."}},
      {"tag": {"tr": "Uygulama", "en": "Construction"}, "title": {"tr": "Uygulamasını yapıyoruz", "en": "We build it"}, "text": {"tr": "Statik projeden imalata, montajdan anahtar teslime. Kentsel dönüşüm, endüstriyel yapı, konut ve çatı.", "en": "From structural design to fabrication, from erection to turnkey delivery. Urban renewal, industrial buildings, housing and roofs."}}
    ]
  },
  "materials": {
    "title": {"tr": "Sahada kullandığımız\nmalzemeyi satıyoruz", "en": "We sell the materials\nwe use on site"},
    "lede": {"tr": "Toptan ve proje bazlı tedarik sağlıyoruz. Her ürünün ölçü ve ağırlık tablosu, hesaplayıcısı ve teklif listesi ürün sayfasında.", "en": "Wholesale and project-based supply. Every product page has size and weight tables, a calculator and a quote list."},
    "why": [
      {"title": {"tr": "Deneyimden öneriyoruz", "en": "Recommended from experience"}, "text": {"tr": "Sahada bizzat kullandığımız, kalitesinden emin olduğumuz ürünleri tedarik ediyoruz; sadece katalogdan değil, deneyimden öneriyoruz.", "en": "We supply products we use on site ourselves and trust; our recommendations come from experience, not just a catalogue."}},
      {"title": {"tr": "Tek elden koordinasyon", "en": "Single point of coordination"}, "text": {"tr": "İnşaat ya da tadilat projenizle birlikte malzemeyi de tek elden aldığınızda lojistik ve zamanlama kolaylaşır.", "en": "Buying the materials together with your construction or renovation project makes logistics and scheduling easier."}},
      {"title": {"tr": "Projeye özel fiyat", "en": "Project-specific pricing"}, "text": {"tr": "Proje bazlı toplu alımlarda size özel fiyatlandırma ve teslim planı oluşturuyoruz.", "en": "For project-based bulk purchases we prepare dedicated pricing and a delivery plan."}}
    ],
    "cta": {"title": {"tr": "Aradığınız listede yok mu?", "en": "Can''t find it in the list?"}, "text": {"tr": "Ürün, miktar ve teslim yerini yazın; uygun fiyat ve teslim süresiyle dönelim.", "en": "Tell us the product, quantity and delivery location; we will come back with a price and lead time."}, "button": {"tr": "Malzeme teklifi iste", "en": "Request a materials quote"}}
  },
  "services": {
    "title": {"tr": "Projeden montaja\ntek elden", "en": "From design to erection,\none team"},
    "lede": {"tr": "Çelik yapının statik projesini çiziyor, imalatını ve montajını yapıyoruz. Betonarmeden zemin kaplamaya, iç mekândan peyzaja kadar yapının geri kalanını da aynı ekip ve tek sözleşmeyle üstleniyoruz.", "en": "We design the steel structure, fabricate it and erect it. From concrete to floor coatings and from interiors to landscaping, the same team delivers the rest of the building under a single contract."}
  },
  "configurator": {
    "title": {"tr": "Fiyatı ve tonajı\nkendiniz görün", "en": "See the price and tonnage\nyourself"},
    "lede": {"tr": "Teklif istemeden önce yapınızın ölçülerini girin; taşıyıcı sistem üç boyutlu oluşsun, metraj ve çelik tonajı anında hesaplansın.", "en": "Before requesting a quote, enter your building''s dimensions; the structure is built in 3D and the take-off and steel tonnage are calculated instantly."},
    "button": {"tr": "Konfigüratörü aç", "en": "Open the configurator"}
  },
  "projects": {
    "title": {"tr": "Son projeler", "en": "Recent projects"},
    "cta": {"kicker": {"tr": "Sizin projeniz", "en": "Your project"}, "title": {"tr": "Sıradaki proje sizinki olsun", "en": "Let the next project be yours"}, "text": {"tr": "Çizim, ölçü ya da sadece bir fikirle gelin; keşif ve ön fiyatı birlikte çıkaralım.", "en": "Come with a drawing, dimensions or just an idea; we will work out the survey and a preliminary price together."}}
  },
  "contact": {
    "title": {"tr": "İşinizi konuşalım", "en": "Let''s talk about your job"},
    "lede": {"tr": "Malzeme mi lazım, uygulama mı? Ürün, miktar ve teslim yerini ya da çizim, ölçü veya sadece bir fikrinizi yazın; uygun fiyat ve süreyle dönelim.", "en": "Need materials or construction? Tell us the product, quantity and delivery location, or send a drawing, dimensions or just an idea; we will come back with a price and schedule."}
  }
}'::jsonb, true, 'Ana sayfa bölüm metinleri (K-111): hero, malzeme, uygulama, konfigüratör, projeler, iletişim — /admin/pages/home')
on conflict (key) do nothing;
