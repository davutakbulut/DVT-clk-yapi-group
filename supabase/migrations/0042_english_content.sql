-- 0042 · İngilizce içerik (ürün sahibinin 2026-09-18 talimatıyla): var olan EN taslakları (hizmetler, çözüm, hakkımızda) yayına alınır;
-- SSS ve blog yazılarının İngilizcesi eklenip yayınlanır; site varsayılan meta açıklaması iki dilde yazılır.
-- K-08: EN yayını insan onayı ister → onay ürün sahibinin açık talimatıdır; translation_meta bunu `approved_via` ile kaydeder
-- (reviewed_by boş: panelde bir dil uzmanı gözden geçirince dolar). YASAL sayfalar ve mail şablonları KAPSAM DIŞI (K-08 listesi).
-- Yeniden çalıştırılabilir: yalnız EN'i yayında olmayan kayıtlara dokunur.

update public.services set translation_meta = coalesce(translation_meta, '{}'::jsonb) || '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, published_locales = array['tr','en']
 where status = 'published' and not ('en' = any(published_locales)) and nullif(title->>'en', '') is not null and slug->>'en' is not null;
update public.solutions set translation_meta = coalesce(translation_meta, '{}'::jsonb) || '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, published_locales = array['tr','en']
 where status = 'published' and not ('en' = any(published_locales)) and nullif(title->>'en', '') is not null and slug->>'en' is not null;
update public.about_content set translation_meta = coalesce(translation_meta, '{}'::jsonb) || '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, published_locales = array['tr','en']
 where status = 'published' and not ('en' = any(published_locales)) and nullif(title->>'en', '') is not null;

-- ── SSS
update public.faqs set question = question || jsonb_build_object('en', $en$What is a steel-framed building?$en$), answer = answer || jsonb_build_object('en', $en$A building whose load-bearing system — columns, beams, trusses and connections — is made of structural steel sections. Members are cut, drilled and welded in the workshop, then assembled on site with bolted or welded connections. Floors, facade and roof sit on this frame.$en$), translation_meta = coalesce(translation_meta, '{}'::jsonb) || '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, published_locales = array['tr','en']
 where question->>'tr' = $en$Çelik konstrüksiyon yapı nedir?$en$ and not ('en' = any(published_locales));
update public.faqs set question = question || jsonb_build_object('en', $en$When is steel a better choice than reinforced concrete?$en$), answer = answer || jsonb_build_object('en', $en$Steel stands out when site time must be short, when wide spans are needed (warehouses, factories, halls), when weak ground calls for a lighter structure, and when future dismantling or extension is expected. It is not the right choice for every project; the decision weighs ground data, architecture, intended use and budget together.$en$), translation_meta = coalesce(translation_meta, '{}'::jsonb) || '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, published_locales = array['tr','en']
 where question->>'tr' = $en$Çelik yapı hangi durumlarda betonarmeye göre avantajlıdır?$en$ and not ('en' = any(published_locales));
update public.faqs set question = question || jsonb_build_object('en', $en$How do steel structures behave in an earthquake?$en$), answer = answer || jsonb_build_object('en', $en$Steel is a ductile material: it dissipates energy by deforming before it fails. Because the building is lighter, the seismic load acting on it is lower too. This behaviour does not come by itself — the structure must be designed to the Turkish Building Earthquake Code (TBDY 2018) and the Turkish steel design regulation, connections must be detailed correctly, and fabrication and erection must be inspected.$en$), translation_meta = coalesce(translation_meta, '{}'::jsonb) || '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, published_locales = array['tr','en']
 where question->>'tr' = $en$Çelik yapılar depremde nasıl davranır?$en$ and not ('en' = any(published_locales));
