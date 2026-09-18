-- 0041 · Başlangıç içeriği (K-55: tanımlayıcı metin seed edilir, İDDİA edilmez): 4 yasal sayfa, SSS, 3 bilgilendirici blog yazısı.
-- · Yasal metinler sitenin GERÇEKTE yaptığı veri işlemeyi anlatır (formlar, üyelik, başvuru, konfigüratör, kendi analitiğimiz, çerezler,
--   03-SECURITY-KVKK saklama süreleri). Ticari unvan/adres/MERSİS UYDURULMAZ → İletişim sayfasına atıf; hukukçu gözden geçirmeli.
-- · Yalnız TR yayınlanır: Kural 7 (yasal metinde otomatik çeviri kapalı; EN insan onayıyla). Proje/referans/belge/ekip/yorum/fiyat YOK.
-- · Yeniden çalıştırılabilir: yasal sayfa yalnız gövdesi boşsa yazılır; SSS/blog yalnız tablo boşsa eklenir.

-- ── Yasal sayfalar
update public.static_pages set
  body = jsonb_build_object('tr', $md$*Son güncelleme: 18 Eylül 2026*

Bu politika, CLK Yapı Group internet sitesini ziyaret ettiğinizde, formlarımızı doldurduğunuzda ya da üye olduğunuzda kişisel verilerinizin nasıl ele alındığını özetler. Veri işlemenin hukuki ayrıntıları için [KVKK Aydınlatma Metni](/tr/kvkk-aydinlatma-metni), çerezler için [Çerez Politikası](/tr/cerez-politikasi) sayfasına bakabilirsiniz.

## Hangi verileri topluyoruz

- **Bize sizin verdiğiniz bilgiler:** iletişim ve teklif formlarında ad soyad, firma, e-posta, telefon, şehir, mesajınız ve projenize ilişkin bilgiler; üyelikte ad, e-posta, telefon ve dil tercihi; iş başvurusunda özgeçmiş dosyanız; konfigüratörde kaydettiğiniz ölçüler ve e-posta adresiniz; gönderdiğiniz yorumlar.
- **Otomatik oluşan kayıtlar:** güvenlik ve kötüye kullanımı önleme amacıyla, IP adresinizin son bölümü silinerek üretilen geri döndürülemez bir özet. Açık IP adresiniz saklanmaz.
- **Ölçüm verileri (yalnız onay verirseniz):** görüntülenen sayfalar, tıklama ve kaydırma davranışı, form etkileşimi, sayfa hız ölçümleri. Ölçüm kendi altyapımızda yapılır.

## Verileri ne için kullanıyoruz

- Talebinize dönüş yapmak, keşif ve teklif hazırlamak
- Üyelik hesabınızı ve kaydettiğiniz konfigürasyonları yönetmek
- İş başvurularını değerlendirmek
- Siteyi güvenli ve çalışır tutmak, hataları gidermek
- Onay verdiyseniz siteyi iyileştirmek için kullanım ölçümü yapmak
- Yasal yükümlülüklerimizi (ör. ticari kayıtların saklanması) yerine getirmek

Verilerinizi satmayız ve pazarlama amacıyla üçüncü kişilerle paylaşmayız.

## Kimlerle paylaşılır

Site; barındırma, veritabanı ve e-posta gönderimi için hizmet sağlayıcılarla çalışır. Bu sağlayıcılar verileri yalnız bizim adımıza ve talimatımızla işler. Sunucuları yurt dışında bulunabilir. Yasal zorunluluk hâlinde yetkili kurumlara bilgi verilebilir.

## Ne kadar saklanır

- Talep ve teklif kayıtları: en fazla 3 yıl, sonrasında anonimleştirilir
- İş başvuruları: 365 gün, sonrasında dosyasıyla birlikte silinir
- Ölçüm ham kayıtları: 60 gün
- Satış ve fatura kayıtları: mevzuatın öngördüğü süre boyunca

## Güvenlik

Bağlantılar şifrelidir (HTTPS). Veritabanında her tablo varsayılan olarak kapalıdır; erişim rol bazlı kurallarla açılır. Yönetim paneline yalnız yetkili personel girer ve kritik işlemler kayıt altına alınır.

## Haklarınız

Verilerinize erişme, düzeltilmesini ya da silinmesini isteme ve işlenmesine itiraz etme hakkınız vardır. Başvurunuzu [İletişim](/tr/iletisim) sayfasındaki kanallardan iletebilirsiniz. Ayrıntılar KVKK Aydınlatma Metni'ndedir.

## Değişiklikler

Bu politika güncellendiğinde sayfanın başındaki tarih değişir. Önemli değişiklikler sitede ayrıca duyurulur.$md$),
  seo_description = jsonb_build_object('tr', 'CLK Yapı Group sitesinde kişisel verilerin nasıl toplandığı, kullanıldığı, saklandığı ve korunduğu.'),
  status = 'published', published_locales = array['tr'], published_at = coalesce(published_at, now())
