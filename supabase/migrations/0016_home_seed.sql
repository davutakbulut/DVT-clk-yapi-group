-- 0016 · Ana sayfa başlangıç içeriği (Faz 6). Yalnız BOŞSA yazar: panelden yapılmış düzenlemeyi ezmez.
-- Uydurma veri YASAĞI: sayısal iddia, müşteri sayısı, sertifika yok; metin çelik konstrüksiyonun genel mühendislik
-- nitelikleridir (prototipteki brief). EN makine taslağıdır → reviewed=false → 'en' yayına GİREMEZ (K-08).
-- Video/poster panelden medya kütüphanesinden seçilir (ffmpeg yok, K-49 kapsam dışı).

insert into public.hero_media (label, headline, subheadline, cta_label, cta_path, is_active)
select
  'main',
  '{"tr": "Kentsel dönüşümde çelik konstrüksiyon hızı", "en": "Steel construction speed for urban renewal"}',
  '{"tr": "Betonarmeye göre çok daha kısa sürede tamamlanan, daha hafif ve depreme karşı daha öngörülebilir kaba yapı çözümü. Fabrikada üretilir, sahada günler içinde monte edilir.", "en": "A lighter, faster and seismically more predictable structural frame: fabricated in the workshop, assembled on site in days rather than weeks."}',
  '{"tr": "Teklif alın", "en": "Get a quote"}',
  '/get-quote',
  true
where not exists (select 1 from public.hero_media);

update public.about_content set
  eyebrow = '{"tr": "Hakkımızda", "en": "About us"}',
  title = '{"tr": "Çelik konstrüksiyonda hız, hafiflik ve güven", "en": "Speed, lightness and reliability in steel construction"}',
  body = '{"tr": "CLK Yapı Group, İstanbul''un kentsel dönüşüm parsellerine özel çelik konstrüksiyon kaba yapı çözümleri üretir. Proje onaylandığı anda taşıyıcı sistem atölyede imalata girer; sahada aynı anda hafriyat ve temel işleri yürür. Temel tamamlandığında önceden üretilmiş karkasın montajına doğrudan başlanır — ıslak imalatın priz ve kür bekleme süreleri ortadan kalkar.\n\nÇelik taşıyıcı sistem eşdeğer betonarme yapıya göre belirgin biçimde hafiftir. Deprem sırasında yapıya etkiyen yatay kuvvet kütleyle orantılı olduğundan hafif yapı daha düşük deprem kuvvetine maruz kalır; temel ve taşıyıcı sistem üzerindeki yük azalır. Tasarımlar TBDY 2018 ve Çelik Yapılar Yönetmeliği''ne uygun olarak hazırlanır.\n\n- Dar parsellerde kısa ve az zahmetli şantiye süresi\n- Fabrika toleransında, milimetrik hassasiyette imalat\n- İleride kat ve bölme düzenlemesine açık, geri dönüştürülebilir taşıyıcı sistem", "en": "CLK Yapı Group builds steel structural frames for urban-renewal plots in Istanbul. As soon as a project is approved, the load-bearing system goes into workshop fabrication while excavation and foundations proceed on site. Once the foundation is complete, the prefabricated frame is assembled directly — no curing time for wet construction.\n\nA steel frame is markedly lighter than an equivalent reinforced-concrete structure. Because seismic force scales with mass, a lighter building is subject to lower lateral loads, easing demands on both foundation and frame. Designs comply with the Turkish Building Earthquake Code (TBDY 2018) and the Steel Structures Regulation.\n\n- Short, low-disruption site periods on narrow plots\n- Workshop fabrication to millimetre tolerances\n- A recyclable frame that stays adaptable to future floor and partition changes"}',
  status = 'published',
  published_locales = '{tr}',
  published_at = coalesce(published_at, now()),
  translation_meta = '{"en": {"machine": true, "reviewed": false}}'
where key = 'main' and coalesce(title->>'tr', '') = '';
