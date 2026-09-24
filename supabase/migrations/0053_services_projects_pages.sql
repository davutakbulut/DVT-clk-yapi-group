-- 0053 · Hizmetler & Projeler sayfaları (K-106): gruplu hizmetler, teknik çizim anahtarı, öne çıkanlar, proje aşaması/süresi/yılı,
-- 10 proje kategorisi, sayfa metinleri (site_settings: services.page / projects.page) ve içerik tohumu (referans: projeler.html, hizmetler.html).
-- Uydurma proje YOK (K-75): yalnız referansta gerçek bilgisi olan iki tasarım aşamasındaki proje; yer tutucu satırlar alınmadı.

-- ── Şema ────────────────────────────────────────────────────────────────────────────────────────────────────────────
create or replace function app_private.is_drawing_key(p text) returns boolean language sql immutable as $$
  select p is null or p in ('konut','cati','kentsel','endustri','betonarme','epoksi','alcipan','tadilat','peyzaj','proje')
$$;
alter table public.services
  add column if not exists group_key text not null default 'steel' check (group_key in ('steel','engineering','construction')),
  add column if not exists highlights jsonb not null default '{}'::jsonb check (jsonb_typeof(highlights) = 'object' and pg_column_size(highlights) <= 8192),
  add column if not exists drawing_key text check (app_private.is_drawing_key(drawing_key)),
  add column if not exists project_category_id uuid references public.project_categories(id) on delete set null;
alter table public.projects
  add column if not exists phase text not null default 'completed' check (phase in ('completed','ongoing','design')),
  add column if not exists duration_label jsonb not null default '{}'::jsonb check (jsonb_typeof(duration_label) = 'object'),
  add column if not exists year integer check (year is null or (year between 1990 and 2100)),
  add column if not exists drawing_key text check (app_private.is_drawing_key(drawing_key));
alter table public.project_categories
  add column if not exists drawing_key text check (app_private.is_drawing_key(drawing_key));
create index if not exists services_group_idx on public.services (group_key, sort_order);
create index if not exists projects_phase_idx on public.projects (phase) where status = 'published';