where page_key = 'privacy-policy' and coalesce(body->>'tr', '') = '';

update public.static_pages set
  body = jsonb_build_object('tr', $md$*Son güncelleme: 18 Eylül 2026*

Bu sayfa, CLK Yapı Group sitesinin tarayıcınızda hangi çerezleri ve benzeri depolama alanlarını kullandığını anlatır. Tercihinizi sayfanın altındaki **Çerez ayarları** bağlantısından dilediğiniz an değiştirebilirsiniz.

## Zorunlu çerezler

Sitenin çalışması için gereklidir, onaya bağlı değildir.

- **`clk_consent`** — çerez tercihinizi hatırlar. Süre: 180 gün.
- **`NEXT_LOCALE`** — seçtiğiniz dili (Türkçe / İngilizce) hatırlar.
- **Oturum çerezleri** (`sb-…-auth-token`) — yalnız üye girişi yaptığınızda yazılır, oturumunuzu açık tutar.

## Cihazınızda tutulan diğer bilgiler

Aşağıdakiler çerez değildir; tarayıcınızın yerel depolamasında durur ve sunucuya kendiliğinden gönderilmez.

- **Teklif sepeti** (`clk_basket`) — teklif listenize eklediğiniz ürünler
- **Konfigüratör taslağı** (`clk_configurator_draft`) — son girdiğiniz ölçüler

## Analitik (onayınıza bağlı)

Onay verirseniz siteyi nasıl kullandığınızı **kendi ölçüm aracımızla** ölçeriz: görüntülenen sayfalar, tıklamalar, kaydırma derinliği, form etkileşimi ve sayfa hız ölçümleri. Ziyaretçi kimliği, düzenli değişen bir anahtarla üretilen geri döndürülemez bir özettir; açık IP adresi saklanmaz. Ham kayıtlar 60 gün sonra silinir, yalnız toplu istatistikler kalır. Onay vermezseniz ölçüm betiği hiç yüklenmez.

## Pazarlama (onayınıza bağlı)

Site, etkinleştirildiğinde Google Analytics, Google Ads ve Meta Pixel etiketlerini destekler. Bu etiketler **yalnız pazarlama onayı verdiyseniz** yüklenir; onay yoksa tarayıcınıza hiçbir üçüncü taraf etiketi gelmez.

## Çerezleri nasıl yönetirim

- Sitedeki **Çerez ayarları** bağlantısıyla analitik ve pazarlama onayını ayrı ayrı açıp kapatabilirsiniz.
- Tarayıcınızın ayarlarından tüm çerezleri silebilir ya da engelleyebilirsiniz. Zorunlu çerezleri engellerseniz dil tercihi ve üye girişi çalışmayabilir.

Kişisel verilerinizin işlenmesine ilişkin ayrıntılar için [KVKK Aydınlatma Metni](/tr/kvkk-aydinlatma-metni) sayfasına bakın.$md$),
  seo_description = jsonb_build_object('tr', 'CLK Yapı Group sitesinde kullanılan zorunlu, analitik ve pazarlama çerezleri ile tercihlerinizi nasıl yöneteceğiniz.'),
  status = 'published', published_locales = array['tr'], published_at = coalesce(published_at, now())
where page_key = 'cookie-policy' and coalesce(body->>'tr', '') = '';

