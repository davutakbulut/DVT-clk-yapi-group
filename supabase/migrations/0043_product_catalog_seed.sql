-- 0043 · Ürün kataloğu (ürün sahibinin 2026-09-18 talimatı): firmanın KENDİ iş fotoğraflarındaki dört ürün hattı
-- (assets/ klasörleri: KUTU PROFİL · KUTU PROFİL ALÇIPAN · HAFİF ÇELİK · KÖRKASA) — uydurma ürün gamı DEĞİL.
-- · Açıklamalar sistemi ve tipik uygulamayı anlatır; karşılaştırma tabloları niteliksel. Fiyat, stok miktarı, kapasite, referans YOK.
-- · Ölçü tabloları: TS EN 10219 kutu profillerin standart birim ağırlıkları (kesit alanı × 7,85; köşe yarıçapı düzeltmeli).
-- · Görseller media_library'de varsa bağlanır (PGlite testinde yok → NULL/atlanır). EN: K-73 (talimatla onay, meta'da işaretli).
-- Yeniden çalıştırılabilir: kategori ve ürün slug'ı varsa atlanır.

insert into public.product_categories (slug, name, description)
select jsonb_build_object('tr','kutu-profil-sistemleri','en','box-section-systems'), jsonb_build_object('tr', $t$Kutu Profil Sistemleri$t$, 'en', $t$Box-Section Systems$t$), jsonb_build_object('tr', $t$Kutu profilden kurulan karkas, bölme ve kaplama altı taşıyıcı sistemler.$t$, 'en', $t$Frames, partitions and cladding sub-structures built from steel hollow sections.$t$)
where not exists (select 1 from public.product_categories where slug->>'tr' = 'kutu-profil-sistemleri');

insert into public.product_categories (slug, name, description)
select jsonb_build_object('tr','hafif-celik','en','light-gauge-steel'), jsonb_build_object('tr', $t$Hafif Çelik$t$, 'en', $t$Light Gauge Steel$t$), jsonb_build_object('tr', $t$Galvanizli ince cidarlı profillerle kurulan yapı sistemleri.$t$, 'en', $t$Building systems made from galvanised thin-walled sections.$t$)
where not exists (select 1 from public.product_categories where slug->>'tr' = 'hafif-celik');

insert into public.product_categories (slug, name, description)
select jsonb_build_object('tr','kasa-ve-dograma-alti','en','sub-frames'), jsonb_build_object('tr', $t$Kasa ve Doğrama Altı$t$, 'en', $t$Sub-Frames$t$), jsonb_build_object('tr', $t$Kapı, pencere ve cephe doğramaları için çelik alt kasalar.$t$, 'en', $t$Steel sub-frames for doors, windows and facade joinery.$t$)
where not exists (select 1 from public.product_categories where slug->>'tr' = 'kasa-ve-dograma-alti');

