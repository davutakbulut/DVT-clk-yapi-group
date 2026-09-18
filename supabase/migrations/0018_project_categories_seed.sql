-- 0018 · Proje kategorileri (Faz 8). Sınıflandırma referans verisidir (K-55: iddia değil, taksonomi); projeler BOŞ başlar.
-- Yalnız tablo boşsa yazar; panelden düzenleme ezilmez.
insert into public.project_categories (slug, name, description, sort_order)
select * from (values
  ('{"tr": "kentsel-donusum", "en": "urban-renewal"}'::jsonb, '{"tr": "Kentsel Dönüşüm", "en": "Urban Renewal"}'::jsonb, '{"tr": "Riskli yapı yerine çelik karkasla yeniden yapım.", "en": "Steel-frame rebuilds replacing risky buildings."}'::jsonb, 1),
  ('{"tr": "endustriyel", "en": "industrial"}'::jsonb, '{"tr": "Endüstriyel", "en": "Industrial"}'::jsonb, '{"tr": "Fabrika, depo ve lojistik yapıları.", "en": "Factories, warehouses and logistics buildings."}'::jsonb, 2),
  ('{"tr": "ticari", "en": "commercial"}'::jsonb, '{"tr": "Ticari", "en": "Commercial"}'::jsonb, '{"tr": "Ofis, mağaza ve karma kullanımlı yapılar.", "en": "Offices, retail and mixed-use buildings."}'::jsonb, 3),
  ('{"tr": "cati-ve-cephe", "en": "roof-and-facade"}'::jsonb, '{"tr": "Çatı ve Cephe", "en": "Roof and Facade"}'::jsonb, '{"tr": "Kat ilavesi, teras kapatma, cephe taşıyıcıları.", "en": "Storey additions, terrace roofs, facade supports."}'::jsonb, 4)
) as v(slug, name, description, sort_order)
where not exists (select 1 from public.project_categories);
