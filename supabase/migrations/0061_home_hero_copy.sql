-- 0061 · Ana sayfa hero metni (K-111): hero_media başlık/giriş/düğme yeni ana sayfa metniyle güncellenir (referans:
-- clk-grup-yeni-anasayfa.html). Başlıkta satır sonu = yeni satır. home.page'deki hero.title/lede ikilemesi kaldırılır
-- (tek kaynak hero_media; panel /admin/pages/home › Hero). Yalnız aktif kayıt; panelde değiştirildiyse dokunulmaz.
update public.hero_media set
  headline = '{"tr": "İnşaatın da,\nmalzemesinin de\ntek adresi.", "en": "One address\nfor the build\nand the materials."}'::jsonb,
  subheadline = '{"tr": "Kutu profilden alçıpana, yalıtımdan inşaat demirine sahada bizzat kullandığımız malzemeleri satıyoruz. Çelik yapının statik projesini çiziyor, imalatını ve montajını da yapıyoruz. İster anahtar teslim çalışalım, ister sadece malzeme alın.", "en": "From box sections to drywall and from insulation to rebar, we sell the materials we use on site ourselves. We design the steel structure, fabricate it and erect it. Work with us turnkey, or just buy the materials."}'::jsonb,
  cta_label = '{"tr": "Teklif al", "en": "Get a quote"}'::jsonb,
  cta_path = '/get-quote'
where is_active = true and headline->>'tr' = 'Kentsel dönüşümde çelik konstrüksiyon hızı';

update public.site_settings set value = (value #- '{hero,title}') #- '{hero,lede}' where key = 'home.page';