-- ── Kutu Profil Karkas Sistemi
with ins as (
  insert into public.products (slug, name, short_description, description, usage_areas, category_id, cover_image_id, is_featured, status, published_locales, published_at, translation_meta, seo_description)
  select jsonb_build_object('tr','kutu-profil-karkas','en','box-section-steel-framing'), jsonb_build_object('tr', $t$Kutu Profil Karkas Sistemi$t$, 'en', $t$Box-Section Steel Framing$t$), jsonb_build_object('tr', $t$Mağaza cephesi, bölme duvar, kolon giydirme ve ıslak hacim taşıyıcıları için antipas astarlı kutu profil karkas.$t$, 'en', $t$Primer-coated hollow-section framing for shopfronts, partitions, column casings and wet-area carriers.$t$), jsonb_build_object('tr', $t$Kutu profil karkas; alışveriş merkezi, ofis ve ticari iç mekânlarda kaplamanın, camın ya da alçı levhanın arkasında duran **taşıyıcı iskelettir**. Kare ve dikdörtgen kesitli çelik profiller sahada ölçüye göre kesilir, kaynakla ya da bulonla birleştirilir ve döşeme ile tavana ankrajlanır.

## Nerede tercih edilir

Galvaniz alçıpan profilinin yetmediği yerlerde kullanılır: yüksek mağaza cepheleri, ağır kaplama (taş, kompozit, ahşap panel) taşıyan duvarlar, geniş kapı ve vitrin açıklıkları, asma klozet ve lavabo gibi **yük taşıyan ıslak hacim modülleri**, kolon ve kiriş giydirmeleri, dairesel ışıklık ve tavan boşluğu çerçeveleri.

## Nasıl kurulur

1. Mimari projeye göre aks ve açıklıklar sahada işaretlenir.
2. Döşeme ve tavan kayıtları dübel ya da kimyasal ankrajla sabitlenir.
3. Dikmeler şakülünde yerleştirilir; kayıtlar kaplama modülüne göre (çoğunlukla 40–60 cm) atılır.
4. Kapı, vitrin ve tesisat geçişleri için takviye çerçeveleri eklenir.
5. Kaynak bölgeleri temizlenir ve antipas astarla rötuşlanır.

## Hangi karkas nerede: karşılaştırma

| | Kutu profil karkas | Galvaniz alçıpan profili (DU/DC) | Hafif çelik (LGS) |
|---|---|---|---|
| Kesit | Kapalı kutu, 2–3 mm et | Açık C/U, ince sac | Açık C/U, galvaniz |
| Taşıdığı yük | Ağır kaplama, cam, ekipman | Alçı levha ve hafif kaplama | Yapının kendisi (duvar, döşeme, çatı) |
| Yükseklik ve açıklık | Yüksek duvar, geniş açıklık | Kat yüksekliği | Yapı ölçeği |
| Birleşim | Kaynak / bulon | Vida, perçin | Vida, bulon |
| Yüzey koruması | Antipas astar + boya | Galvaniz | Galvaniz |
| Tipik yer | Mağaza cephesi, ıslak hacim, giydirme | Ofis ve konut bölme duvarı | Villa, ek yapı, çatı katı |

## Malzeme

Profiller TS EN 10219'a uygun soğuk şekillendirilmiş yapısal kutu profillerdir. Kesit ve et kalınlığı; duvar yüksekliğine, taşınacak kaplamaya ve açıklığa göre belirlenir. Aşağıdaki ölçü tablosu yaygın kullanılan kesitleri ve standart birim ağırlıklarını gösterir.

*Kesit seçimi projeye özeldir; yüksek ya da ağır yük taşıyan duvarlarda mühendislik hesabı gerekir.*$t$, 'en', $t$Box-section framing is the **load-carrying skeleton** that sits behind cladding, glazing or plasterboard in shopping centres, offices and commercial interiors. Square and rectangular steel hollow sections are cut to size on site, welded or bolted together and anchored to the slab and soffit.

## Where it is used

It is chosen where galvanised drywall studs are not enough: tall shopfronts, walls carrying heavy cladding (stone, composite, timber panels), wide door and display openings, **load-bearing wet-area modules** for wall-hung WCs and basins, column and beam casings, and frames around circular rooflights and ceiling voids.

## How it is built

1. Grid lines and openings are set out on site from the architectural drawings.
2. Floor and head tracks are fixed with mechanical or chemical anchors.
3. Posts are plumbed in; rails follow the cladding module (usually 40–60 cm).
4. Stiffening frames are added around doors, displays and service penetrations.
5. Weld areas are cleaned and touched up with anti-corrosion primer.

## Which frame where: comparison

| | Box-section frame | Galvanised drywall stud (CW/UW) | Light gauge steel (LGS) |
|---|---|---|---|
| Section | Closed box, 2–3 mm wall | Open C/U, thin sheet | Open C/U, galvanised |
| Load carried | Heavy cladding, glass, equipment | Plasterboard and light finishes | The building itself (walls, floors, roof) |
| Height and span | Tall walls, wide openings | Storey height | Building scale |
| Connection | Weld / bolt | Screw, rivet | Screw, bolt |
| Surface protection | Primer + paint | Galvanising | Galvanising |
| Typical place | Shopfront, wet area, casing | Office and residential partitions | Villas, extensions, roof storeys |

## Material

Sections are cold-formed structural hollow sections to EN 10219. Size and wall thickness depend on wall height, the cladding to be carried and the opening width. The size table below lists commonly used sections with their standard unit weights.

*Section selection is project-specific; tall or heavily loaded walls require an engineering check.*$t$), jsonb_build_object('tr', $t$- Mağaza ve AVM cephe karkasları
- Ağır kaplama taşıyan bölme duvarlar
- Asma klozet, lavabo ve rezervuar taşıyıcı modülleri
- Kolon, kiriş ve şaft giydirmeleri
- Geniş kapı, vitrin ve geçiş çerçeveleri
- Dairesel ışıklık ve tavan boşluğu çerçeveleri$t$, 'en', $t$- Shopfront and mall facade frames
- Partitions carrying heavy cladding
- Carrier modules for wall-hung WCs, basins and cisterns
- Column, beam and shaft casings
- Frames for wide doors, displays and passages
- Frames for circular rooflights and ceiling voids$t$),
         (select id from public.product_categories where slug->>'tr' = 'kutu-profil-sistemleri'), (select id from public.media_library where id = 'f3e1a32a-8ca7-51fd-81fd-731225e0207e'),
         true, 'published', array['tr','en'], now(), '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, jsonb_build_object('tr', $t$Mağaza cephesi, bölme duvar, kolon giydirme ve ıslak hacim taşıyıcıları için antipas astarlı kutu profil karkas.$t$, 'en', $t$Primer-coated hollow-section framing for shopfronts, partitions, column casings and wet-area carriers.$t$)
  where not exists (select 1 from public.products where slug->>'tr' = 'kutu-profil-karkas')
  returning id
)
, s as (
  insert into public.product_specs (product_id, group_name, name, value, unit, sort_order)
  select ins.id, v.g, v.n, v.val, v.u, v.o from ins, (values
    (jsonb_build_object('tr', $t$Malzeme$t$, 'en', $t$Material$t$), jsonb_build_object('tr', $t$Profil standardı$t$, 'en', $t$Section standard$t$), jsonb_build_object('tr', $t$TS EN 10219$t$, 'en', $t$EN 10219$t$), null, 1),
    (jsonb_build_object('tr', $t$Malzeme$t$, 'en', $t$Material$t$), jsonb_build_object('tr', $t$Yaygın çelik kalitesi$t$, 'en', $t$Common steel grade$t$), jsonb_build_object('tr', $t$S235JRH$t$, 'en', $t$S235JRH$t$), null, 2),
    (jsonb_build_object('tr', $t$Malzeme$t$, 'en', $t$Material$t$), jsonb_build_object('tr', $t$Et kalınlığı$t$, 'en', $t$Wall thickness$t$), jsonb_build_object('tr', $t$2 – 3$t$, 'en', $t$2 – 3$t$), 'mm', 3),
    (jsonb_build_object('tr', $t$Uygulama$t$, 'en', $t$Installation$t$), jsonb_build_object('tr', $t$Birleşim$t$, 'en', $t$Connection$t$), jsonb_build_object('tr', $t$Kaynak veya bulon$t$, 'en', $t$Welded or bolted$t$), null, 4),
    (jsonb_build_object('tr', $t$Uygulama$t$, 'en', $t$Installation$t$), jsonb_build_object('tr', $t$Ankraj$t$, 'en', $t$Anchoring$t$), jsonb_build_object('tr', $t$Mekanik dübel veya kimyasal ankraj$t$, 'en', $t$Mechanical or chemical anchors$t$), null, 5),
    (jsonb_build_object('tr', $t$Uygulama$t$, 'en', $t$Installation$t$), jsonb_build_object('tr', $t$Yüzey koruması$t$, 'en', $t$Surface protection$t$), jsonb_build_object('tr', $t$Antipas astar; kaynak sonrası rötuş$t$, 'en', $t$Anti-corrosion primer; touch-up after welding$t$), null, 6)
  ) as v(g, n, val, u, o)
  returning 1
), va as (
  insert into public.product_variants (product_id, size_label, width_mm, height_mm, thickness_mm, kg_per_m, stock_code, sort_order)
  select ins.id, v.l, v.w, v.h, v.t, v.kg, v.sc, v.o from ins, (values
    ('30×30×2', 30::numeric, 30::numeric, 2::numeric, 1.68::numeric, 'KP-30X30X2', 1),
    ('40×20×2', 40::numeric, 20::numeric, 2::numeric, 1.68::numeric, 'KP-40X20X2', 2),
    ('40×40×2', 40::numeric, 40::numeric, 2::numeric, 2.31::numeric, 'KP-40X40X2', 3),
    ('50×50×2', 50::numeric, 50::numeric, 2::numeric, 2.93::numeric, 'KP-50X50X2', 4),
    ('60×40×2', 60::numeric, 40::numeric, 2::numeric, 2.93::numeric, 'KP-60X40X2', 5),
    ('60×60×2', 60::numeric, 60::numeric, 2::numeric, 3.56::numeric, 'KP-60X60X2', 6),
    ('80×40×2', 80::numeric, 40::numeric, 2::numeric, 3.56::numeric, 'KP-80X40X2', 7),
    ('50×50×3', 50::numeric, 50::numeric, 3::numeric, 4.25::numeric, 'KP-50X50X3', 8),
    ('60×60×3', 60::numeric, 60::numeric, 3::numeric, 5.19::numeric, 'KP-60X60X3', 9),
    ('100×50×3', 100::numeric, 50::numeric, 3::numeric, 6.6::numeric, 'KP-100X50X3', 10),
    ('80×80×3', 80::numeric, 80::numeric, 3::numeric, 7.07::numeric, 'KP-80X80X3', 11),
    ('100×100×3', 100::numeric, 100::numeric, 3::numeric, 8.96::numeric, 'KP-100X100X3', 12)
  ) as v(l, w, h, t, kg, sc, o)
  returning 1
), im as (
  insert into public.product_images (product_id, media_id, alt, sort_order)
  select ins.id, v.m, jsonb_build_object('tr', $t$Kutu profil karkas uygulaması$t$, 'en', $t$Box-section framing on site$t$), v.o from ins, (values
    ('5437902f-ca3f-55cc-859c-d6366fea285c'::uuid, 1),
    ('6218cd7f-ec5e-586e-8132-80ab3c83d5c9'::uuid, 2),
    ('ea25fd70-7950-5b96-863a-67ed019ee04f'::uuid, 3),
    ('3019aee3-74c5-5dce-886d-1434264f32b0'::uuid, 4),
    ('41b93450-657e-55b3-8f78-b10e2ba4bb04'::uuid, 5),
    ('fe6af8d1-0959-577e-8ad5-94722fcbdfa7'::uuid, 6),
    ('e734d66b-f1e6-5c8e-84e6-222aaee544a6'::uuid, 7)
  ) as v(m, o)
  where exists (select 1 from public.media_library ml where ml.id = v.m)
  returning 1
)
select count(*) from ins;