-- ── Proje kategorileri (10; slug->>'tr' tekil) ──────────────────────────────────────────────────────────────────────
insert into public.project_categories (slug, name, description, drawing_key, sort_order, is_active)
select * from (values
  ('{"tr":"kentsel-donusum","en":"urban-renewal"}'::jsonb, '{"tr":"Çelik Kentsel Dönüşüm","en":"Steel Urban Renewal"}'::jsonb, '{"tr":"Dar parselde çelik karkasla yeniden yapım.","en":"Rebuilding on narrow plots with a steel frame."}'::jsonb, 'kentsel', 1, true),
  ('{"tr":"celik-konut-ve-villa","en":"steel-housing-and-villas"}'::jsonb, '{"tr":"Çelik Konut ve Villa","en":"Steel Housing and Villas"}'::jsonb, '{"tr":"Müstakil ev, villa ve kat ilavesi.","en":"Detached houses, villas and storey additions."}'::jsonb, 'konut', 2, true),
  ('{"tr":"endustriyel","en":"industrial"}'::jsonb, '{"tr":"Endüstriyel Tesis ve Hangar","en":"Industrial Facilities and Hangars"}'::jsonb, '{"tr":"Üretim, depo ve lojistik yapıları.","en":"Production, warehouse and logistics buildings."}'::jsonb, 'endustri', 3, true),
  ('{"tr":"cati-ve-cephe","en":"roof-and-facade"}'::jsonb, '{"tr":"Çatı ve Cephe","en":"Roof and Facade"}'::jsonb, '{"tr":"Hafif çelik çatı, kaplama ve cephe taşıyıcıları.","en":"Light steel roofs, cladding and facade supports."}'::jsonb, 'cati', 4, true),
  ('{"tr":"betonarme","en":"reinforced-concrete"}'::jsonb, '{"tr":"Betonarme","en":"Reinforced Concrete"}'::jsonb, '{"tr":"Temel, perde ve betonarme taşıyıcı sistem.","en":"Foundations, shear walls and concrete structures."}'::jsonb, 'betonarme', 5, true),
  ('{"tr":"zemin-epoksi","en":"epoxy-flooring"}'::jsonb, '{"tr":"Zemin Epoksi","en":"Epoxy Flooring"}'::jsonb, '{"tr":"Fabrika, depo ve otopark zeminleri.","en":"Factory, warehouse and car park floors."}'::jsonb, 'epoksi', 6, true),
  ('{"tr":"kuru-duvar","en":"drywall"}'::jsonb, '{"tr":"İç Dekorasyon ve Alçıpan","en":"Interior and Drywall"}'::jsonb, '{"tr":"Bölme duvar, asma tavan ve iç mekân düzenlemesi.","en":"Partition walls, suspended ceilings and interiors."}'::jsonb, 'alcipan', 7, true),
  ('{"tr":"tadilat-ve-tamirat","en":"renovation-and-repair"}'::jsonb, '{"tr":"Tadilat ve Tamirat","en":"Renovation and Repair"}'::jsonb, '{"tr":"Onarım, yenileme ve küçük ölçekli yapısal işler.","en":"Repairs, refurbishment and small structural works."}'::jsonb, 'tadilat', 8, true),
  ('{"tr":"cevre-ve-peyzaj","en":"landscaping"}'::jsonb, '{"tr":"Çevre ve Peyzaj","en":"Landscaping"}'::jsonb, '{"tr":"Bahçe düzenlemesi, çevre duvarı, kamelya ve pergole.","en":"Garden layout, boundary walls, gazebos and pergolas."}'::jsonb, 'peyzaj', 9, true),
  ('{"tr":"proje-statik-ve-3d-render","en":"design-structural-and-3d-render"}'::jsonb, '{"tr":"Proje, Statik ve 3D Render","en":"Design, Structural and 3D Render"}'::jsonb, '{"tr":"Statik hesap, uygulama çizimleri ve 3B görseller.","en":"Structural design, shop drawings and 3D visuals."}'::jsonb, 'proje', 10, true)
) as v(slug, name, description, drawing_key, sort_order, is_active)
on conflict ((slug->>'tr')) where slug->>'tr' is not null do update set name = excluded.name, description = excluded.description, drawing_key = excluded.drawing_key, sort_order = excluded.sort_order, is_active = excluded.is_active, slug = excluded.slug;
update public.project_categories set is_active = false, sort_order = 99 where slug->>'tr' = 'ticari';

-- ── Hizmetler: mevcut 4 güncellenir, 8 yeni eklenir (TR yayında; EN taslak, insan onayı bekler — K-07) ───────────────
with cat as (select id, slug->>'tr' as s from public.project_categories)
update public.services sv set group_key = v.grp, drawing_key = v.draw, highlights = v.hl, project_category_id = (select id from cat where s = v.cat), sort_order = v.ord
from (values
  ('kentsel-donusum-celik-karkas', 'steel', 'kentsel', 'kentsel-donusum', 1, '{"tr":["Mevcut yapı ve zemin değerlendirmesi","Çok katlı çelik karkas projesi","İmalat, montaj ve döşeme sistemi"],"en":["Existing structure and soil assessment","Multi-storey steel frame design","Fabrication, erection and floor system"]}'::jsonb),
  ('endustriyel-tesis-ve-depo', 'steel', 'endustri', 'endustriyel', 3, '{"tr":["Portal çerçeve ve kafes sistemler","Vinç yolu ve asma kat","Sandviç panel çatı ve cephe"],"en":["Portal frames and truss systems","Crane runways and mezzanines","Sandwich panel roof and facade"]}'::jsonb),
  ('celik-cati-ve-cephe-sistemleri', 'steel', 'cati', 'cati-ve-cephe', 4, '{"tr":["Kırma, beşik ve tek eğimli çatılar","Trapez, sandviç panel ve kenet kaplama","Cephe alt konstrüksiyonu"],"en":["Hipped, gable and mono-pitch roofs","Trapezoidal, sandwich panel and standing-seam cladding","Facade sub-structure"]}'::jsonb),
  ('celik-yapi-guclendirme', 'steel', 'tadilat', 'tadilat-ve-tamirat', 5, '{"tr":["Performans analizi","Çelik çapraz ve mantolama","Kolon ve kiriş takviyesi"],"en":["Performance analysis","Steel bracing and jacketing","Column and beam reinforcement"]}'::jsonb)
) as v(s, grp, draw, cat, ord, hl)
where sv.slug->>'tr' = v.s;

