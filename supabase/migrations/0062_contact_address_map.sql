-- 0062 · İletişim adresi + harita (K-112). Adres ürün sahibinden (2026-10-13). Harita bağlantısı Google Maps arama adresidir
-- (koordinat UYDURULMADI: sorgu adresin kendisi). contact.map_embed_url: panelden yapıştırılan gömme adresi (isteğe bağlı);
-- boşsa gömme adresi adresten türetilir. Yalnız boş değerler doldurulur; panelde girilmiş değer ezilmez.
update public.site_settings
   set value = '{"tr": "Mihrabat Sokak, Bahçeşehir 2. Kısım, No: 4/266, Başakşehir / İstanbul", "en": "Mihrabat Sokak, Bahçeşehir 2. Kısım, No: 4/266, Başakşehir / Istanbul, Türkiye"}'::jsonb
 where key = 'contact.address' and (value = '{}'::jsonb or value = 'null'::jsonb or value = '""'::jsonb);

update public.site_settings
   set value = to_jsonb('https://www.google.com/maps/search/?api=1&query=Mihrabat%20Sokak%20Bah%C3%A7e%C5%9Fehir%202.%20K%C4%B1s%C4%B1m%20No%3A4%2F266%20Ba%C5%9Fak%C5%9Fehir%20%C4%B0stanbul'::text)
 where key = 'contact.map_url' and (value = '""'::jsonb or value = 'null'::jsonb);

insert into public.site_settings (key, value, is_public, description) values
  ('contact.map_embed_url', '""'::jsonb, true, 'İletişim sayfası harita gömme adresi (Google Haritalar › Paylaş › Harita yerleştir; boşsa adresten türetilir) — K-112')
on conflict (key) do nothing;