-- ── Alçıpan Bölme Duvar ve Asma Tavan Karkası
with ins as (
  insert into public.products (slug, name, short_description, description, usage_areas, category_id, cover_image_id, is_featured, status, published_locales, published_at, translation_meta, seo_description)
  select jsonb_build_object('tr','alcipan-bolme-duvar-ve-asma-tavan','en','drywall-partitions-and-suspended-ceilings'), jsonb_build_object('tr', $t$Alçıpan Bölme Duvar ve Asma Tavan Karkası$t$, 'en', $t$Drywall Partition and Suspended Ceiling Framing$t$), jsonb_build_object('tr', $t$Galvaniz DU/DC profilli bölme duvar, giydirme ve asma tavan karkası; gerektiğinde kutu profille takviye.$t$, 'en', $t$Galvanised stud-and-track framing for partitions, linings and suspended ceilings, stiffened with box sections where needed.$t$), jsonb_build_object('tr', $t$Alçı levha (alçıpan) sistemleri, galvanizli ince sac profillerden kurulan bir karkasa levhaların vidalanmasıyla oluşur. Ofis ve konutta bölme duvar, mevcut duvarın önüne giydirme, kolon kaplaması ve asma tavan aynı mantıkla kurulur.

## Sistem bileşenleri

- **DU (U) profili:** döşeme ve tavanda kılavuz ray
- **DC (C) profili:** dikme; levha ek yerlerine göre aralıklandırılır (yaygın olarak 40 ya da 60 cm)
- **Alçı levha:** tek ya da çift kat; ıslak hacimde suya dayanıklı, yangın gereken yerde yangına dayanıklı tip
- **Dolgu:** ses ve ısı için mineral yün
- **Takviye:** kapı kasası, ağır dolap, asma ekipman ve yüksek duvarlarda kutu profil

## Duvar kalınlığı seçimi

| Profil genişliği | Tek kat levhayla yaklaşık duvar kalınlığı | Tipik kullanım |
|---|---:|---|
| 50 mm | 75 mm | Konut ve ofis içi hafif bölme |
| 75 mm | 100 mm | Genel amaçlı bölme, tesisat geçişi |
| 100 mm | 125 mm | Yüksek duvar, ses yalıtımı beklenen bölme |

Duvar kalınlığı; iki yüzde 12,5 mm tek kat levha varsayımıyla verilmiştir. Çift kat levhada her yüz için 12,5 mm eklenir.

## Ne zaman kutu profille takviye edilir

Standart profil; kat yüksekliğindeki hafif bölmeler için tasarlanmıştır. Duvar yüksekliği arttığında, duvara ağır kaplama ya da ekipman asılacağında ve geniş kapı boşluklarında karkas [kutu profille](/tr/urunler/kutu-profil-karkas) güçlendirilir.

*Yangın ve ses performansı, levha tipi ile kat sayısına göre sistem üreticisinin test raporlarından seçilir.*$t$, 'en', $t$Plasterboard systems are formed by screwing boards to a frame of galvanised thin-gauge steel profiles. Partitions in offices and homes, linings in front of existing walls, column casings and suspended ceilings are all built the same way.

## System components

- **Track (U):** guide rail at floor and soffit
- **Stud (C):** upright, spaced to suit board joints (commonly 40 or 60 cm)
- **Plasterboard:** single or double layer; moisture-resistant in wet areas, fire-rated where required
- **Infill:** mineral wool for sound and thermal performance
- **Stiffening:** box sections at door frames, heavy cabinets, wall-hung equipment and tall walls

## Choosing the wall thickness

| Stud width | Approx. wall thickness with single-layer board | Typical use |
|---|---:|---|
| 50 mm | 75 mm | Light partitions in homes and offices |
| 75 mm | 100 mm | General-purpose partitions, service runs |
| 100 mm | 125 mm | Tall walls, partitions needing sound insulation |

Wall thickness assumes one 12.5 mm board on each face. Add 12.5 mm per face for a second layer.

## When box sections are added

Standard studs are designed for light, storey-height partitions. As wall height grows, where heavy cladding or equipment will hang from the wall, and at wide door openings, the frame is stiffened with [box sections](/en/products/box-section-steel-framing).

*Fire and acoustic performance are selected from the system manufacturer's test reports according to board type and number of layers.*$t$), jsonb_build_object('tr', $t$- Ofis ve konut bölme duvarları
- Mevcut duvar önü giydirme ve tesisat duvarı
- Kolon ve kiriş kaplaması
- Düz ve kademeli asma tavan
- Islak hacim duvarları (suya dayanıklı levhayla)$t$, 'en', $t$- Office and residential partitions
- Linings and service walls in front of existing walls
- Column and beam casings
- Flat and stepped suspended ceilings
- Wet-area walls (with moisture-resistant board)$t$),
         (select id from public.product_categories where slug->>'tr' = 'kutu-profil-sistemleri'), (select id from public.media_library where id = '5ca4f00b-9bd2-5fa3-8c38-30d6ffae1cf4'),
         false, 'published', array['tr','en'], now(), '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, jsonb_build_object('tr', $t$Galvaniz DU/DC profilli bölme duvar, giydirme ve asma tavan karkası; gerektiğinde kutu profille takviye.$t$, 'en', $t$Galvanised stud-and-track framing for partitions, linings and suspended ceilings, stiffened with box sections where needed.$t$)
  where not exists (select 1 from public.products where slug->>'tr' = 'alcipan-bolme-duvar-ve-asma-tavan')
  returning id
)
, s as (
  insert into public.product_specs (product_id, group_name, name, value, unit, sort_order)
  select ins.id, v.g, v.n, v.val, v.u, v.o from ins, (values
    (jsonb_build_object('tr', $t$Malzeme$t$, 'en', $t$Material$t$), jsonb_build_object('tr', $t$Profil standardı$t$, 'en', $t$Profile standard$t$), jsonb_build_object('tr', $t$TS EN 14195$t$, 'en', $t$EN 14195$t$), null, 1),
    (jsonb_build_object('tr', $t$Malzeme$t$, 'en', $t$Material$t$), jsonb_build_object('tr', $t$Levha standardı$t$, 'en', $t$Board standard$t$), jsonb_build_object('tr', $t$TS EN 520$t$, 'en', $t$EN 520$t$), null, 2),
    (jsonb_build_object('tr', $t$Malzeme$t$, 'en', $t$Material$t$), jsonb_build_object('tr', $t$Profil kaplaması$t$, 'en', $t$Profile coating$t$), jsonb_build_object('tr', $t$Galvaniz$t$, 'en', $t$Galvanised$t$), null, 3),
    (jsonb_build_object('tr', $t$Uygulama$t$, 'en', $t$Installation$t$), jsonb_build_object('tr', $t$Dikme aralığı$t$, 'en', $t$Stud spacing$t$), jsonb_build_object('tr', $t$40 – 60$t$, 'en', $t$40 – 60$t$), 'cm', 4),
    (jsonb_build_object('tr', $t$Uygulama$t$, 'en', $t$Installation$t$), jsonb_build_object('tr', $t$Levha kalınlığı$t$, 'en', $t$Board thickness$t$), jsonb_build_object('tr', $t$12,5$t$, 'en', $t$12.5$t$), 'mm', 5)
  ) as v(g, n, val, u, o)
  returning 1
), va as (
  insert into public.product_variants (product_id, size_label, width_mm, height_mm, thickness_mm, kg_per_m, stock_code, sort_order)
  select ins.id, v.l, v.w, v.h, v.t, v.kg, v.sc, v.o from ins, (values
    ('DU/DC 50', 50::numeric, null::numeric, null::numeric, null::numeric, null, 1),
    ('DU/DC 75', 75::numeric, null::numeric, null::numeric, null::numeric, null, 2),
    ('DU/DC 100', 100::numeric, null::numeric, null::numeric, null::numeric, null, 3)
  ) as v(l, w, h, t, kg, sc, o)
  returning 1
), im as (
  insert into public.product_images (product_id, media_id, alt, sort_order)
  select ins.id, v.m, jsonb_build_object('tr', $t$Alçıpan bölme duvar karkası$t$, 'en', $t$Drywall partition framing$t$), v.o from ins, (values
    ('60c600f4-5722-5064-8c56-edc7740995e4'::uuid, 1),
    ('3254561b-047f-5c81-818c-ca34fee1a6bd'::uuid, 2),
    ('c15dad5f-48a7-5103-8b92-4ec1f68b9e4a'::uuid, 3),
    ('2af178dc-e448-5d92-87bf-897a3acc1a57'::uuid, 4)
  ) as v(m, o)
  where exists (select 1 from public.media_library ml where ml.id = v.m)
  returning 1
)
select count(*) from ins;