with cat as (select id, slug->>'tr' as s from public.project_categories)
insert into public.services (slug, title, excerpt, body, highlights, group_key, drawing_key, project_category_id, process_steps, icon, is_featured, sort_order, status, published_locales, published_at)
select v.slug, v.title, v.excerpt, v.body, v.hl, v.grp, v.draw, (select id from cat where s = v.cat), '[]'::jsonb, v.icon, false, v.ord, 'published', '{tr}', now()
from (values
  ('{"tr":"celik-konut-ve-villa","en":"steel-housing-and-villas"}'::jsonb, '{"tr":"Çelik Konut ve Villa","en":"Steel Housing and Villas"}'::jsonb,
   '{"tr":"Müstakil ev, villa ve kat ilavesi için hafif ve depreme dayanıklı çelik taşıyıcı sistem.","en":"A light, earthquake-resistant steel frame for detached houses, villas and storey additions."}'::jsonb,
   '{"tr":"Mimari plana göre çelik taşıyıcı sistemi tasarlıyor, atölyede imal edip sahada bulonlu birleşimle kuruyoruz. Çelik karkas betonarmeye göre daha hafiftir; deprem kuvveti ve temel yükü düşer, şantiye süresi kısalır.\n\nMevcut bir yapıya kat ilavesi ya da genişleme planlıyorsanız önce taşıyıcı sistemin ek yükü karşılayıp karşılamadığını değerlendiriyor, gerekiyorsa güçlendirmeyle birlikte projelendiriyoruz.\n\nİsteğe bağlı anahtar teslim seçeneğinde çatı, cephe, iç mekân ve çevre düzenlemesi de aynı ekip ve tek sözleşmeyle yürütülür.","en":"We design the steel frame to your architectural plan, fabricate it in the workshop and erect it on site with bolted connections. A steel frame is lighter than reinforced concrete: lower seismic forces, lighter foundations and a shorter site programme.\n\nFor a storey addition or extension to an existing building we first assess whether the existing structure can carry the added load and design any strengthening together with the new frame.\n\nWith the optional turnkey package the roof, facade, interiors and landscaping are handled by the same team under a single contract."}'::jsonb,
   '{"tr":["Mimari plana göre çelik tasarım","Kat ilavesi ve genişleme","Anahtar teslim seçeneği"],"en":["Steel design to the architectural plan","Storey additions and extensions","Turnkey option"]}'::jsonb, 'steel', 'konut', 'celik-konut-ve-villa', 2, 'building'),
  ('{"tr":"celik-imalat-ve-montaj","en":"steel-fabrication-and-erection"}'::jsonb, '{"tr":"Çelik İmalat ve Montaj","en":"Steel Fabrication and Erection"}'::jsonb,
   '{"tr":"Projesi hazır yapılar için kesim listesine göre atölye imalatı ve sahada montaj.","en":"Workshop fabrication from the cutting list and site erection for buildings whose design is ready."}'::jsonb,
   '{"tr":"Statik projesi ve uygulama çizimleri hazır olan yapılar için yalnız imalat ve montajı üstleniyoruz. Kesim listesine göre profiller kesilir, delinir ve kaynaklanır; yüzey koruması olarak antipas, boya ya da sıcak daldırma galvaniz uygulanır.\n\nSahada elemanlar bulonlu birleşimlerle kurulur; kaynak sahaya bırakılmaz. Montaj sonrası birleşim kontrolü ve teslim tutanağı hazırlanır.","en":"For buildings whose structural design and shop drawings are ready we take on fabrication and erection only. Sections are cut, drilled and welded to the cutting list; surface protection is primer, paint or hot-dip galvanising.\n\nOn site the members are assembled with bolted connections, with no welding left to the field. Connections are inspected after erection and a hand-over record is prepared."}'::jsonb,
   '{"tr":["Kesim, delik ve kaynak","Antipas, boya veya galvaniz","Sahada bulonlu montaj"],"en":["Cutting, drilling and welding","Primer, paint or galvanising","Bolted site erection"]}'::jsonb, 'steel', 'endustri', 'endustriyel', 6, 'factory'),
  ('{"tr":"proje-statik-hesap-ve-3d-render","en":"design-structural-analysis-and-3d-render"}'::jsonb, '{"tr":"Proje, Statik Hesap ve 3D Render","en":"Design, Structural Analysis and 3D Render"}'::jsonb,
   '{"tr":"Çelik ve betonarme yapıların statik hesabı, uygulama projeleri ve yapıyı inşa edilmeden görmenizi sağlayan 3B görseller.","en":"Structural analysis of steel and concrete buildings, shop drawings and 3D visuals that let you see the building before it is built."}'::jsonb,
   '{"tr":"Yalnızca proje hizmeti de alabilirsiniz. Çelik ve betonarme yapıların statik hesabını TBDY 2018 ve Çelik Yapılar Yönetmeliği''ne göre yapıyor, mimari proje ve uygulama çizimlerini hazırlıyoruz.\n\nÇelik yapılarda birleşim detayları, kesim listesi ve metraj teslim kapsamındadır; imalatı başka bir firmaya yaptıracaksanız bu belgelerle doğrudan üretime geçilebilir.\n\nFotogerçekçi 3B görseller, yapıyı ve malzeme seçimlerini inşa edilmeden önce görmenizi ve karar vermenizi sağlar.","en":"You can also commission design only. We carry out the structural analysis of steel and concrete buildings to TBDY 2018 and the Turkish Steel Structures Code, and prepare the architectural and shop drawings.\n\nFor steel buildings the connection details, cutting list and quantity take-off are part of the deliverables, so another fabricator can go straight to production.\n\nPhotorealistic 3D visuals let you see the building and its material choices before construction and decide with confidence."}'::jsonb,
   '{"tr":["TBDY 2018 ve Çelik Yapılar Yönetmeliği''ne göre statik hesap","Mimari proje ve uygulama çizimleri","Birleşim detayları, kesim listesi ve metraj","Fotogerçekçi 3D render"],"en":["Structural analysis to TBDY 2018 and the Steel Structures Code","Architectural design and shop drawings","Connection details, cutting list and take-off","Photorealistic 3D render"]}'::jsonb, 'engineering', 'proje', 'proje-statik-ve-3d-render', 10, 'ruler'),
  ('{"tr":"betonarme","en":"reinforced-concrete"}'::jsonb, '{"tr":"Betonarme","en":"Reinforced Concrete"}'::jsonb,
   '{"tr":"Temel, bodrum perdesi ve betonarme taşıyıcı sistem imalatı.","en":"Foundations, basement walls and reinforced concrete structures."}'::jsonb,
   '{"tr":"Çelik yapının temelini ve bodrum perdelerini, gerektiğinde betonarme taşıyıcı sistemin tamamını aynı ekiple imal ediyoruz. Kalıp, donatı ve beton dökümü projeye ve şantiye takvimine göre planlanır; çelik montajıyla eş zamanlı ilerler.","en":"We build the foundations and basement walls of the steel structure, and where needed the entire reinforced concrete frame, with the same team. Formwork, reinforcement and pouring are planned to the design and the site schedule, in parallel with steel erection."}'::jsonb,
   '{}'::jsonb, 'construction', 'betonarme', 'betonarme', 20, 'layers'),
  ('{"tr":"zemin-epoksi","en":"epoxy-flooring"}'::jsonb, '{"tr":"Zemin Epoksi","en":"Epoxy Flooring"}'::jsonb,
   '{"tr":"Fabrika, depo, otopark ve ticari alanlar için epoksi zemin kaplama.","en":"Epoxy floor coating for factories, warehouses, car parks and commercial spaces."}'::jsonb,
   '{"tr":"Zemin hazırlığı (yüzey frezeleme, çatlak onarımı ve astar) sonrasında kullanım yüküne uygun kalınlıkta epoksi kaplama uygulanır. Forklift trafiği, kimyasal dayanım ve kaymazlık ihtiyacına göre sistem seçilir.","en":"After floor preparation (grinding, crack repair and primer) an epoxy coating of a thickness suited to the traffic is applied. The system is chosen for forklift traffic, chemical resistance and slip resistance as required."}'::jsonb,
   '{}'::jsonb, 'construction', 'epoksi', 'zemin-epoksi', 21, 'layers'),
  ('{"tr":"ic-dekorasyon-ve-alcipan","en":"interior-and-drywall"}'::jsonb, '{"tr":"İç Dekorasyon ve Alçıpan","en":"Interior and Drywall"}'::jsonb,
   '{"tr":"Kutu profil ve alçıpan bölme duvar, asma tavan ve iç mekân düzenlemesi.","en":"Box-section and drywall partitions, suspended ceilings and interior fit-out."}'::jsonb,
   '{"tr":"Çelik karkas tamamlandıktan sonra iç mekânı da biz kuruyoruz: kutu profil taşıyıcılı alçıpan bölme duvarlar, asma tavan, ses ve ısı yalıtımı, kapı ve pencere boşlukları. Alçıpan metrajını sitemizdeki konfigüratörle önceden çıkarabilirsiniz.","en":"Once the steel frame is complete we fit out the interior as well: drywall partitions on box-section studs, suspended ceilings, acoustic and thermal insulation, door and window openings. You can estimate drywall quantities in advance with the configurator on our site."}'::jsonb,
   '{}'::jsonb, 'construction', 'alcipan', 'kuru-duvar', 22, 'layers'),
  ('{"tr":"tadilat-ve-tamirat","en":"renovation-and-repair"}'::jsonb, '{"tr":"Tadilat ve Tamirat","en":"Renovation and Repair"}'::jsonb,
   '{"tr":"Konut ve iş yerlerinde onarım, yenileme ve küçük ölçekli yapısal işler.","en":"Repairs, refurbishment and small structural works in homes and workplaces."}'::jsonb,
   '{"tr":"Konut ve iş yerlerinde onarım, yenileme ve küçük ölçekli yapısal işleri üstleniyoruz: çelik takviye, çatı ve cephe onarımı, iç mekân yenileme. Keşif sonrası iş kalemleri ve süre yazılı olarak verilir.","en":"We take on repairs, refurbishment and small structural works in homes and workplaces: steel reinforcement, roof and facade repairs, interior renovation. After the survey the scope and programme are given in writing."}'::jsonb,
   '{}'::jsonb, 'construction', 'tadilat', 'tadilat-ve-tamirat', 23, 'wrench'),
  ('{"tr":"cevre-ve-peyzaj","en":"landscaping"}'::jsonb, '{"tr":"Çevre ve Peyzaj","en":"Landscaping"}'::jsonb,
   '{"tr":"Bahçe düzenlemesi, çevre duvarı, kamelya ve pergole gibi dış mekân işleri.","en":"Garden layout, boundary walls, gazebos, pergolas and other outdoor works."}'::jsonb,
   '{"tr":"Yapı tamamlandıktan sonra dış mekânı da düzenliyoruz: çevre duvarı ve korkuluk, kamelya ve pergole gibi çelik dış mekân yapıları, yürüme yolları ve bahçe düzenlemesi. Çit ve korkuluk metrajını sitemizdeki konfigüratörle önceden çıkarabilirsiniz.","en":"After the building is complete we also lay out the outdoor space: boundary walls and railings, steel outdoor structures such as gazebos and pergolas, paths and garden layout. Fence and railing quantities can be estimated in advance with the configurator on our site."}'::jsonb,
   '{}'::jsonb, 'construction', 'peyzaj', 'cevre-ve-peyzaj', 24, 'hammer')
) as v(slug, title, excerpt, body, hl, grp, draw, cat, ord, icon)
where not exists (select 1 from public.services s where s.slug->>'tr' = v.slug->>'tr');