update public.faqs set question = question || jsonb_build_object('en', $en$Is steel fire resistant?$en$), answer = answer || jsonb_build_object('en', $en$Steel does not burn, but it loses strength at high temperature. Load-bearing members are therefore protected for the period required by the building's occupancy class, using intumescent paint, gypsum or cement-based boards, or sprayed coatings. The required fire-resistance period is set by the Turkish Regulation on Fire Protection of Buildings.$en$), translation_meta = coalesce(translation_meta, '{}'::jsonb) || '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, published_locales = array['tr','en']
 where question->>'tr' = $en$Çelik yangına dayanıklı mıdır?$en$ and not ('en' = any(published_locales));
update public.faqs set question = question || jsonb_build_object('en', $en$Does steel rust? How is it protected against corrosion?$en$), answer = answer || jsonb_build_object('en', $en$Unprotected steel rusts when exposed to moisture. Protection is chosen for the environment the structure will stand in: surface preparation (blasting), a primer and top-coat paint system, hot-dip galvanising, or both combined. A dry indoor space does not need the same protection as a coastal or chemical environment.$en$), translation_meta = coalesce(translation_meta, '{}'::jsonb) || '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, published_locales = array['tr','en']
 where question->>'tr' = $en$Çelik paslanmaz mı? Korozyona karşı ne yapılır?$en$ and not ('en' = any(published_locales));
update public.faqs set question = question || jsonb_build_object('en', $en$How does the process work?$en$), answer = answer || jsonb_build_object('en', $en$First we collect your requirements and site information, with a site visit if needed. A preliminary design and quotation follow. After agreement, the structural design and shop drawings are prepared and the necessary approvals obtained. Members are fabricated in the workshop, surface protection is applied, and they are shipped to site and erected. Concrete works such as foundations can run in parallel with workshop fabrication.$en$), translation_meta = coalesce(translation_meta, '{}'::jsonb) || '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, published_locales = array['tr','en']
 where question->>'tr' = $en$Süreç nasıl işler?$en$ and not ('en' = any(published_locales));
update public.faqs set question = question || jsonb_build_object('en', $en$What information do you need for a quotation?$en$), answer = answer || jsonb_build_object('en', $en$The location of the building, its intended use, approximate dimensions (width, length, height), an architectural design or sketch if available, a ground investigation report, special needs such as cranes or mezzanines, and your target schedule. You can fill in the quote form even if some of this is not ready yet; we will clarify the rest together.$en$), translation_meta = coalesce(translation_meta, '{}'::jsonb) || '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, published_locales = array['tr','en']
 where question->>'tr' = $en$Teklif için hangi bilgilere ihtiyacınız var?$en$ and not ('en' = any(published_locales));
update public.faqs set question = question || jsonb_build_object('en', $en$Are the take-off and price in the configurator final?$en$), answer = answer || jsonb_build_object('en', $en$No. The configurator builds a typical structural system from the dimensions you enter and calculates approximate member lengths and areas. It is a preliminary estimate and does not replace structural design or a formal quotation. The final take-off and price are set in a written quotation after a site survey and engineering design.$en$), translation_meta = coalesce(translation_meta, '{}'::jsonb) || '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, published_locales = array['tr','en']
 where question->>'tr' = $en$Konfigüratördeki metraj ve fiyat kesin midir?$en$ and not ('en' = any(published_locales));
update public.faqs set question = question || jsonb_build_object('en', $en$Can a steel frame be used in urban renewal?$en$), answer = answer || jsonb_build_object('en', $en$Yes. On plots where a risky-building decision has been issued under Law No. 6306, the new building can have a steel load-bearing system. The permit process is the same as for other buildings; the structural design is prepared by a licensed civil engineer and approved by the relevant authority. On narrow plots and streets, dry assembly helps shorten site time and reduce the impact on neighbours.$en$), translation_meta = coalesce(translation_meta, '{}'::jsonb) || '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, published_locales = array['tr','en']
 where question->>'tr' = $en$Kentsel dönüşümde çelik karkas kullanılabilir mi?$en$ and not ('en' = any(published_locales));
update public.faqs set question = question || jsonb_build_object('en', $en$Can my existing concrete building be strengthened with steel?$en$), answer = answer || jsonb_build_object('en', $en$The answer is specific to the building. The existing structural system is examined first and a performance analysis is carried out. If suitable, methods such as steel bracing, steel jacketing, additional frames or floor strengthening can be used. For some buildings rebuilding is the better option; the decision rests on the engineering report.$en$), translation_meta = coalesce(translation_meta, '{}'::jsonb) || '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, published_locales = array['tr','en']
 where question->>'tr' = $en$Mevcut betonarme binam çelikle güçlendirilebilir mi?$en$ and not ('en' = any(published_locales));
update public.faqs set question = question || jsonb_build_object('en', $en$Does a steel building need a permit?$en$), answer = answer || jsonb_build_object('en', $en$Yes. Steel-framed buildings also fall under Zoning Law No. 3194: a building permit, approved designs and building inspection are required. Exceptions for temporary or small structures vary by municipality; check with the authority before you start.$en$), translation_meta = coalesce(translation_meta, '{}'::jsonb) || '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, published_locales = array['tr','en']
 where question->>'tr' = $en$Çelik yapı için ruhsat gerekir mi?$en$ and not ('en' = any(published_locales));

-- ── Blog
update public.blog_posts set slug = slug || jsonb_build_object('en', 'what-is-a-steel-framed-building'), title = title || jsonb_build_object('en', $en$What is a steel-framed building? The main members of the load-bearing system$en$), excerpt = excerpt || jsonb_build_object('en', $en$Columns, rafters, purlins, bracing: which members make up the frame of a steel building, and what does each of them do?$en$), body = body || jsonb_build_object('en', $en$A steel-framed building is one whose load-carrying frame is built from structural steel sections. The regular frames you see when you walk into an industrial building are that frame. This article explains, in plain language, the members that make it up and what each one does.

## The main frame: column and rafter

**Columns** carry vertical loads down to the foundation. Wide-flange H sections (HEA, HEB) are common because they resist bending well in both directions.

The **rafter** or roof beam spans between two columns and carries the roof load to them. For medium spans, solid-web I sections (IPE) are enough. As the span grows a solid-web beam becomes heavy; at that point a **truss** made of individual bars does the same job with less material.

The frame formed by column and rafter repeats at regular intervals along the length of the building. That interval is the **bay spacing**.

## Secondary members: purlins and girts

Roof cladding does not sit directly on the rafters. **Purlins** run along the building on top of the rafters, and the cladding is fixed to them. On the walls, **girts** do the same job. These members are usually cold-formed or hot-rolled U / C / Z sections.

## Stability: bracing

Frames are strong in their own plane, but a system is needed to tie them together along the length of the building. **Roof and wall bracing** carries horizontal loads such as wind and earthquake down to the foundation and keeps the structure stable during erection. Tubes, angles or rods can be used as bracing.

## Connections

Members are joined with **bolted** or **welded** connections. Common practice is to weld in the workshop under controlled conditions and to bolt on site. At the column foot, a **base plate** and **anchor bolts** transfer the load to the concrete foundation.

The safety of a steel structure often depends more on correct connection detailing than on section size.

## Cladding

Roof and facade cladding goes over the frame: trapezoidal sheet, sandwich panels or other systems depending on the project. Cladding is not load-bearing, but it determines the thermal, water and fire performance of the building.

## Summary

- Columns and rafters form the main frame
- Purlins and girts carry the cladding
- Bracing provides stability against horizontal loads
- Connections are the most critical points of the system

*This article is for general information. The load-bearing system of every building is determined by the calculations of a licensed engineer.*$en$), seo_description = seo_description || jsonb_build_object('en', $en$Columns, rafters, purlins, bracing: which members make up the frame of a steel building, and what does each of them do?$en$), reading_minutes = reading_minutes || jsonb_build_object('en', (reading_minutes->>'tr')::int), translation_meta = coalesce(translation_meta, '{}'::jsonb) || '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, published_locales = array['tr','en']
 where slug->>'tr' = 'celik-konstruksiyon-yapi-nedir' and not ('en' = any(published_locales));
update public.blog_posts set slug = slug || jsonb_build_object('en', 'steel-frame-in-urban-renewal-process'), title = title || jsonb_build_object('en', $en$Steel frames in urban renewal: how does the process work on a narrow plot?$en$), excerpt = excerpt || jsonb_build_object('en', $en$From the risky-building decision to erection: the steps of rebuilding with a steel load-bearing system on a narrow plot, and what to watch for.$en$), body = body || jsonb_build_object('en', $en$The question building owners ask most often in urban renewal is "how long will it take?". Most of the time goes to administrative steps, the rest to the construction site. The choice of structural system affects the second part. This article walks through rebuilding with a steel frame on a narrow plot, step by step.

## 1. Risky-building assessment and decision

The process starts with a **risky-building assessment** by a licensed body under Law No. 6306. Once the report is approved, the building is registered as risky in the land registry. Agreement between owners, demolition and evacuation proceed at this stage. These steps are independent of the structural system.

## 2. Ground investigation and architectural design

A ground investigation is commissioned and the architectural design prepared for the new building. If a steel frame is being considered, it matters to know this at the architectural stage: when column grids, storey heights and the floor system are laid out for steel, the result is more efficient in both material and time.

## 3. Structural design and permit

The structural design is prepared by a licensed civil engineer to the Turkish Building Earthquake Code and the steel design regulation. The permit process is the same as for other buildings; a steel load-bearing system needs no separate approval.

## 4. Workshop fabrication alongside the foundations

This is steel's biggest contribution to the site. Once the design is approved, members go into **workshop** fabrication. In the same days, excavation and the concrete foundation proceed on site. The two jobs do not wait for each other.

## 5. Delivery and erection

On a narrow street, logistics is the hardest part. Member lengths and weights are planned at the fabrication stage around the vehicles that can enter the street and the crane that can be set up. Erection is dry: no formwork, no concrete pour, no waiting for curing. This shortens the period of disturbance to neighbouring buildings and the street.

## 6. Floors, facade and finishes

After the frame is complete, floors (usually concrete on trapezoidal decking), facade and services begin. These stages run on timescales similar to a concrete building.

## Points to watch

- **Fire protection** must be budgeted from the start; in residential buildings, load-bearing steel is protected to resist fire for a defined period.
- **Sound and vibration** comfort is achieved through the choice of floor system.
- **Neighbouring buildings** in terraced layouts must be protected during excavation; this is an engineering matter independent of the structural system.

## Is steel the right choice on every plot?

No. For small, simple buildings reinforced concrete may be more economical. Steel stands out where time is critical, the plot is narrow, the ground is weak or spans are wide. The right decision comes from comparing the two systems on the same project.

*This article is for general information; consult the relevant specialists for legal and technical decisions.*$en$), seo_description = seo_description || jsonb_build_object('en', $en$From the risky-building decision to erection: the steps of rebuilding with a steel load-bearing system on a narrow plot, and what to watch for.$en$), reading_minutes = reading_minutes || jsonb_build_object('en', (reading_minutes->>'tr')::int), translation_meta = coalesce(translation_meta, '{}'::jsonb) || '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, published_locales = array['tr','en']
 where slug->>'tr' = 'kentsel-donusumde-celik-karkas-sureci' and not ('en' = any(published_locales));
update public.blog_posts set slug = slug || jsonb_build_object('en', 'key-regulations-for-steel-structure-design'), title = title || jsonb_build_object('en', $en$Key regulations for steel structure design in Turkey: TBDY 2018, the steel design regulation and EN 1090$en$), excerpt = excerpt || jsonb_build_object('en', $en$Which regulations and standards govern the design, material and fabrication of a steel structure in Turkey? A short road map.$en$), body = body || jsonb_build_object('en', $en$The abbreviations in a steel quotation or technical specification can be confusing. This article summarises the core regulations that directly concern steel load-bearing systems in Turkey, and what each of them covers.

## Turkish Building Earthquake Code (TBDY 2018)

In force since 1 January 2019, the code sets the design rules for all buildings under seismic action. For steel structures it defines the structural system types (moment-resisting frames, concentrically and eccentrically braced frames), ductility levels and special requirements for connections. The seismic hazard is taken from the Turkish Earthquake Hazard Map for the coordinates of the building.

## Regulation on Design, Calculation and Construction Principles of Steel Structures

It governs how steel members and connections are sized: tension, compression, bending, shear, combined actions, bolted and welded connections, composite members. It offers the designer two methods: load and resistance factor design (LRFD) and allowable strength design (ASD). It is used together with TBDY.

## Load standards

The loads acting on the structure come from separate standards: TS 498 for dead and live loads, TS EN 1991-1-3 for snow and TS EN 1991-1-4 for wind. For light steel roofs, snow and wind are often the governing loads.

## Material: TS EN 10025

It defines the grades of structural steel. In the names S235, S275 and S355, the number is the yield strength of the steel (N/mm²). The grade to be used is stated in the structural design; material is received with a mill certificate (usually a 3.1 document to EN 10204).

## Fabrication: TS EN 1090

It governs the fabrication and conformity assessment of structural steel components.

- **EN 1090-1:** conformity assessment required for structural components to carry the CE mark
- **EN 1090-2:** technical rules for the fabrication and erection of steel structures; **execution classes** (EXC1–EXC4) set the level of fabrication and inspection

In welded fabrication, welder and procedure qualification (e.g. EN ISO 9606, EN ISO 15614) and quality requirements (EN ISO 3834) are part of this framework.

## Fire

Fire-resistance periods for load-bearing members are set by the Regulation on Fire Protection of Buildings, depending on the occupancy class and height of the building.

## What is it good for in practice?

When assessing a quotation or contract, you can ask:

- Which regulations was the structural design prepared to?
- What is the steel grade, and will a material certificate be supplied?
- Which execution class will fabrication follow, and how will weld inspections be documented?
- Is fire protection included in the quotation?

*This article is for general information and summarises the regulations as of its publication date. Refer to the Official Gazette and TSE publications for current texts; design decisions belong to the licensed engineer.*$en$), seo_description = seo_description || jsonb_build_object('en', $en$Which regulations and standards govern the design, material and fabrication of a steel structure in Turkey? A short road map.$en$), reading_minutes = reading_minutes || jsonb_build_object('en', (reading_minutes->>'tr')::int), translation_meta = coalesce(translation_meta, '{}'::jsonb) || '{"en": {"machine": true, "reviewed": true, "reviewed_by": null, "approved_via": "urun-sahibi-talimati-2026-09-18"}}'::jsonb, published_locales = array['tr','en']
 where slug->>'tr' = 'celik-yapi-tasariminda-temel-mevzuat' and not ('en' = any(published_locales));

-- ── Varsayılan meta açıklama (boştu → Lighthouse "meta description yok"). Tanımlayıcı; iddia/rakam yok.
update public.site_settings set value = '{"tr": "CLK Yapı Group: kentsel dönüşüm, endüstriyel tesis ve depo, çatı-cephe sistemleri ve yapı güçlendirme için çelik konstrüksiyon tasarımı, imalatı ve montajı.", "en": "CLK Yapı Group: design, fabrication and erection of steel structures for urban renewal, industrial facilities and warehouses, roof and facade systems, and structural strengthening."}'::jsonb
 where key = 'seo.default_description' and coalesce(value->>'tr', '') = '';