-- ── Hafif Çelik Yapı Sistemi
with ins as (
  insert into public.products (slug, name, short_description, description, usage_areas, category_id, cover_image_id, is_featured, status, published_locales, published_at, translation_meta, seo_description)
  select jsonb_build_object('tr','hafif-celik-yapi-sistemi','en','light-gauge-steel-building-system'), jsonb_build_object('tr', $t$Hafif Çelik Yapı Sistemi$t$, 'en', $t$Light Gauge Steel Building System$t$), jsonb_build_object('tr', $t$Galvanizli ince cidarlı profillerle kurulan duvar, döşeme ve çatı panelleri: villa, ek yapı ve çatı katı için.$t$, 'en', $t$Wall, floor and roof panels from galvanised thin-walled sections for villas, extensions and roof storeys.$t$), jsonb_build_object('tr', $t$Hafif çelik yapı, galvanizli sacdan soğuk şekillendirilmiş C ve U profillerin **duvar, döşeme ve çatı panelleri** hâlinde birleştirilmesiyle kurulur. Paneller vida ve bulonla birleşir; sahada kaynak yapılmaz. Taşıyıcı, sık aralıklı dikmelerden oluşan duvarların kendisidir.

## Nasıl ilerler

1. Mimari projeye göre statik hesap ve panel çizimleri hazırlanır.
2. Betonarme temel ya da radye dökülür; ankraj yerleri bırakılır.
3. Profiller ölçüsünde kesilip panel hâline getirilir.
4. Duvar panelleri dikilir, döşeme ve çatı makasları yerleştirilir.
5. Dış yüze OSB ya da çimento esaslı levha, yalıtım ve cephe kaplaması; iç yüze alçı levha uygulanır.

## Betonarme ile karşılaştırma

| | Hafif çelik | Betonarme |
|---|---|---|
| Yapım biçimi | Kuru montaj, panel | Kalıp, döküm, kür |
| Yapı ağırlığı | Düşük | Yüksek |
| Temel | Daha hafif yük; radye ya da sürekli temel | Yapı yüküne göre |
| Hava koşulu | Montaj büyük ölçüde hava koşulundan bağımsız | Döküm ve kür hava koşuluna duyarlı |
| Kat sayısı | Az katlı yapılar | Çok katlı yapılar dahil |
| Tadilat ve ek | Panel eklemek görece kolay | Taşıyıcıya müdahale zor |

## Malzeme ve tasarım

Profiller yaygın olarak TS EN 10346'ya uygun, yüksek akma dayanımlı galvanizli sacdan üretilir. Tasarım; soğuk şekillendirilmiş çelik elemanlara ilişkin kurallara (TS EN 1993-1-3) ve deprem yönetmeliğine göre yetkili mühendis tarafından yapılır.

## Bilinmesi gerekenler

- Isı ve ses konforu karkastan değil, **duvar katmanlarından** gelir; yalıtım detayı baştan çözülmelidir.
- Yangın dayanımı, iç yüzdeki levha tipi ve kat sayısıyla sağlanır.
- Yapı ruhsata tabidir; hafif olması izin sürecini değiştirmez.$t$, 'en', $t$A light gauge steel building is assembled from C and U sections cold-formed from galvanised sheet, joined into **wall, floor and roof panels**. Panels are connected with screws and bolts; there is no site welding. The load-bearing system is the walls themselves, made of closely spaced studs.

## How it proceeds

1. Structural calculations and panel drawings are prepared from the architectural design.
2. A concrete strip or raft foundation is cast, with anchor positions left in place.
3. Sections are cut to length and assembled into panels.
4. Wall panels are erected; floor joists and roof trusses follow.
5. OSB or cement board, insulation and cladding go on the outside; plasterboard on the inside.

## Compared with reinforced concrete

| | Light gauge steel | Reinforced concrete |
|---|---|---|
| Construction | Dry assembly, panels | Formwork, pour, curing |
| Building weight | Low | High |
| Foundation | Lighter loads; raft or strip footing | According to building load |
| Weather | Assembly largely weather-independent | Pouring and curing are weather-sensitive |
| Storeys | Low-rise buildings | Including multi-storey |
| Alterations | Adding panels is relatively easy | Hard to intervene in the structure |

## Material and design

Sections are commonly produced from high-yield galvanised sheet to EN 10346. Design is carried out by a licensed engineer to the rules for cold-formed steel members (EN 1993-1-3) and the seismic code.

## Good to know

- Thermal and acoustic comfort come from the **wall build-up**, not the frame; insulation details must be resolved early.
- Fire resistance is provided by the type and number of board layers on the inside face.
- The building requires a permit; being lightweight does not change the approval process.$t$), jsonb_build_object('tr', $t$- Tek ve iki katlı konut, villa
- Mevcut yapıya çatı katı ve ek bina
- Şantiye, ofis ve sosyal tesis yapıları
- Hafif çatı ve ara kat döşemeleri$t$, 'en', $t$- One- and two-storey houses and villas
- Roof storeys and extensions to existing buildings
- Site, office and amenity buildings
- Lightweight roofs and mezzanine floors$t$),
         (select id from public.product_categories where slug->>'tr' = 'hafif-celik'), (select id from public.media_library where id = '0dbd1614-e98c-59e8-83ad-cc053ac01966'),
         false, 'published', array['tr','en'], now(), '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, jsonb_build_object('tr', $t$Galvanizli ince cidarlı profillerle kurulan duvar, döşeme ve çatı panelleri: villa, ek yapı ve çatı katı için.$t$, 'en', $t$Wall, floor and roof panels from galvanised thin-walled sections for villas, extensions and roof storeys.$t$)
  where not exists (select 1 from public.products where slug->>'tr' = 'hafif-celik-yapi-sistemi')
  returning id
)
, s as (
  insert into public.product_specs (product_id, group_name, name, value, unit, sort_order)
  select ins.id, v.g, v.n, v.val, v.u, v.o from ins, (values
    (jsonb_build_object('tr', $t$Malzeme$t$, 'en', $t$Material$t$), jsonb_build_object('tr', $t$Sac standardı$t$, 'en', $t$Sheet standard$t$), jsonb_build_object('tr', $t$TS EN 10346$t$, 'en', $t$EN 10346$t$), null, 1),
    (jsonb_build_object('tr', $t$Malzeme$t$, 'en', $t$Material$t$), jsonb_build_object('tr', $t$Yaygın kalite ve kaplama$t$, 'en', $t$Common grade and coating$t$), jsonb_build_object('tr', $t$S350GD + Z275$t$, 'en', $t$S350GD + Z275$t$), null, 2),
    (jsonb_build_object('tr', $t$Tasarım$t$, 'en', $t$Design$t$), jsonb_build_object('tr', $t$Tasarım esası$t$, 'en', $t$Design basis$t$), jsonb_build_object('tr', $t$TS EN 1993-1-3$t$, 'en', $t$EN 1993-1-3$t$), null, 3),
    (jsonb_build_object('tr', $t$Uygulama$t$, 'en', $t$Installation$t$), jsonb_build_object('tr', $t$Birleşim$t$, 'en', $t$Connection$t$), jsonb_build_object('tr', $t$Vida ve bulon (sahada kaynak yok)$t$, 'en', $t$Screws and bolts (no site welding)$t$), null, 4)
  ) as v(g, n, val, u, o)
  returning 1
), im as (
  insert into public.product_images (product_id, media_id, alt, sort_order)
  select ins.id, v.m, jsonb_build_object('tr', $t$Hafif çelik yapı iskeleti$t$, 'en', $t$Light gauge steel building frame$t$), v.o from ins, (values
    ('28f46ce6-1f5f-5ebf-8c26-e36d20fe4b6a'::uuid, 1),
    ('6e228b62-9611-506b-8fd3-716f90d76c9a'::uuid, 2)
  ) as v(m, o)
  where exists (select 1 from public.media_library ml where ml.id = v.m)
  returning 1
)
select count(*) from ins;