-- ── Projeler: referans dosyasındaki iki tasarım-aşaması projesi migration'da DEĞİL (sözleşme: gerçek-veri tabloları boş başlar);
--    scripts/import-reference-projects.mjs ile canlıya yazılır (idempotent). Yer tutucu satırlar hiç alınmadı (K-75).

-- ── Sayfa metinleri (panelden düzenlenir: /admin/settings/pages) ───────────────────────────────────────────────────────
insert into public.site_settings (key, value, is_public, description) values
('services.page', '{
  "hero": {"title": {"tr": "Projeden\nmontaja\ntek elden", "en": "From design\nto erection,\none team"}, "lede": {"tr": "Çelik yapının statik projesini çiziyor, imalatını ve montajını yapıyoruz. Betonarmeden zemin kaplamaya, iç mekândan peyzaja kadar yapının geri kalanını da aynı ekip ve tek sözleşmeyle üstleniyoruz.", "en": "We design the steel structure, fabricate it and erect it. From concrete to floor coatings and from interiors to landscaping, the same team delivers the rest of the building under a single contract."}},
  "groups": [
    {"key": "steel", "title": {"tr": "Çelik yapı", "en": "Steel structures"}, "lede": {"tr": "Ana işimiz. Taşıyıcı sistemi TBDY 2018''e göre tasarlıyor, kesim listesiyle atölyede imal ediyor ve sahada bulonlu birleşimle kuruyoruz.", "en": "Our core business. We design the structure to TBDY 2018, fabricate it in the workshop from the cutting list and erect it on site with bolted connections."}},
    {"key": "engineering", "title": {"tr": "Mühendislik ve proje", "en": "Engineering and design"}, "lede": {"tr": "Yalnızca proje hizmeti de alabilirsiniz: statik hesap, uygulama çizimleri ve yapıyı inşa edilmeden önce görmenizi sağlayan 3B görseller.", "en": "Design-only is also available: structural analysis, shop drawings and 3D visuals that show the building before it is built."}},
    {"key": "construction", "title": {"tr": "İnşaat ve iç mekân", "en": "Construction and interiors"}, "lede": {"tr": "Çelik karkas tamamlandıktan sonra yapıyı başka bir firmaya devretmeniz gerekmez; kaba ve ince işleri de biz yürütüyoruz.", "en": "Once the steel frame is complete you do not need to hand the building to another contractor; we carry out the shell and fit-out works too."}}
  ],
  "why": {"title": {"tr": "Neden çelik yapı", "en": "Why steel"}, "lede": {"tr": "Çelik taşıyıcı sistemin betonarmeye göre öne çıkan yanları.", "en": "Where a steel frame outperforms reinforced concrete."}, "items": [
    {"title": {"tr": "Kısa şantiye süresi", "en": "Short site programme"}, "text": {"tr": "Elemanlar atölyede hazırlanır, sahada yalnızca montaj yapılır. Hava koşulları işi daha az etkiler.", "en": "Members are prepared in the workshop; only assembly happens on site. Weather affects the job far less."}},
    {"title": {"tr": "Hafif yapı", "en": "Light structure"}, "text": {"tr": "Daha düşük yapı ağırlığı, daha küçük deprem kuvveti ve daha hafif temel demektir.", "en": "Lower building weight means lower seismic forces and lighter foundations."}},
    {"title": {"tr": "Ölçüsünde imalat", "en": "Made to measure"}, "text": {"tr": "Her parça çizimdeki ölçüsüyle kesilir ve delinir; sahada kalıp ve kür beklenmez.", "en": "Every part is cut and drilled to the drawing; no formwork or curing on site."}},
    {"title": {"tr": "Değiştirilebilir", "en": "Adaptable"}, "text": {"tr": "Bulonlu birleşimler sayesinde yapı büyütülebilir, sökülüp taşınabilir, çelik geri dönüştürülebilir.", "en": "Bolted connections let the building be extended, dismantled and relocated; the steel is recyclable."}}
  ]},
  "steps": {"title": {"tr": "Bir iş nasıl ilerliyor", "en": "How a job proceeds"}, "items": [
    {"title": {"tr": "Keşif ve ölçüm", "en": "Survey and measurement"}, "text": {"tr": "Yerinde inceleme, zemin ve mevcut yapı değerlendirmesi.", "en": "Site inspection, soil and existing structure assessment."}},
    {"title": {"tr": "Statik ve mimari proje", "en": "Structural and architectural design"}, "text": {"tr": "TBDY 2018''e uygun çelik tasarım, 3B model ve metraj.", "en": "Steel design to TBDY 2018, 3D model and take-off."}},
    {"title": {"tr": "İmalat", "en": "Fabrication"}, "text": {"tr": "Kesim listesi, atölyede kaynak, delik ve yüzey koruma.", "en": "Cutting list, workshop welding, drilling and surface protection."}},
    {"title": {"tr": "Montaj ve teslim", "en": "Erection and hand-over"}, "text": {"tr": "Sahada bulonlu montaj, kontrol ve anahtar teslim.", "en": "Bolted site assembly, inspection and turnkey hand-over."}}
  ]},
  "tools": {"title": {"tr": "Fiyatı kendiniz görün", "en": "See the price yourself"}, "lede": {"tr": "Teklif istemeden önce yapınızın boyutlarını ve malzemesini deneyebilirsiniz.", "en": "Try your building''s dimensions and materials before asking for a quote."}, "items": [
    {"href": "/configurator", "title": {"tr": "Konfigüratör", "en": "Configurator"}, "text": {"tr": "Yapınızın ölçülerini girin, çelik miktarını ve yaklaşık maliyeti görün.", "en": "Enter your building''s dimensions and see the steel quantity and approximate cost."}, "cta": {"tr": "Konfigüratörü aç", "en": "Open the configurator"}},
    {"href": "/products", "title": {"tr": "Ürün kataloğu", "en": "Product catalogue"}, "text": {"tr": "Profil ve sac ölçüleri, ağırlık tabloları ve 3B görünüm.", "en": "Section and sheet sizes, weight tables and 3D views."}, "cta": {"tr": "Ürünlere git", "en": "Go to products"}},
    {"href": "/pricing", "title": {"tr": "Fiyat rehberi", "en": "Price guide"}, "text": {"tr": "Hizmet türüne göre güncel birim fiyat aralıkları.", "en": "Current unit price ranges by service type."}, "cta": {"tr": "Fiyatları incele", "en": "See prices"}}
  ]},
  "faq": {"title": {"tr": "Sık sorulanlar", "en": "Frequently asked"}, "items": [
    {"q": {"tr": "Sadece proje (statik hesap) hizmeti alabilir miyim?", "en": "Can I commission design (structural analysis) only?"}, "a": {"tr": "Evet. Statik proje, uygulama çizimleri ve 3B görselleri imalattan bağımsız olarak hazırlıyoruz. İmalatı başka bir firmaya yaptıracaksanız kesim listesi ve birleşim detaylarını da teslim ediyoruz.", "en": "Yes. We prepare the structural design, shop drawings and 3D visuals independently of fabrication. If another company will fabricate, we also hand over the cutting list and connection details."}},
    {"q": {"tr": "Hangi bölgelerde çalışıyorsunuz?", "en": "Which regions do you work in?"}, "a": {"tr": "Merkezimiz İstanbul''da. Proje hizmetini tüm Türkiye''ye veriyoruz; imalat ve montaj için bölgenizi yazın, ekip ve sevkiyat planını birlikte çıkaralım.", "en": "We are based in Istanbul. Design services cover all of Türkiye; for fabrication and erection tell us your region and we will plan the crew and shipping together."}},
    {"q": {"tr": "Kentsel dönüşümde çelik karkas ne kadar sürede biter?", "en": "How long does a steel frame take in urban renewal?"}, "a": {"tr": "Süre kat sayısına, parsel koşullarına ve ruhsat sürecine bağlıdır. Projenizi inceledikten sonra imalat ve montaj takvimini yazılı olarak veriyoruz.", "en": "It depends on the number of storeys, plot conditions and the permit process. After reviewing your project we give the fabrication and erection schedule in writing."}}
  ]},
  "cta": {"title": {"tr": "İşinizi\nkonuşalım", "en": "Let''s talk\nabout your job"}, "lede": {"tr": "Çizim, ölçü ya da sadece bir fikirle gelin; keşif ve ön fiyatı birlikte çıkaralım.", "en": "Come with a drawing, dimensions or just an idea; we will work out the survey and a preliminary price together."}}
}'::jsonb, true, 'Hizmetler sayfası metinleri (K-106): hero, gruplar, neden çelik, süreç, araçlar, SSS, CTA'),
('projects.page', '{
  "hero": {"title": {"tr": "Çelikte\nyaptığımız\nişler", "en": "Our work\nin steel"}, "lede": {"tr": "Kentsel dönüşümden endüstriyel tesislere, çatıdan iç mekâna; statik projeden imalat ve montaja kadar üstlendiğimiz işler. Her projede yapı tipi, çelik tonajı ve teslim süresini açıkça paylaşıyoruz.", "en": "From urban renewal to industrial facilities, from roofs to interiors; from structural design to fabrication and erection. For every project we openly share the building type, steel tonnage and delivery time."}},
  "stats": [],
  "steps": {"title": {"tr": "Bir proje nasıl ilerliyor", "en": "How a project proceeds"}, "items": [
    {"title": {"tr": "Keşif ve ölçüm", "en": "Survey and measurement"}, "text": {"tr": "Yerinde inceleme, zemin ve mevcut yapı değerlendirmesi.", "en": "Site inspection, soil and existing structure assessment."}},
    {"title": {"tr": "Statik ve mimari proje", "en": "Structural and architectural design"}, "text": {"tr": "TBDY 2018''e uygun çelik tasarım, 3B model ve metraj.", "en": "Steel design to TBDY 2018, 3D model and take-off."}},
    {"title": {"tr": "İmalat", "en": "Fabrication"}, "text": {"tr": "Kesim listesi, atölyede kaynak, delik ve yüzey koruma.", "en": "Cutting list, workshop welding, drilling and surface protection."}},
    {"title": {"tr": "Montaj ve teslim", "en": "Erection and hand-over"}, "text": {"tr": "Sahada bulonlu montaj, kontrol ve anahtar teslim.", "en": "Bolted site assembly, inspection and turnkey hand-over."}}
  ]},
  "empty": {"title": {"tr": "{category} projeleri yakında burada", "en": "{category} projects coming soon"}, "text": {"tr": "Bu alandaki işlerimizi fotoğraf ve teknik bilgileriyle ekliyoruz. Benzer bir projeniz varsa keşif ve ön fiyat için bize ulaşın.", "en": "We are adding our work in this area with photos and technical details. If you are planning a similar project, contact us for a survey and preliminary price."}},
  "cta": {"title": {"tr": "Sıradaki proje\nsizinki olsun", "en": "Let the next\nproject be yours"}, "lede": {"tr": "Çizim, ölçü ya da sadece bir fikirle gelin; keşif ve ön fiyatı birlikte çıkaralım.", "en": "Come with a drawing, dimensions or just an idea; we will work out the survey and a preliminary price together."}}
}'::jsonb, true, 'Projeler sayfası metinleri (K-106): hero, sayaçlar, süreç, boş durum, CTA')
on conflict (key) do update set value = excluded.value, is_public = true, description = excluded.description;