update public.static_pages set
  body = jsonb_build_object('tr', $md$*Son güncelleme: 18 Eylül 2026*

Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun ("KVKK") 10. maddesi uyarınca, kişisel verilerinizin işlenmesi hakkında sizi bilgilendirmek için hazırlanmıştır.

## Veri sorumlusu

Veri sorumlusu, bu internet sitesinin sahibi olan **CLK Yapı Group**'tur. Açık ticari unvan ve iletişim bilgileri [İletişim](/tr/iletisim) sayfasında yer alır.

## İşlenen kişisel veriler

- **Kimlik ve iletişim:** ad soyad, firma adı, e-posta, telefon, şehir
- **Talep bilgileri:** mesajınız, yapı tipi, bütçe ve süre tercihi, teklif listenizdeki kalemler, konfigüratörde kaydettiğiniz ölçüler
- **Üyelik:** ad, e-posta, telefon, dil tercihi
- **İş başvurusu:** özgeçmiş dosyanız ve başvuruda verdiğiniz bilgiler
- **İçerik:** gönderdiğiniz yorum ve değerlendirmeler
- **İşlem güvenliği:** IP adresinizden üretilen geri döndürülemez özet, işlem zamanı
- **Kullanım ölçümü (açık rızanızla):** sayfa görüntüleme, tıklama, kaydırma ve form etkileşimi kayıtları

## İşleme amaçları ve hukuki sebepler

- Talebinize dönüş yapmak, keşif ve teklif hazırlamak, sözleşme sürecini yürütmek — *sözleşmenin kurulması ve ifası (KVKK m.5/2-c)*
- Üyelik hesabını ve kayıtlı konfigürasyonları yönetmek — *sözleşmenin ifası (m.5/2-c)*
- İş başvurularını değerlendirmek — *ilgili kişinin temel haklarına zarar vermemek kaydıyla meşru menfaat (m.5/2-f)*
- Sitenin güvenliğini sağlamak, kötüye kullanımı önlemek, hataları gidermek — *meşru menfaat (m.5/2-f)*
- Satış ve fatura kayıtlarını saklamak — *hukuki yükümlülük (m.5/2-ç)*
- Kullanım ölçümü ve pazarlama etiketleri — *açık rıza (m.5/1)*; rızanızı çerez ayarlarından dilediğiniz an geri alabilirsiniz
- Ticari elektronik ileti — yalnız ayrıca onay verdiyseniz

## Aktarım

Verileriniz; barındırma, veritabanı ve e-posta gönderimi hizmeti aldığımız sağlayıcılara, yalnız hizmetin gerektirdiği ölçüde aktarılır. Bu sağlayıcıların sunucuları yurt dışında bulunabilir; aktarım KVKK'nın 9. maddesindeki şartlara uygun yapılır. Yasal zorunluluk hâlinde yetkili kamu kurumlarına bilgi verilebilir. Verileriniz üçüncü kişilere satılmaz.

## Toplama yöntemi

Veriler; sitedeki formlar, üyelik ekranları, iş başvuru formu, konfigüratör ve (rızanız varsa) ölçüm aracı üzerinden elektronik ortamda toplanır.

## Saklama süreleri

- Talep ve teklif kayıtları: en fazla 3 yıl, sonrasında anonimleştirilir
- İş başvuruları: 365 gün
- Ölçüm ham kayıtları: 60 gün
- Satış ve fatura kayıtları: ilgili mevzuatın öngördüğü süre

Silme talebiniz ile yasal saklama yükümlülüğü çakışırsa, kayıt yalnız yasal süre boyunca ve erişimi kısıtlanarak tutulur.

## KVKK m.11 kapsamındaki haklarınız

Kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işleme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, aktarıldığı üçüncü kişileri bilme, eksik ya da yanlış işlenmişse düzeltilmesini isteme, şartları oluştuğunda silinmesini ya da yok edilmesini isteme, bu işlemlerin aktarılan üçüncü kişilere bildirilmesini isteme, otomatik sistemlerle analiz sonucu aleyhinize bir sonuç çıkmasına itiraz etme ve kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme haklarına sahipsiniz.

## Başvuru

Taleplerinizi [İletişim](/tr/iletisim) sayfasındaki kanallar üzerinden, kimliğinizi doğrulayan bilgilerle birlikte iletebilirsiniz. Başvurular en geç 30 gün içinde yanıtlanır. Yanıttan memnun kalmazsanız Kişisel Verileri Koruma Kurulu'na şikâyet hakkınız saklıdır.$md$),
  seo_description = jsonb_build_object('tr', 'KVKK m.10 uyarınca CLK Yapı Group''un kişisel verileri hangi amaçla, hangi hukuki sebeple işlediği ve haklarınız.'),
  status = 'published', published_locales = array['tr'], published_at = coalesce(published_at, now())
where page_key = 'data-protection' and coalesce(body->>'tr', '') = '';

update public.static_pages set
  body = jsonb_build_object('tr', $md$*Son güncelleme: 18 Eylül 2026*

Bu siteyi kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız.

## Sitenin amacı

Site, CLK Yapı Group'un çelik konstrüksiyon hizmetlerini tanıtmak, bilgilendirici içerik sunmak ve teklif taleplerini almak için yayınlanır. Sitedeki içerik genel bilgilendirme amaçlıdır; mühendislik danışmanlığı ya da bağlayıcı taahhüt niteliği taşımaz.

## Konfigüratör, metraj ve fiyat bilgileri

3D konfigüratörün ürettiği model, metraj, tonaj ve fiyat tahminleri ile fiyat rehberindeki aralıklar **ön tahmindir**. Statik hesap, uygulama projesi ve resmî teklif yerine geçmez. Kesin ölçü, malzeme ve bedel; keşif, zemin verisi ve yetkili mühendisin hazırlayacağı proje sonrasında yazılı teklifle belirlenir.

## Üyelik

Üyelik bilgilerinizin doğruluğundan ve şifrenizin gizliliğinden siz sorumlusunuz. Hesabınızda izinsiz kullanım fark ederseniz bize bildirin. Koşullara aykırı kullanım hâlinde hesap askıya alınabilir.

## Yasak kullanım

Siteye zarar verecek, güvenlik önlemlerini aşmaya çalışacak, otomatik araçlarla aşırı yük oluşturacak ya da başkalarının haklarını ihlal edecek biçimde kullanım yasaktır. Formlar aracılığıyla yanıltıcı ya da hukuka aykırı içerik gönderilemez.

## Fikri mülkiyet

Sitedeki metinler, görseller, çizimler, 3D modeller ve yazılım, aksi belirtilmedikçe CLK Yapı Group'a ya da lisans verenlerine aittir. Kaynak gösterilmeden ve yazılı izin alınmadan çoğaltılamaz, ticari amaçla kullanılamaz.

## Gönderdiğiniz içerik

Yorum ve değerlendirmeler yayınlanmadan önce incelenir. Gerçeğe aykırı, hakaret içeren ya da üçüncü kişilerin haklarını ihlal eden içerik yayınlanmaz.

## Dış bağlantılar

Site, üçüncü taraf sitelere bağlantı verebilir. Bu sitelerin içeriğinden ve gizlilik uygulamalarından sorumlu değiliz.

## Sorumluluğun sınırı

Sitenin kesintisiz ve hatasız çalışması için çaba gösteririz, ancak bunu garanti etmeyiz. Sitedeki genel bilgilere dayanılarak alınan kararlardan doğan zararlardan, yürürlükteki mevzuatın izin verdiği ölçüde sorumlu tutulamayız.

## Kişisel veriler

Kişisel verilerinizin işlenmesi [Gizlilik Politikası](/tr/gizlilik-politikasi), [KVKK Aydınlatma Metni](/tr/kvkk-aydinlatma-metni) ve [Çerez Politikası](/tr/cerez-politikasi) ile düzenlenir.

## Değişiklikler ve uygulanacak hukuk

Bu koşullar güncellenebilir; güncel metin bu sayfada yayınlanır. Koşullara Türkiye Cumhuriyeti hukuku uygulanır.$md$),
  seo_description = jsonb_build_object('tr', 'CLK Yapı Group sitesinin kullanım koşulları: içerik, konfigüratör tahminleri, üyelik, fikri mülkiyet ve sorumluluk.'),
  status = 'published', published_locales = array['tr'], published_at = coalesce(published_at, now())
where page_key = 'terms-of-use' and coalesce(body->>'tr', '') = '';

-- ── SSS (genel; entity bağlantısız → /sss sayfası). Rakam/taahhüt yok.
insert into public.faqs (question, answer, sort_order, status, published_locales, published_at)
select jsonb_build_object('tr', q), jsonb_build_object('tr', a), n, 'published', array['tr'], now()
from (values
  (1, 'Çelik konstrüksiyon yapı nedir?', 'Taşıyıcı sistemi — kolonları, kirişleri, makasları ve bağlantıları — yapısal çelik profillerden oluşan yapıdır. Elemanlar atölyede kesilir, delinir ve kaynaklanır; sahada bulonlu ya da kaynaklı birleşimlerle monte edilir. Döşeme, cephe ve çatı bu iskeletin üzerine oturur.'),
  (2, 'Çelik yapı hangi durumlarda betonarmeye göre avantajlıdır?', 'Şantiye süresinin kısa olması gerektiğinde, büyük açıklık istendiğinde (depo, fabrika, salon), zemin zayıf olduğu için yapının hafif olması istendiğinde ve ileride söküm ya da genişleme öngörüldüğünde çelik öne çıkar. Her projede doğru seçim olmayabilir; karar zemin verisi, mimari, kullanım amacı ve bütçe birlikte değerlendirilerek verilir.'),
  (3, 'Çelik yapılar depremde nasıl davranır?', 'Çelik sünek bir malzemedir: kırılmadan önce şekil değiştirerek enerji tüketir. Yapı daha hafif olduğu için üzerine gelen deprem yükü de daha düşüktür. Bu davranış kendiliğinden oluşmaz; yapının Türkiye Bina Deprem Yönetmeliği (TBDY 2018) ve Çelik Yapıların Tasarım, Hesap ve Yapım Esaslarına Dair Yönetmelik''e göre tasarlanması, birleşimlerin doğru detaylandırılması ve imalat ile montajın denetlenmesi gerekir.'),
  (4, 'Çelik yangına dayanıklı mıdır?', 'Çelik yanmaz, ancak yüksek sıcaklıkta dayanımını kaybeder. Bu nedenle taşıyıcı elemanlar, yapının kullanım sınıfına göre gereken süre boyunca korunur: yangın geciktirici boya, alçı ya da çimento esaslı kaplama, püskürtme sıva gibi yöntemler kullanılır. Gerekli dayanım süresi Binaların Yangından Korunması Hakkında Yönetmelik''e göre belirlenir.'),
  (5, 'Çelik paslanmaz mı? Korozyona karşı ne yapılır?', 'Korunmayan çelik neme maruz kaldığında paslanır. Koruma, yapının bulunacağı ortama göre seçilir: yüzey hazırlığı (kumlama), astar ve son kat boya sistemi, sıcak daldırma galvaniz ya da ikisinin birlikte kullanımı. Kapalı ve kuru iç mekân ile deniz kenarı ya da kimyasal ortam aynı korumayı gerektirmez.'),
  (6, 'Süreç nasıl işler?', 'Önce ihtiyaç ve saha bilgisi alınır, gerekirse keşif yapılır. Ardından ön tasarım ve teklif hazırlanır. Anlaşma sonrası statik proje ve imalat çizimleri çıkarılır, gerekli onaylar alınır. Elemanlar atölyede üretilir, yüzey koruması uygulanır, sahaya sevk edilir ve montaj yapılır. Temel gibi betonarme işler atölye imalatıyla aynı anda yürütülebilir.'),
  (7, 'Teklif için hangi bilgilere ihtiyacınız var?', 'Yapının yeri, kullanım amacı, yaklaşık ölçüleri (en, boy, yükseklik), varsa mimari proje ya da eskiz, zemin etüdü, vinç ya da asma kat gibi özel ihtiyaçlar ve hedeflediğiniz takvim. Bu bilgilerin hepsi hazır olmasa da teklif formunu doldurabilirsiniz; eksikleri birlikte netleştiririz.'),
  (8, 'Konfigüratördeki metraj ve fiyat kesin midir?', 'Hayır. Konfigüratör, girdiğiniz ölçülere göre tipik bir taşıyıcı sistem kurar ve yaklaşık eleman boyları ile alanları hesaplar. Bu bir ön tahmindir; statik hesap ve resmî teklif yerine geçmez. Kesin metraj ve bedel, keşif ve mühendislik projesi sonrasında yazılı teklifle belirlenir.'),
  (9, 'Kentsel dönüşümde çelik karkas kullanılabilir mi?', 'Evet. 6306 sayılı Kanun kapsamında riskli yapı kararı alınan parsellerde yeni yapı çelik taşıyıcı sistemle yapılabilir. Ruhsat süreci diğer yapılarla aynıdır; statik proje yetkili inşaat mühendisi tarafından hazırlanır ve ilgili idare onaylar. Dar parsel ve dar sokaklarda kuru montaj, şantiye süresini ve çevreye etkiyi azaltmaya yardımcı olur.'),
  (10, 'Mevcut betonarme binam çelikle güçlendirilebilir mi?', 'Bu sorunun cevabı binaya özeldir. Önce mevcut yapının taşıyıcı sistemi incelenir ve performans analizi yapılır. Uygun bulunursa çelik çaprazlar, çelik mantolama, ek çerçeveler ya da döşeme takviyesi gibi yöntemler kullanılabilir. Bazı yapılarda güçlendirme yerine yeniden yapım daha doğru çıkar; karar mühendislik raporuna dayanır.'),
  (11, 'Çelik yapı için ruhsat gerekir mi?', 'Evet. Çelik taşıyıcılı yapılar da 3194 sayılı İmar Kanunu kapsamındadır; yapı ruhsatı, onaylı projeler ve yapı denetimi gerekir. Geçici ya da küçük yapılar için istisnalar ilgili belediyenin uygulamasına göre değişir; başlamadan önce idareye danışılmalıdır.')
) as t(n, q, a)
where not exists (select 1 from public.faqs);

-- ── Blog: 3 bilgilendirici yazı (kategori başına bir). Yazar yok (author_id = gerçek ekip üyesi olmalı; ekip girilince atanır).
insert into public.blog_posts (slug, title, excerpt, body, category_id, reading_minutes, status, published_locales, published_at, seo_description)
select jsonb_build_object('tr', s), jsonb_build_object('tr', t), jsonb_build_object('tr', e), jsonb_build_object('tr', b),
       (select id from public.blog_categories where slug->>'tr' = c), jsonb_build_object('tr', m), 'published', array['tr'], now() - make_interval(days => o), jsonb_build_object('tr', e)
from (values
  ('celik-konstruksiyon-yapi-nedir', 'Çelik konstrüksiyon yapı nedir? Taşıyıcı sistemin temel elemanları', 'Kolon, makas, aşık, çapraz: bir çelik yapının iskeleti hangi elemanlardan oluşur ve her biri ne iş görür?', 'celik-konstruksiyon', 4, 2,
$md$Çelik konstrüksiyon yapı, yükleri taşıyan iskeletin yapısal çelik profillerden kurulduğu yapıdır. Bir sanayi yapısına girdiğinizde gördüğünüz düzenli çerçeveler bu iskelettir. Bu yazı, o iskeleti oluşturan elemanları ve görevlerini sade bir dille anlatır.

## Ana çerçeve: kolon ve makas

**Kolonlar** düşey yükleri temele aktarır. Genellikle geniş başlıklı H profiller (HEA, HEB) kullanılır, çünkü iki yönde de eğilmeye karşı dengeli davranırlar.

**Makas** ya da çatı kirişi, iki kolon arasındaki açıklığı geçer ve çatı yükünü kolonlara taşır. Orta açıklıklarda dolu gövdeli I profiller (IPE) yeterlidir. Açıklık büyüdükçe dolu gövdeli kiriş ağırlaşır; bu noktada çubuklardan oluşan **kafes makas** daha az malzemeyle aynı işi görür.

Kolon ve makasın oluşturduğu çerçeve, yapının boyu boyunca belirli aralıklarla tekrar eder. Bu aralığa **aks aralığı** denir.

## İkincil elemanlar: aşık ve kuşak

Çatı kaplaması doğrudan makaslara oturmaz. Makasların üzerine, yapı boyunca uzanan **aşıklar** yerleştirilir; kaplama aşıklara bağlanır. Duvarlarda aynı görevi **kuşaklar** üstlenir. Bu elemanlar genellikle soğuk şekillendirilmiş ya da hadde U / C / Z profillerdir.

## Stabilite: çaprazlar

Çerçeveler kendi düzlemlerinde güçlüdür, ama yapının boyu yönünde onları birbirine bağlayan bir sistem gerekir. **Çatı ve duvar çaprazları** rüzgâr ve deprem gibi yatay yükleri temele indirir, montaj sırasında da yapıyı dengede tutar. Çapraz olarak boru, köşebent ya da çubuk kullanılabilir.

## Birleşimler

Elemanlar birbirine **bulonlu** ya da **kaynaklı** birleşimlerle bağlanır. Yaygın uygulama, kaynağın atölyede kontrollü koşullarda yapılması, sahada ise bulonlu montajdır. Kolon ayağında **taban plakası** ve **ankraj bulonları** yükü betonarme temele aktarır.

Bir çelik yapının güvenliği çoğu zaman profil boyutundan çok birleşim detayının doğruluğuna bağlıdır.

## Kaplama

İskeletin üzerine çatı ve cephe kaplaması gelir: trapez sac, sandviç panel ya da projeye göre farklı sistemler. Kaplama taşıyıcı değildir ama yapının ısı, su ve yangın performansını belirler.

## Özet

- Kolon ve makas ana çerçeveyi kurar
- Aşık ve kuşak kaplamayı taşır
- Çaprazlar yatay yüklere karşı stabilite sağlar
- Birleşimler sistemin en kritik noktalarıdır

*Bu yazı genel bilgilendirme amaçlıdır. Her yapının taşıyıcı sistemi, yetkili mühendisin yapacağı hesapla belirlenir.*$md$),
  ('kentsel-donusumde-celik-karkas-sureci', 'Kentsel dönüşümde çelik karkas: dar parselde süreç nasıl işler?', 'Riskli yapı kararından montaja: dar parselde çelik taşıyıcı sistemle yeniden yapımın adımları ve dikkat edilecek noktalar.', 'kentsel-donusum', 5, 9,
$md$Kentsel dönüşümde bina sahiplerinin en sık sorduğu soru "ne kadar sürer?" sorusudur. Sürenin büyük kısmı idari işlemlere, kalan kısmı şantiyeye gider. Taşıyıcı sistem seçimi ikinci kısmı etkiler. Bu yazı, dar parselde çelik karkasla yeniden yapım sürecini adım adım anlatır.

## 1. Riskli yapı tespiti ve karar

Süreç, 6306 sayılı Kanun kapsamında lisanslı bir kuruluşun yaptığı **riskli yapı tespiti** ile başlar. Rapor onaylanınca yapı tapuya riskli yapı olarak işlenir. Maliklerin anlaşması, yıkım ve tahliye bu aşamada yürür. Bu adımlar taşıyıcı sistemden bağımsızdır.

## 2. Zemin etüdü ve mimari proje

Yeni yapı için zemin etüdü yaptırılır ve mimari proje hazırlanır. Çelik karkas düşünülüyorsa bunu mimari aşamada bilmek önemlidir: kolon aksları, kat yükseklikleri ve döşeme sistemi çeliğe göre kurgulandığında hem malzeme hem süre açısından daha verimli bir yapı çıkar.

## 3. Statik proje ve ruhsat

Statik proje, yetkili inşaat mühendisi tarafından Türkiye Bina Deprem Yönetmeliği ve Çelik Yapılar Yönetmeliği'ne göre hazırlanır. Ruhsat süreci diğer yapılarla aynıdır; çelik taşıyıcı sistem ayrı bir izin gerektirmez.

## 4. Atölye imalatı temel ile aynı anda

Çeliğin şantiyeye en büyük katkısı buradadır. Proje onaylandığında elemanlar **atölyede** üretilmeye başlar. Aynı günlerde sahada kazı ve betonarme temel yapılır. İki iş birbirini beklemez.

## 5. Sevkiyat ve montaj

Dar sokakta en zor konu lojistiktir. Elemanların boyu ve ağırlığı, sokağa girebilecek araç ve kurulabilecek vince göre imalat aşamasında planlanır. Montaj kurudur: kalıp, beton dökümü ve priz beklemesi yoktur. Bu, komşu yapılara ve sokağa verilen rahatsızlığın süresini kısaltır.

## 6. Döşeme, cephe ve ince işler

İskelet tamamlandıktan sonra döşemeler (çoğunlukla trapez sac üzeri beton), cephe ve tesisat işleri başlar. Bu aşamalar betonarme yapıdakine benzer sürelerde ilerler.

## Dikkat edilecek noktalar

- **Yangın koruması** bütçeye baştan konmalıdır; konut yapılarında taşıyıcı çelik belirli bir süre yangına dayanacak biçimde korunur.
- **Ses ve titreşim** konforu döşeme sistemi seçimiyle sağlanır.
- **Komşu yapılar** bitişik nizamda kazı sırasında korunmalıdır; bu, taşıyıcı sistemden bağımsız bir mühendislik konusudur.

## Çelik her parselde doğru seçim mi?

Hayır. Küçük ve basit yapılarda betonarme daha ekonomik çıkabilir. Çelik; sürenin kritik olduğu, parselin dar, zeminin zayıf ya da açıklıkların büyük olduğu durumlarda öne çıkar. Doğru karar, iki sistemin aynı proje üzerinde karşılaştırılmasıyla verilir.

*Bu yazı genel bilgilendirme amaçlıdır; hukuki ve teknik kararlar için ilgili uzmanlara danışın.*$md$),
  ('celik-yapi-tasariminda-temel-mevzuat', 'Çelik yapı tasarımında temel mevzuat: TBDY 2018, Çelik Yapılar Yönetmeliği ve EN 1090', 'Türkiye''de bir çelik yapının tasarımını, malzemesini ve imalatını hangi yönetmelik ve standartlar belirler? Kısa bir yol haritası.', 'mevzuat', 4, 16,
$md$Bir çelik yapı teklifinde ya da teknik şartnamede karşınıza çıkan kısaltmalar kafa karıştırabilir. Bu yazı, Türkiye'de çelik taşıyıcı sistemleri doğrudan ilgilendiren temel düzenlemeleri ve her birinin neyi kapsadığını özetler.

## Türkiye Bina Deprem Yönetmeliği (TBDY 2018)

1 Ocak 2019'da yürürlüğe giren yönetmelik, deprem etkisi altındaki tüm binaların tasarım kurallarını belirler. Çelik yapılar için taşıyıcı sistem türlerini (moment aktaran çerçeveler, merkezi ve dışmerkez çaprazlı çerçeveler), süneklik düzeylerini ve birleşimlere ilişkin özel koşulları tanımlar. Deprem tehlikesi, yapının koordinatına göre Türkiye Deprem Tehlike Haritası'ndan alınır.

## Çelik Yapıların Tasarım, Hesap ve Yapım Esaslarına Dair Yönetmelik

Çelik elemanların ve birleşimlerin nasıl boyutlandırılacağını düzenler: çekme, basınç, eğilme, kesme, birleşik etkiler, bulonlu ve kaynaklı birleşimler, kompozit elemanlar. Tasarımcıya iki yöntem sunar: yük ve dayanım katsayıları ile tasarım (YDKT) ve güvenlik katsayıları ile tasarım (GKT). TBDY ile birlikte kullanılır.

## Yük standartları

Yapıya etkiyen yükler ayrı standartlardan gelir: sabit ve hareketli yükler için TS 498, kar yükü için TS EN 1991-1-3, rüzgâr yükü için TS EN 1991-1-4. Hafif çelik çatılarda kar ve rüzgâr çoğu zaman belirleyici yüklerdir.

## Malzeme: TS EN 10025

Yapısal çeliklerin kalitelerini tanımlar. S235, S275 ve S355 adlarındaki sayı, çeliğin akma dayanımını (N/mm²) gösterir. Hangi kalitenin kullanılacağı statik projede belirtilir; malzeme, üretici sertifikasıyla (çoğunlukla EN 10204'e göre 3.1 belgesi) teslim alınır.

## İmalat: TS EN 1090

Yapısal çelik bileşenlerin imalatını ve uygunluk değerlendirmesini düzenler.

- **EN 1090-1:** yapısal bileşenlerin CE işareti taşıması için gereken uygunluk değerlendirmesi
- **EN 1090-2:** çelik yapıların imalat ve montajına ilişkin teknik kurallar; **uygulama sınıfları** (EXC1–EXC4) imalat ve kontrol düzeyini belirler

Kaynaklı imalatta kaynakçı ve yöntem belgelendirmesi (ör. EN ISO 9606, EN ISO 15614) ile kalite gereklilikleri (EN ISO 3834) bu çerçevenin parçasıdır.

## Yangın

Taşıyıcı elemanların yangına dayanım süreleri Binaların Yangından Korunması Hakkında Yönetmelik'e göre, yapının kullanım sınıfı ve yüksekliğine bağlı olarak belirlenir.

## Pratikte ne işe yarar?

Bir teklif ya da sözleşmeyi değerlendirirken şu soruları sorabilirsiniz:

- Statik proje hangi yönetmeliklere göre hazırlandı?
- Çelik kalitesi nedir ve malzeme sertifikası verilecek mi?
- İmalat hangi uygulama sınıfına göre yapılacak, kaynak kontrolleri nasıl belgelenecek?
- Yangın koruması teklife dahil mi?

*Bu yazı genel bilgilendirme amaçlıdır ve yayın tarihindeki düzenlemeleri özetler. Güncel metinler için Resmî Gazete ve TSE yayınlarına başvurun; tasarım kararları yetkili mühendise aittir.*$md$)
) as t(s, t, e, c, m, o, b)
where not exists (select 1 from public.blog_posts);