-- ── Çelik Körkasa
with ins as (
  insert into public.products (slug, name, short_description, description, usage_areas, category_id, cover_image_id, is_featured, status, published_locales, published_at, translation_meta, seo_description)
  select jsonb_build_object('tr','celik-korkasa','en','steel-sub-frame'), jsonb_build_object('tr', $t$Çelik Körkasa$t$, 'en', $t$Steel Sub-Frame$t$), jsonb_build_object('tr', $t$Kapı, pencere ve cephe doğraması takılmadan önce boşluğu ölçüsünde ve şakülünde sabitleyen çelik alt kasa.$t$, 'en', $t$A steel sub-frame that fixes the opening true and to size before doors, windows or facade joinery are installed.$t$), jsonb_build_object('tr', $t$Körkasa, doğramanın takılacağı duvar boşluğuna **kaba inşaat aşamasında** yerleştirilen çelik alt kasadır. Sıva, şap ve kaplama körkasaya göre bitirilir; asıl kapı ya da pencere en sonda, temiz ve ölçüsü belli bir boşluğa monte edilir.

## Ne işe yarar

- Boşluğu **net ölçüde** ve şakülünde sabitler; her katta aynı doğrama ölçüsü kullanılabilir.
- Doğramanın sıva ve şap işlerinden zarar görmesini önler.
- Ağır kapı, yangın kapısı ve geniş sürme sistemlerde yükü duvara dağıtır.
- Isı yalıtımlı cephelerde doğramanın yalıtım hizasına alınmasını sağlar.

## Körkasalı ve körkasasız montaj

| | Körkasalı | Doğrudan duvara |
|---|---|---|
| Doğrama ölçüsü | Standartlaştırılabilir | Her boşluk ayrı ölçülür |
| Doğramanın takılma zamanı | İnce işler bittikten sonra | Kaba işler sürerken |
| Şakül ve gönye | Kasa ile garanti altında | Duvarın düzgünlüğüne bağlı |
| Değişim | Doğrama sökülür, kasa kalır | Sıva ve kaplama zarar görür |

## Uygulama

Kasa, kutu profilden boşluk ölçüsüne göre kaynaklı çerçeve olarak hazırlanır; duvara lama ya da dübelle sabitlenir, köşegenleri kontrol edilir. Antipas astarlı ya da galvanizli üretilir. Aşağıdaki tablo yaygın kullanılan kesitleri gösterir; ağır kapılarda kesit büyütülür.$t$, 'en', $t$A sub-frame is a steel frame set into the wall opening **during the structural stage**, before the joinery arrives. Plaster, screed and finishes are completed against the sub-frame; the actual door or window is fitted last, into a clean opening of known size.

## What it does

- Fixes the opening to a **net size** and plumb, so the same joinery size can be used on every floor.
- Protects joinery from plastering and screeding work.
- Spreads the load of heavy doors, fire doors and wide sliding systems into the wall.
- Lets joinery be positioned in the insulation plane on insulated facades.

## With and without a sub-frame

| | With sub-frame | Fixed directly to the wall |
|---|---|---|
| Joinery size | Can be standardised | Every opening measured separately |
| When joinery is fitted | After finishes are complete | While rough work continues |
| Plumb and square | Guaranteed by the frame | Depends on the wall |
| Replacement | Joinery removed, frame stays | Plaster and finishes are damaged |

## Installation

The frame is prepared from box sections as a welded frame to the opening size, fixed to the wall with straps or anchors, and its diagonals are checked. It is supplied primer-coated or galvanised. The table below lists commonly used sections; heavier doors take larger sections.$t$), jsonb_build_object('tr', $t$- Pencere ve balkon kapısı boşlukları
- İç kapılar, yangın kapıları
- Sürme ve katlanır cam sistemleri
- Mağaza vitrin ve giriş doğramaları$t$, 'en', $t$- Window and balcony door openings
- Internal doors and fire doors
- Sliding and folding glazed systems
- Shop display and entrance joinery$t$),
         (select id from public.product_categories where slug->>'tr' = 'kasa-ve-dograma-alti'), (select id from public.media_library where id = '7bb093a9-f47b-5626-8380-f88eb3fb6d7f'),
         false, 'published', array['tr','en'], now(), '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, jsonb_build_object('tr', $t$Kapı, pencere ve cephe doğraması takılmadan önce boşluğu ölçüsünde ve şakülünde sabitleyen çelik alt kasa.$t$, 'en', $t$A steel sub-frame that fixes the opening true and to size before doors, windows or facade joinery are installed.$t$)
  where not exists (select 1 from public.products where slug->>'tr' = 'celik-korkasa')
  returning id
)
, s as (
  insert into public.product_specs (product_id, group_name, name, value, unit, sort_order)
  select ins.id, v.g, v.n, v.val, v.u, v.o from ins, (values
    (jsonb_build_object('tr', $t$Malzeme$t$, 'en', $t$Material$t$), jsonb_build_object('tr', $t$Profil standardı$t$, 'en', $t$Section standard$t$), jsonb_build_object('tr', $t$TS EN 10219$t$, 'en', $t$EN 10219$t$), null, 1),
    (jsonb_build_object('tr', $t$Malzeme$t$, 'en', $t$Material$t$), jsonb_build_object('tr', $t$Yüzey$t$, 'en', $t$Finish$t$), jsonb_build_object('tr', $t$Antipas astarlı veya galvanizli$t$, 'en', $t$Primer-coated or galvanised$t$), null, 2),
    (jsonb_build_object('tr', $t$Uygulama$t$, 'en', $t$Installation$t$), jsonb_build_object('tr', $t$Sabitleme$t$, 'en', $t$Fixing$t$), jsonb_build_object('tr', $t$Lama veya dübel$t$, 'en', $t$Straps or anchors$t$), null, 3)
  ) as v(g, n, val, u, o)
  returning 1
), va as (
  insert into public.product_variants (product_id, size_label, width_mm, height_mm, thickness_mm, kg_per_m, stock_code, sort_order)
  select ins.id, v.l, v.w, v.h, v.t, v.kg, v.sc, v.o from ins, (values
    ('30×30×2', 30::numeric, 30::numeric, 2::numeric, 1.68::numeric, 'KK-30X30X2', 1),
    ('40×20×2', 40::numeric, 20::numeric, 2::numeric, 1.68::numeric, 'KK-40X20X2', 2),
    ('40×40×2', 40::numeric, 40::numeric, 2::numeric, 2.31::numeric, 'KK-40X40X2', 3),
    ('50×30×2', 50::numeric, 30::numeric, 2::numeric, 2.31::numeric, 'KK-50X30X2', 4)
  ) as v(l, w, h, t, kg, sc, o)
  returning 1
)
select count(*) from ins;
