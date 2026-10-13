-- 0063 · Harita sorgusu düzeltmesi (K-112). 0062'deki kapı numaralı tam adres Google'da yanlış bölgeye (Ispartakule) düşüyordu;
-- "sokak + mahalle + posta kodu" sorgusu Google'ın kendi "Mihrabat Sk." etiketine iğne koyuyor (tarayıcıda doğrulandı, 2026-10-13;
-- sokak OpenStreetMap'te de Bahçeşehir 2. Kısım Mahallesi, 34488). İğne SOKAK düzeyindedir (bina numarası değil); kesin iğne için
-- panelden Google "Harita yerleştir" adresi yapıştırılır. Yalnız 0062'nin yazdığı / boş değerler değişir.
update public.site_settings
   set value = to_jsonb('https://www.google.com/maps?q=Mihrabat%20Sokak%2C%20Bah%C3%A7e%C5%9Fehir%202.%20K%C4%B1s%C4%B1m%20Mahallesi%2C%2034488%20Ba%C5%9Fak%C5%9Fehir%2F%C4%B0stanbul&z=17&output=embed'::text)
 where key = 'contact.map_embed_url' and (value = '""'::jsonb or value = 'null'::jsonb);

update public.site_settings
   set value = to_jsonb('https://www.google.com/maps/search/?api=1&query=Mihrabat%20Sokak%2C%20Bah%C3%A7e%C5%9Fehir%202.%20K%C4%B1s%C4%B1m%20Mahallesi%2C%2034488%20Ba%C5%9Fak%C5%9Fehir%2F%C4%B0stanbul'::text)
 where key = 'contact.map_url'
   and value = to_jsonb('https://www.google.com/maps/search/?api=1&query=Mihrabat%20Sokak%20Bah%C3%A7e%C5%9Fehir%202.%20K%C4%B1s%C4%B1m%20No%3A4%2F266%20Ba%C5%9Fak%C5%9Fehir%20%C4%B0stanbul'::text);
