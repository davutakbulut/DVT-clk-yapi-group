-- 0058 · Toplu e-posta hazır şablonları (K-109)
-- Kampanya taslağında seçilip önizlenen, metni değiştirilip gönderilen hazır içerikler. Panelden eklenir/düzenlenir (sıfır statik veri).
-- Köşeli parantezli alanlar ([tarih], [ürün adı]) gönderenin dolduracağı yerlerdir: şablonlar fiyat, tarih, proje gibi UYDURMA bilgi taşımaz (K-55);
-- doldurulmamış alan kalan kampanya panelde başlatılamaz.

create table public.mail_campaign_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 120),
  category    text not null check (category in ('announcement','product','pricing','followup','event','greeting','relationship','operations')),
  description text not null default '' check (char_length(description) <= 300),      -- hangi durumda kullanılır
  subject     jsonb not null default '{}' check (jsonb_typeof(subject) = 'object'),
  preheader   jsonb not null default '{}' check (jsonb_typeof(preheader) = 'object'),
  body        jsonb not null default '{}' check (jsonb_typeof(body) = 'object'),
  cta_label   jsonb not null default '{}' check (jsonb_typeof(cta_label) = 'object'),
  cta_url     jsonb not null default '{}' check (jsonb_typeof(cta_url) = 'object'),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint mail_campaign_templates_sizes check (pg_column_size(body) <= 65536 and pg_column_size(subject) <= 2048 and pg_column_size(preheader) <= 2048 and pg_column_size(cta_label) <= 1024 and pg_column_size(cta_url) <= 2048),
  constraint mail_campaign_templates_subject_tr check (nullif(btrim(subject->>'tr'), '') is not null),
  constraint mail_campaign_templates_cta_https check (coalesce(cta_url->>'tr', '') ~ '^(https://[^\s]+)?$' and coalesce(cta_url->>'en', '') ~ '^(https://[^\s]+)?$')
);
create index mail_campaign_templates_order_idx on public.mail_campaign_templates (category, sort_order);
call app_private.track_updated_at('public.mail_campaign_templates');
call app_private.secure('public.mail_campaign_templates');
call app_private.allow_staff_read('public.mail_campaign_templates', 'super_admin', 'admin');
call app_private.allow_staff_write('public.mail_campaign_templates', 'super_admin', 'admin');
call app_private.audited('public.mail_campaign_templates');

-- Başlangıç şablonları (yalnız tablo boşken). Otomatik çeviri yok: EN metinler elle yazılmış karşılıklardır; panelden düzenlenir.
insert into public.mail_campaign_templates (name, category, description, subject, preheader, body, cta_label, cta_url, sort_order)
select v.name, v.category, v.description, v.subject, v.preheader, v.body, v.cta_label, v.cta_url, v.sort_order from (values
('Genel duyuru', 'announcement', 'Hazır kalıba uymayan her türlü duyuru için boş başlangıç.',
 jsonb_build_object('tr', $t$[Duyuru başlığı]$t$, 'en', $t$[Announcement title]$t$),
 jsonb_build_object('tr', '', 'en', ''),
 jsonb_build_object('tr', $t$Sayın {{full_name}},

[Duyurunuzu buraya yazın.]

Saygılarımızla,
CLK Yapı Group$t$, 'en', $t$Dear {{full_name}},

[Write your announcement here.]

Kind regards,
CLK Yapı Group$t$),
 jsonb_build_object('tr', '', 'en', ''), jsonb_build_object('tr', '', 'en', ''), 10),

('Tamamlanan proje duyurusu', 'announcement', 'Teslim ettiğiniz bir projeyi müşterilerinize ve talep sahiplerine duyurun.',
 jsonb_build_object('tr', $t$Yeni tamamlanan projemiz: [proje adı]$t$, 'en', $t$Our newly completed project: [project name]$t$),
 jsonb_build_object('tr', $t$Kapsam ve öne çıkanlar$t$, 'en', $t$Scope and highlights$t$),
 jsonb_build_object('tr', $t$## [proje adı]

Sayın {{full_name}},

[yer] bölgesindeki [yapı türü] projemizi tamamladık. [Projenin kapsamını bir iki cümleyle yazın.]

- [Öne çıkan özellik 1]
- [Öne çıkan özellik 2]

Benzer bir yapı planlıyorsanız ölçülerinizi iletmeniz yeterli; size özel teklif hazırlayalım.

Saygılarımızla,
CLK Yapı Group$t$, 'en', $t$## [project name]

Dear {{full_name}},

We have completed our [building type] project in [location]. [Describe the scope of the project in a sentence or two.]

- [Highlight 1]
- [Highlight 2]

If you are planning a similar building, send us your dimensions and we will prepare a quotation for you.

Kind regards,
CLK Yapı Group$t$),
 jsonb_build_object('tr', 'Projeleri gör', 'en', 'See our projects'), jsonb_build_object('tr', 'https://clkyapigroup.com/tr/projeler', 'en', 'https://clkyapigroup.com/en/projects'), 20),

('Konfigüratör tanıtımı', 'announcement', 'Sitedeki konfigüratörleri tanıtıp alıcıyı kendi yapısını hesaplamaya davet edin.',
 jsonb_build_object('tr', $t$Çelik yapınızın metrajını kendiniz hesaplayın$t$, 'en', $t$Work out the take-off for your steel building yourself$t$),
 jsonb_build_object('tr', $t$Ölçüleri girin, eleman listesini anında görün$t$, 'en', $t$Enter the dimensions, see the element list instantly$t$),
 jsonb_build_object('tr', $t$Sayın {{full_name}},

Web sitemizdeki konfigüratörle yapınızın ölçülerini girip eleman listesini ve toplam çelik ağırlığını anında görebilirsiniz. Sonucu kaydedebilir, paylaşabilir ya da doğrudan teklif isteyebilirsiniz.

- Hol, çok katlı yapı, çatı ve cephe kaplama, ara kat, çit ve bölme duvar için ayrı konfigüratörler
- 3B model ve eleman listesi
- Teklif sepetine tek tıkla aktarım

Saygılarımızla,
CLK Yapı Group$t$, 'en', $t$Dear {{full_name}},

With the configurator on our website you can enter your building's dimensions and instantly see the element list and the total steel weight. You can save the result, share it or request a quotation directly.

- Separate configurators for halls, multi-storey buildings, roof and facade cladding, mezzanines, fences and partition walls
- 3D model and element list
- One click to the quote basket

Kind regards,
CLK Yapı Group$t$),
 jsonb_build_object('tr', 'Konfigüratörü aç', 'en', 'Open the configurator'), jsonb_build_object('tr', 'https://clkyapigroup.com/tr/konfigurator', 'en', 'https://clkyapigroup.com/en/configurator'), 30),

('Yeni ürün ya da stok duyurusu', 'product', 'Kataloğa eklenen ya da yeniden stoğa giren bir ürünü duyurun.',
 jsonb_build_object('tr', $t$Yeni ürünümüz: [ürün adı]$t$, 'en', $t$New product: [product name]$t$),
 jsonb_build_object('tr', $t$Teknik özellikler ve teslim bilgisi$t$, 'en', $t$Specifications and delivery information$t$),
 jsonb_build_object('tr', $t$## [ürün adı] artık stoklarımızda

Sayın {{full_name}},

[ürün adı] ürün gamımıza eklendi. [Ürünün kullanım alanını ve öne çıkan özelliğini bir iki cümleyle yazın.]

- [Özellik 1]
- [Özellik 2]
- [Teslim süresi ya da stok bilgisi]

Teknik ayrıntılar ve teklif için ürün sayfasını inceleyebilir ya da bu e-postayı yanıtlayabilirsiniz.

Saygılarımızla,
CLK Yapı Group$t$, 'en', $t$## [product name] is now in stock

Dear {{full_name}},

[product name] has been added to our range. [Describe where the product is used and its key feature in a sentence or two.]

- [Feature 1]
- [Feature 2]
- [Lead time or stock information]

For technical details and a quotation, see the product page or simply reply to this e-mail.

Kind regards,
CLK Yapı Group$t$),
 jsonb_build_object('tr', 'Ürünü incele', 'en', 'View the product'), jsonb_build_object('tr', 'https://clkyapigroup.com/tr/urunler', 'en', 'https://clkyapigroup.com/en/products'), 10),

('Fiyat güncellemesi bildirimi', 'pricing', 'Fiyat değişikliğini önceden haber verin; hangi tarihe kadar eski fiyatın geçerli olduğunu belirtin.',
 jsonb_build_object('tr', $t$[tarih] itibarıyla fiyat güncellemesi$t$, 'en', $t$Price update effective [date]$t$),
 jsonb_build_object('tr', $t$Onaylanan teklifler mevcut fiyatla geçerlidir$t$, 'en', $t$Approved quotations remain valid at the current price$t$),
 jsonb_build_object('tr', $t$Sayın {{full_name}},

[ürün grubu] fiyatlarımız [tarih] tarihinden itibaren güncellenecektir. [Güncellemenin nedenini kısaca yazın.]

[son tarih] tarihine kadar onaylanan teklifler mevcut fiyatlarla geçerlidir. Güncel fiyat için bizden teklif isteyebilirsiniz.

Saygılarımızla,
CLK Yapı Group$t$, 'en', $t$Dear {{full_name}},

Our prices for [product group] will be updated as of [date]. [Briefly state the reason for the update.]

Quotations approved by [deadline] remain valid at the current prices. You can request a quotation for the current price.

Kind regards,
CLK Yapı Group$t$),
 jsonb_build_object('tr', 'Teklif iste', 'en', 'Request a quote'), jsonb_build_object('tr', 'https://clkyapigroup.com/tr/teklif-al', 'en', 'https://clkyapigroup.com/en/get-quote'), 10),

('Dönemsel kampanya', 'pricing', 'Belirli bir tarihe kadar geçerli koşulları duyurun. Koşulları açıkça yazın.',
 jsonb_build_object('tr', $t$[kampanya adı]: [son tarih] tarihine kadar$t$, 'en', $t$[campaign name]: until [deadline]$t$),
 jsonb_build_object('tr', $t$Koşullar ve geçerlilik süresi$t$, 'en', $t$Terms and validity$t$),
 jsonb_build_object('tr', $t$## [kampanya adı]

Sayın {{full_name}},

[ürün ya da hizmet] için [kampanya koşulu] kampanyamız [son tarih] tarihine kadar geçerlidir.

- [Koşul 1]
- [Koşul 2]

Yararlanmak için teklif isteyebilir ya da bu e-postayı yanıtlayabilirsiniz.

Saygılarımızla,
CLK Yapı Group$t$, 'en', $t$## [campaign name]

Dear {{full_name}},

Our [campaign terms] offer for [product or service] is valid until [deadline].

- [Condition 1]
- [Condition 2]

To take advantage of it, request a quotation or reply to this e-mail.

Kind regards,
CLK Yapı Group$t$),
 jsonb_build_object('tr', 'Teklif iste', 'en', 'Request a quote'), jsonb_build_object('tr', 'https://clkyapigroup.com/tr/teklif-al', 'en', 'https://clkyapigroup.com/en/get-quote'), 20),

('Teklif hatırlatma', 'followup', 'Teklif gönderdiğiniz ama dönüş alamadığınız kişilere nazik bir hatırlatma.',
 jsonb_build_object('tr', $t$Teklifimizle ilgili sorunuz var mı?$t$, 'en', $t$Any questions about our quotation?$t$),
 jsonb_build_object('tr', $t$Birlikte gözden geçirebiliriz$t$, 'en', $t$We can go through it together$t$),
 jsonb_build_object('tr', $t$Sayın {{full_name}},

[tarih] tarihinde ilettiğimiz [proje ya da ürün] teklifimizi değerlendirme fırsatınız oldu mu?

Ölçü, malzeme ya da teslim süresiyle ilgili değiştirmek istediğiniz bir nokta varsa teklifi birlikte gözden geçirebiliriz. Bu e-postayı yanıtlamanız yeterli.

Saygılarımızla,
CLK Yapı Group$t$, 'en', $t$Dear {{full_name}},

Have you had a chance to review the [project or product] quotation we sent on [date]?

If there is anything you would like to change about dimensions, materials or lead time, we can go through the quotation together. Simply reply to this e-mail.

Kind regards,
CLK Yapı Group$t$),
 jsonb_build_object('tr', 'Bize ulaşın', 'en', 'Contact us'), jsonb_build_object('tr', 'https://clkyapigroup.com/tr/iletisim', 'en', 'https://clkyapigroup.com/en/contact'), 10),

('Fuar ya da etkinlik daveti', 'event', 'Katıldığınız fuar, açılış ya da etkinliğe davet.',
 jsonb_build_object('tr', $t$Davet: [etkinlik adı]$t$, 'en', $t$Invitation: [event name]$t$),
 jsonb_build_object('tr', $t$Tarih, yer ve stant bilgisi$t$, 'en', $t$Date, venue and stand details$t$),
 jsonb_build_object('tr', $t$## [etkinlik adı]

Sayın {{full_name}},

[tarih] tarihlerinde düzenlenecek [etkinlik adı] etkinliğine katılıyoruz. Sizi standımızda ağırlamaktan memnuniyet duyarız.

- Tarih: [tarih]
- Yer: [yer]
- Stant: [salon ve stant numarası]

Görüşme saati ayırtmak için bu e-postayı yanıtlayabilirsiniz.

Saygılarımızla,
CLK Yapı Group$t$, 'en', $t$## [event name]

Dear {{full_name}},

We are taking part in [event name] on [date]. We would be pleased to welcome you at our stand.

- Date: [date]
- Venue: [venue]
- Stand: [hall and stand number]

To book a meeting slot, simply reply to this e-mail.

Kind regards,
CLK Yapı Group$t$),
 jsonb_build_object('tr', '', 'en', ''), jsonb_build_object('tr', '', 'en', ''), 10),

('Bayram kutlaması', 'greeting', 'Dinî ve millî bayramlar için kısa kutlama.',
 jsonb_build_object('tr', $t$[bayram adı] kutlu olsun$t$, 'en', $t$Best wishes for [holiday name]$t$),
 jsonb_build_object('tr', '', 'en', ''),
 jsonb_build_object('tr', $t$Sayın {{full_name}},

[bayram adı] vesilesiyle sizin ve sevdiklerinizin bayramını kutlar; sağlık, huzur ve esenlik dileriz.

Saygılarımızla,
CLK Yapı Group$t$, 'en', $t$Dear {{full_name}},

On the occasion of [holiday name] we send our best wishes to you and your loved ones for health, peace and well-being.

Kind regards,
CLK Yapı Group$t$),
 jsonb_build_object('tr', '', 'en', ''), jsonb_build_object('tr', '', 'en', ''), 10),

('Yeni yıl kutlaması', 'greeting', 'Yıl sonunda müşterilere teşekkür ve iyi dilek.',
 jsonb_build_object('tr', $t$Yeni yılınız kutlu olsun$t$, 'en', $t$Happy New Year$t$),
 jsonb_build_object('tr', '', 'en', ''),
 jsonb_build_object('tr', $t$Sayın {{full_name}},

Geride bıraktığımız yılda bize duyduğunuz güven için teşekkür ederiz. Yeni yılın size ve ekibinize sağlık, başarı ve güzel projeler getirmesini dileriz.

Saygılarımızla,
CLK Yapı Group$t$, 'en', $t$Dear {{full_name}},

Thank you for the trust you placed in us over the past year. We wish you and your team health, success and rewarding projects in the new year.

Kind regards,
CLK Yapı Group$t$),
 jsonb_build_object('tr', '', 'en', ''), jsonb_build_object('tr', '', 'en', ''), 20),

('Proje sonrası teşekkür', 'relationship', 'Teslim edilen iş sonrasında müşteriye teşekkür.',
 jsonb_build_object('tr', $t$İş birliğiniz için teşekkür ederiz$t$, 'en', $t$Thank you for working with us$t$),
 jsonb_build_object('tr', '', 'en', ''),
 jsonb_build_object('tr', $t$Sayın {{full_name}},

[proje adı] projesinde bizi tercih ettiğiniz için teşekkür ederiz.

Yapınızla ilgili bakım, ek imalat ya da yeni bir ihtiyaç olduğunda bu e-postayı yanıtlayarak bize ulaşabilirsiniz.

Saygılarımızla,
CLK Yapı Group$t$, 'en', $t$Dear {{full_name}},

Thank you for choosing us for the [project name] project.

Whenever you need maintenance, additional fabrication or something new for your building, you can reach us by replying to this e-mail.

Kind regards,
CLK Yapı Group$t$),
 jsonb_build_object('tr', '', 'en', ''), jsonb_build_object('tr', '', 'en', ''), 10),

('Yorum ve değerlendirme isteği', 'relationship', 'Tamamlanan iş için müşteriden sitede yorum yazmasını rica edin.',
 jsonb_build_object('tr', $t$Deneyiminizi paylaşır mısınız?$t$, 'en', $t$Would you share your experience?$t$),
 jsonb_build_object('tr', $t$İki dakikanızı ayırmanız yeterli$t$, 'en', $t$It only takes two minutes$t$),
 jsonb_build_object('tr', $t$Sayın {{full_name}},

Birlikte tamamladığımız [proje adı] hakkındaki görüşünüz bizim için değerli. Değerlendirmenizi yazarsanız hem bize hem de karar aşamasındaki diğer firmalara yol göstermiş olursunuz.

Saygılarımızla,
CLK Yapı Group$t$, 'en', $t$Dear {{full_name}},

Your opinion of [project name], which we completed together, matters to us. By writing a review you help both us and other companies that are still deciding.

Kind regards,
CLK Yapı Group$t$),
 jsonb_build_object('tr', 'Yorum yaz', 'en', 'Write a review'), jsonb_build_object('tr', 'https://clkyapigroup.com/tr/yorumlar', 'en', 'https://clkyapigroup.com/en/reviews'), 20),

('Tatil ve çalışma saatleri duyurusu', 'operations', 'Bayram, yıllık bakım ya da sayım nedeniyle kapalı olunacak günleri bildirin.',
 jsonb_build_object('tr', $t$[tarih aralığı] çalışma düzenimiz$t$, 'en', $t$Our working schedule for [date range]$t$),
 jsonb_build_object('tr', $t$Kapalı olduğumuz günler ve dönüş tarihi$t$, 'en', $t$Days we are closed and when we return$t$),
 jsonb_build_object('tr', $t$Sayın {{full_name}},

[tarih aralığı] tarihleri arasında [neden] nedeniyle [ofisimiz ya da üretimimiz] kapalı olacaktır. [dönüş tarihi] itibarıyla normal çalışma düzenimize dönüyoruz.

Bu sürede gelen talepler dönüşte sırayla yanıtlanacaktır. Acil durumlar için: [telefon ya da e-posta]

Saygılarımızla,
CLK Yapı Group$t$, 'en', $t$Dear {{full_name}},

[Our office or production] will be closed between [date range] due to [reason]. We return to our normal schedule on [return date].

Requests received during this period will be answered in order when we are back. For urgent matters: [phone or e-mail]

Kind regards,
CLK Yapı Group$t$),
 jsonb_build_object('tr', '', 'en', ''), jsonb_build_object('tr', '', 'en', ''), 10),

('İletişim bilgisi değişikliği', 'operations', 'Adres, telefon ya da e-posta değiştiğinde kayıtların güncellenmesi için.',
 jsonb_build_object('tr', $t$İletişim bilgilerimiz güncellendi$t$, 'en', $t$Our contact details have changed$t$),
 jsonb_build_object('tr', '', 'en', ''),
 jsonb_build_object('tr', $t$Sayın {{full_name}},

[tarih] itibarıyla [adres, telefon ya da e-posta] bilgimiz değişmiştir.

- Yeni bilgi: [yeni adres, telefon ya da e-posta]

Kayıtlarınızı güncellemenizi rica ederiz.

Saygılarımızla,
CLK Yapı Group$t$, 'en', $t$Dear {{full_name}},

As of [date] our [address, phone or e-mail] has changed.

- New details: [new address, phone or e-mail]

Please update your records.

Kind regards,
CLK Yapı Group$t$),
 jsonb_build_object('tr', 'İletişim sayfası', 'en', 'Contact page'), jsonb_build_object('tr', 'https://clkyapigroup.com/tr/iletisim', 'en', 'https://clkyapigroup.com/en/contact'), 20)
) as v(name, category, description, subject, preheader, body, cta_label, cta_url, sort_order)
where not exists (select 1 from public.mail_campaign_templates);
