# Kararlar ve Gerekçeleri

> Bu dosya, projede alınan mimari ve ürün kararlarını **gerekçeleriyle** kaydeder.
>
> **Bir kararı değiştirmeden önce buradaki gerekçeyi okuyun.** Çoğu karar, farkında olmadığınız bir sorunu çözmek için alındı. Değiştirmek gerekiyorsa kaydı güncelleyin, silmeyin — eski kararı "değiştirildi" olarak işaretleyin.
>
> 🔴 = MSSQL geçişinde etkilenecek karar

---

## Altyapı

### K-01 · Hosting: Vercel
Next.js'in kendi platformu. ISR, Edge middleware ve görsel optimizasyonu yerleşik. GitHub push ile otomatik dağıtım.
**Alternatif reddedildi:** cPanel/paylaşımlı hosting — Node.js desteği sınırlı, ISR ve Server Actions çalışmaz.

### K-02 🔴 · Veritabanı: Supabase (Postgres), sonra MSSQL
Proje Supabase ile ayağa kalkacak, ileride firmanın kendi MSSQL sunucusuna taşınacak.
**Bunun bedeli var:** Supabase'in altı hizmeti kullanılıyor (Postgres, Auth, Storage, Realtime, RLS, pg_cron); MSSQL yalnız birini karşılıyor. Geçişi mümkün kılmak için depo arayüzleri, `core/auth`, `core/storage`, `core/realtime` soyutlamaları kuruldu ve **yetkilendirme yalnız RLS'e bırakılmadı**.
**Maliyet:** geliştirme ~%10-15 yavaş. Karşılığında geçiş birkaç haftalık iş; önlemsiz gidilse yeniden yazıma yaklaşırdı.
→ Ayrıntı: [`architecture/01-OVERVIEW.md`](architecture/01-OVERVIEW.md)

### K-03 · Mimari: Modüler monolit, mikroservis değil
Tek Next.js uygulaması, içi dikey dilimlenmiş bağımsız modüller.
**Neden mikroservis değil:** Bu ölçekte ağ gecikmesi, dağıtık işlem karmaşıklığı ve 30+ ayrı dağıtım getirirdi. Fayda yok, zarar var.

### K-04 · Ekip sınırları ESLint ile zorlanır
Modüller yalnız `index.ts` üzerinden konuşur; derin import derleme hatası verir.
**Neden:** Denetlenmeyen mimari kuralı birkaç hafta içinde çürür. Kural yazmak yetmez, makine zorlamalı.

---

## Dil ve İçerik

### K-05 🔴 · Çeviri: JSONB kolonlar, ayrı çeviri tablosu değil
`title jsonb = {"tr": "...", "en": "..."}`
**Neden:** Ayrı `_translations` tabloları her sorguya JOIN ekler ve admin panelini karmaşıklaştırır. JSONB ile admin'de her alan basit bir TR/EN sekmesi olur.
**MSSQL karşılığı:** `NVARCHAR(MAX)` + `JSON_VALUE` + hesaplanmış kalıcı kolon üzerinde unique indeks.

### K-06 🔴 · Slug için locale başına B-tree ifade indeksi (GIN değil)
```sql
create unique index projects_slug_tr_uq on projects ((slug->>'tr'))
  where slug->>'tr' is not null;
```
**Neden GIN değil:** GIN benzersizlik uygulayamaz. İki projenin aynı Türkçe slug'ı almasını yalnız bu indeks engeller.
**Dikkat:** Sorgu ifadesi indekstekiyle birebir aynı yazılmalı, yoksa Postgres indeksi kullanmaz.

### K-07 · `published_locales text[]` — "yayında" ≠ "çevrildi"
Bir proje Türkçe yayındayken İngilizce çevirisi hazırlanıyor olabilir.
**Karar:** İngilizce çeviri yoksa `/en/...` adresi **404 verir**. Türkçe içerik İngilizce URL'de gösterilmez.
**Neden:** Çevrilmemiş içeriği diğer dilde göstermek ince içerik/çift içerik cezası getirir ve hreflang'i geçersiz kılar.

### K-08 · Çeviri: makine taslağı + zorunlu insan onayı
Claude API terim sözlüğüyle taslak üretir, `translation_meta` sarı rozet alır, onaylanmadan yayınlanmaz.
**Neden tam otomatik değil:** Teknik terimler bozulur ("körkasa" kelimesi kelimesine çevrilirse anlamsız), SEO anahtar kelimesi çeviriyle değil araştırmayla belirlenir.
**Otomatik çeviri kapalı olanlar:** KVKK, gizlilik, çerez, kullanım koşulları, mail şablonları — hukuki sorumluluk taşır.

### K-09 · Slug otomatik çevrilmez
İngilizce slug elle girilir.
**Neden:** SEO anahtar kelimesi çeviri değil araştırma işidir. `celik-konstruksiyon` → `steel-construction` doğru olabilir ama `steel-frame-construction` daha çok aranıyor olabilir.

### K-10 · İngilizce kapsamı seçili sayfalarla sınırlı
Ana sayfa, hizmetler, ürünler, hakkımızda, iletişim zorunlu. Blog ve projeler isteğe bağlı.
**Neden:** Her içeriği iki dilde yazma zorunluluğu pratikte içerik üretimini durdurur. `published_locales` sayesinde çevrilmeyen içerik İngilizce sitede hiç görünmez — yarım site izlenimi oluşmaz.

---

## Routing

### K-11 · Klasör adları İngilizce, URL'ler Türkçe
`app/[locale]/services/[slug]` klasörü, `next-intl` pathnames ile `/tr/hizmetler/...` üretir.
**Neden:** macOS büyük/küçük harfe duyarsız, Vercel'in Linux build makinesi duyarlı. `hakkımızda` gibi Türkçe karakterli klasör adları bu ikisi arasında kırılır.

### K-12 · `/admin` locale dışında, route'ları İngilizce
`app/admin/products` → `/admin/products`, sayfa başlığı "Ürünler".
**Neden:** next-intl middleware `/admin`'e dokunmaz; aksi hâlde `/admin → /tr/admin` yönlendirmesiyle auth kapısını kırardı. Pathnames eşlemesi olmadığı için klasör adı doğrudan URL olur — İngilizce tutmak kod tutarlılığını korur.

### K-13 · Middleware: Supabase önce, çerezler sona
Supabase oturum yenileme next-intl'den önce çalışır, ama yazdığı çerezler bir diziye toplanıp **en sonda dönülen yanıta** basılır.
**Neden:** next-intl kendi yanıtını döndürdüğünde yenilenmiş oturum çerezleri sessizce kaybolur ve *kullanıcılar saatte bir kendiliğinden çıkış yapar*. Teşhisi çok zor bir hata.

### K-14 🔴 · Middleware yetkilendirme değildir
Üç katman: middleware (deneyim) → sunucu bileşeni rol kontrolü (kapı) → RLS (gerçek sınır).
**Neden:** CVE-2025-29927 middleware'in tamamen atlanabildiğini gösterdi.
**MSSQL notu:** RLS kaybolduğunda güvenlik açığı oluşmaması için servis katmanındaki yetki kontrolü **eksiksiz** yazılır.

### K-15 · `slug_history` + 308 yönlendirme
Editör slug'ı değiştirdiğinde eski adres kalıcı yönlendirmeyle yenisine gider.
**Neden:** Slug değişimi SEO değerini sıfırlar. Tarih tabanlı URL (`/blog/2026/09/...`) **kullanılmıyor** — içerik güncellendiğinde adres eskimiş görünür ve taşımak imkânsızlaşır.

### K-16 · Türkçe slug üretiminde `toLowerCase()` yasak
`'I'.toLowerCase('tr')` → `'ı'`, `'İ'.toLowerCase()` → `i` + birleşen nokta.
**Karar:** Açık harf çevrim tablosu (ç→c ğ→g ı→i İ→i ö→o ş→s ü→u) → ASCII süzme → veritabanında `CHECK` kısıtı son emniyet.

### K-17 · Rezerve slug listesi
`{kategori, category, etiket, tag, arama, search, sayfa, page, 403, api}`
**Neden:** `/projeler/kategori/[slug]` ile `/projeler/[slug]` kardeş route. Slug'ı `kategori` olan bir proje erişilemez hâle gelir.

---

## Ön Yüz

### K-18 · Ortalanmış logo: `grid-template-columns: var(--nav-edge) 1fr var(--nav-edge)`
**Neden `auto 1fr auto` değil:** Sol ve sağ hücreler eşit genişlikte olmazsa logo piksel hassasiyetinde ortalanmaz.

### K-19 · 1120px altında drawer'a düşülür
**Neden:** Türkçe menü etiketleri uzun ("Çelik Konstrüksiyon Sistemleri"); 1024–1280px arasında logoya çarpıyor.

### K-20 · Mobilde ScrollTrigger `pin` kullanılmaz
**Neden:** Adres çubuğu gizlenip görününce viewport yüksekliği değişir, pin kayar. Ayrıca `100vh` yerine `100dvh` kullanılır.

### K-21 · `gsap.matchMedia()` zorunlu, elle `window.innerWidth` yasak
**Neden:** Kırılım değiştiğinde GSAP eski animasyonları otomatik temizler. Elle kontrol orientation değişiminde sızıntı yapar.

### K-22 · Açılış loader'ı yok, aşamalı gösterim var
Poster görseli ilk boyada LCP olarak gelir, video arkada yüklenip çapraz geçişle devralır.
**Neden:** Loader LCP'yi geciktirir ve arama motoru botunun içeriği beklemesine yol açar. Poster ile videonun ilk karesi aynı olacağı için geçiş fark edilmez.

### K-23 · Konfigüratör kendi route grubunda, Lenis'siz
**Neden:** Lenis'in yumuşak scroll'u React Three Fiber canvas'ıyla çakışıyor. Ayrıca kendi `error.tsx`'i var: WebGL desteklenmeyen cihazda çökmek yerine statik galeri + iletişim formu gösteriyor.

### K-24 · Three.js yalnız konfigüratörde, dinamik import
**Neden:** Three.js + R3F ~600 KB. Ana sayfaya girerse performans bütçesi (150 KB) anında aşılır.

---

## İçerik Yapısı

### K-25 · Hizmet ve ürün ikisi de var, farklı açıdan
Körkasa, Kutu Profil ve Hafif Çelik hem hizmet hem ürün olarak yer alıyor.
**Risk kabul edildi:** Çift içerik riski var. Dört kural bunu güvenli kılıyor:
1. Odak anahtar kelimeler farklı olmak zorunda (hizmet: `kutu profil montajı`, ürün: `kutu profil ölçüleri`)
2. Aynı paragraf iki sayfaya kopyalanamaz — %60 üstü örtüşmede uyarı
3. Karşılıklı iç bağlantı zorunlu
4. Her sayfa kendine canonical verir

**Ayrım:** Hizmet = *"nasıl uyguluyoruz"* · Ürün = *"ne satıyoruz"*

### K-26 · Çözüm sayfaları ayrı içerik tipi
8 bölümlü SEO iniş sayfası şablonu (hero, problem, karşılaştırma, avantajlar, teknik dayanak, örnek projeler, SSS, CTA).
**Neden blog değil:** Blog yazıları zamanla eskir; hizmet iniş sayfaları kalıcı olmalı.

### K-27 · Mağaza var, satın alma yok
Ürünler sergilenir, sepet ve ödeme yoktur; her ürün teklif talebine dönüşür.
**Teklif sepeti:** Birden fazla ürün biriktirilip tek teklifle istenir. localStorage'da tutulur, üyelik gerekmez.

### K-28 · `faqs` tek polimorfik tablo
`entity_type` + `entity_id` (boş = genel SSS sayfası).
**Neden:** Başlangıçta `faqs` ve `solution_faqs` diye iki tablo vardı — aynı işi yapıyorlardı. Tek tablo, SSS bloğunun hizmet/ürün/çözüm/proje sayfalarında aynı şekilde çalışmasını sağlıyor. Ek fayda: SSS formatı AI aramalarında en çok alıntılanan yapı.

---

## Konfigüratör

### K-29 · Üyelik kapısı: fiyat + kaydetme + PDF
3D model, ölçü değiştirme ve metraj/tonaj herkese açık.
**Neden bu üçü:** Ziyaretçi değeri görmeden kayıt olmaz. Karartılmış önizleme (blur'lu fiyat kutusu) değerin varlığını hissettirip kayıt motivasyonu yaratıyor.

### K-30 · Anonim kayıt + devralma
Misafir e-posta bırakarak kaydedebilir; `public_token` ile erişir. Aynı e-postayla sonradan üye olursa kayıtlar hesabına devredilir.
**Güvenlik:** Anonim kayıtlara doğrudan tablo erişimi yok — yalnız token alan `security definer` RPC üzerinden.

---

## Mali

### K-31 · Tevkifat opsiyonel alan (2/10 – 10/10)
Yapım işlerinde tipik oran 4/10.
**Neden opsiyonel:** Her faturada uygulanmaz, alıcının niteliğine bağlı. Varsayılan kapalı, gerektiğinde işaretlenir.

### K-32 · Çoklu para birimi: işlem tarihindeki kur kayda yazılır
₺ / USD / EUR. Her kayıtta `para_birimi` + `kur` + `₺_karşılığı` saklanır.
**Neden:** Çelik fiyatları dövize endeksli. Kur kaydedilmezse geçmiş kayıtların değeri bugünkü kurla hesaplanır ve tarihsel raporlar bozulur.

### K-33 · Maliyet ve kâr alanları RLS seviyesinde gizli
`sales` rolü fiyat görür, maliyet göremez.
**Neden:** Arayüz atlatılsa bile veri gelmemeli. Satış personeli kâr marjını görmemeli.

### K-34 · KVKK silme hakkı → anonimleştirme
Faturası olan müşteri "verilerimi silin" derse: kişisel alanlar maskelenir, fatura kaydı vergi kimliğiyle saklanır.
**Neden:** VUK ticari kayıtların 5 yıl saklanmasını zorunlu kılıyor. Tam silme yasal zorunlulukla çakışır. `profiles` kaydı tamamen silinir; bu ayrım KVKK aydınlatma metnine yazılacak.

---

## SEO ve Görünürlük

### K-35 · AI tarayıcılarına tam izin
`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `CCBot`, `Applebot-Extended` açık + `llms.txt`.
**Bedeli:** İçerik AI eğitiminde kullanılabilir. **Karşılığı:** AI aramalarında kaynak gösterilebilirlik — bu sektörde hızla büyüyen trafik kaynağı.

### K-36 · Admin `X-Robots-Tag: noindex` ile korunur
**Neden yalnız robots.txt yetmez:** `Disallow` taramayı engeller, **indekslemeyi engellemez**. Google başka yerden bağlantı bulursa adresi açıklamasız indeksleyebilir. HTTP başlığı güvenilir yöntem; ikisi birlikte kullanılıyor.

### K-37 · Etiket sayfaları 5 yazıdan azsa `noindex, follow`
**Neden:** İnce içerik arşivleri indeks şişmesinin bir numaralı kaynağı.

### K-38 · Öksüz sayfa denetimi
Hiçbir yerden iç bağlantı verilmeyen sayfa Google tarafından nadiren indekslenir. Admin'de rapor + Bitti Tanımı maddesi.

### K-39 · GA4 + Google Ads + Meta Pixel, çerez onayına bağlı
Onay yoksa script hiç yüklenmez.
**Neden:** KVKK/GDPR şartı. Ayrıca üçüncü parti script yükü performans bütçesine dahil edilip Lighthouse'ta izleniyor.

---

## Kalite

### K-40 · Sıfır statik veri
Ön yüzde görünen hiçbir içerik koda gömülmez.
**Tek istisna:** arayüz mikro-metinleri `next-intl` mesaj dosyalarında (performans), `ui_translations` tablosundan override edilebilir.

### K-41 · Her faz dikey dilim
Bir özelliğin ön yüzü ve admin karşılığı aynı fazda biter.
**Neden:** İlk planda admin 12. fazdaydı; o sırayla iş Faz 11'de dursa *yönetilemeyen* bir site kalırdı — içerik eklenemez, talep görülemezdi.

### K-42 · Beklenen hatalar fırlatılmaz, `Result<T,E>` ile döner
**Neden:** Verisi gelmeyen bir bölüm sayfayı çökertmemeli. Fırlatma yalnız programcı hataları için.

### K-43 · Modül kapatma anahtarı (kill switch)
`/admin/settings/modules` — canlıda sorun çıkaran modül dağıtım yapmadan kapatılır.

### K-44 · Oturum kaydı (session replay) yok
Sıcaklık haritası, öfke tıklaması ve form analizi "tıkanma" noktalarını zaten gösteriyor.
**Neden reddedildi:** Depolama hızla büyür, KVKK riski yüksek, +2 faz.

---

### K-45 · Depo public kalacak
`github.com/davutakbulut/DVT-clk-yapi-group` herkese açık.
**Bilinen bedeli:** Fiyatlandırma yaklaşımı, kâr marjı mantığı, tevkifat kurgusu ve iş stratejisi rakiplere açık. Ürün sahibi bunu değerlendirip public kalmasına karar verdi.
**Zorunlu sonuç:** Gerçek anahtar, şifre veya müşteri verisi **hiçbir koşulda** repoya girmez. `.env.example` yalnız placeholder içerir; GitHub secret scanning açık tutulur.

---

### K-46 · ISR: yayındaki tüm slug'lar build'de ön-üretilir
`generateStaticParams` her içerik tipinde yayındaki **tüm** slug'ları döndürür. Veri katmanı her zaman `unstable_cache` + etiketle önbelleklidir.
**Neden:** Faz 1 deneyi gösterdi ki next-intl rewrite'ı (`/tr/projeler/x` → `/tr/projects/x`) ön-üretilmiş sayfalarda ISR'ı korur, ama build'de var olmayan bir slug rewrite üzerinden **hiç önbelleğe yazılmaz** — her istekte yeniden render edilir (`Cache-Control: private, no-store`). İç yolu önceden ısıtmak da çözmez. İlk plandaki yedek ("ön üretimden vazgeç, yalnız on-demand") tam ters yöndeydi.
**Bilinen bedeli:** Son dağıtımdan sonra yayınlanan yeni içerik, bir sonraki dağıtıma kadar her ziyarette sunucuda render edilir. Veri önbellekli olduğu için maliyet bir DB sorgusu değil, bir React render'ıdır. Yoğun içerik girişinde "yayınla → Vercel deploy hook (gecikmeli, toplu)" seçeneği Faz 7'de değerlendirilir.
**Açık kalan:** Sonuç `next start` içindir; Vercel kenarında ilk dağıtımda ölçülür. Kanıt: `docs/architecture/06-ASSUMPTION-EXPERIMENTS.md`.

### K-47 · Docker'sız veritabanı akışı: PGlite testleri + uzak geliştirme projesi
Yerel `supabase start` (Docker) kullanılmaz. Migration'lar elle yazılır; **PGlite** (süreç içi gerçek Postgres) üzerinde Vitest ile test edilir; ardından ayrı bir **geliştirme** Supabase projesine, doğrulandıktan sonra **üretim** projesine `db push` edilir.
**Neden:** Geliştirme makinesinde Docker yok ve kurulması istenmedi. PGlite, RLS'in dayandığı üç şeyi de destekliyor (`set role`, politika değerlendirmesi, `request.jwt.claims`) — 108 test 83 tabloyu yedi ayrı veritabanında sıfırdan kurup ~4 saniyede koşuyor; `db reset` + pgTAP döngüsü dakikalar sürerdi. CI'da da gizli anahtar gerekmiyor.
**Bilinen bedeli:** `db diff` yok (zaten elle yazıyoruz). Auth akışları, Storage politikaları ve Realtime PGlite'ta taklit edilemez — yalnız uzak projede doğrulanır.
**Güncelleme (2026-09-18):** Ücretsiz planda 2 aktif proje sınırı dolu olduğundan ayrı geliştirme projesi yok; yayına (Faz 12) kadar `clk-yapi-group` projesi geliştirme ortamıdır (içinde canlı veri yok). Yayından önce ayrı bir geliştirme projesi açılır. `db push` hedefi makinece doğrulanır (`scripts/db-push.mjs`) — aynı hesapta başka uygulamaların canlı veritabanları var. PGlite Postgres 18, Supabase 17: sürüme özgü sözdiziminden kaçınılır.
**Yan kazanç:** Uzantı olmadığı için şema uzantısız kaldı → MSSQL geçişinde (K-02) bir engel daha az.

### K-48 · Şema sözleşmeleri prosedürle uygulanır, yetkiler açıkça verilir
Tekrarlayan DDL (`updated_at` tetikleyicisi, slug indeksleri, yayın kolonları, RLS politikaları) `app_private` şemasındaki prosedürlerle eklenir. Her tabloda önce platformun varsayılan yetkileri **geri alınır**, sonra yalnız gereken yetki verilir.
**Neden:** 83 tabloda elle tekrar, bir tabloda `with check`'in ya da EN slug indeksinin unutulmasını garanti eder. Açık yetki ise çift kemerdir: Supabase yeni tabloyu varsayılan olarak API rollerine tam yetkili açar; RLS tek savunma olmamalı.
**Bilinen bedeli:** Kolonların bir kısmı `create table` içinde görünmez (`call app_private.publishable(…)` ile gelir). Karşılığı: `npm run db:report` katalogdan tam görünümü üretir.

### K-49 · Medya boru hattı: build dışı betikle WebP varyantları, Storage'da düz dosya
Görseller yükleme anında (Faz 3'te betikle, Faz 5'ten sonra admin yükleyicisiyle) **sharp** ile WebP'ye çevrilir: 480/960/1440 px varyantlar + en çok 1920 px tam boy + 16 px blur yer tutucu (`blur_data_url`). Yollar `media_library.variants` JSONB'de tutulur; ön yüz `core/storage.mediaSrcSet` ile `srcset` kurar. Kayıt id'si içerik hash'inden türetilir; betik yeniden koşunca aynı dosya aynı kaydı günceller.
**Neden:** Supabase görsel dönüştürme API'si Pro plana bağlı ve istek başına ücretli; `next/image` optimizasyonu ise Vercel'de kaynak görsel başına kota tüketir ve ilk isteği yavaşlatır. Dönüşümü bir kez yapıp CDN'e düz dosya koymak hem ücretsiz planda çalışır hem MSSQL/başka depolamaya taşınırken (K-02) hiçbir platform özelliğine bağımlı değildir.
**Bilinen bedeli:** Yeni bir kırılım genişliği gerekirse tüm görseller yeniden işlenir (betik zaten yeniden çalıştırılabilir). Depolama ~2× (tam boy + varyantlar); 166 dosya için ~105 MB, ücretsiz planın 1 GB sınırının çok altında.
**Kapsam dışı:** Video kodlama — ffmpeg geliştirme makinesinde yok; poster kareleri ve mobil/masaüstü ayrı encode Faz 6'da (hero) ele alınır. Kaynak dosyalar `assets/` altında git dışı arşiv olarak kalır.

### K-50 · Menü öğesi, route'u olmadan gösterilmez
`menu_items.internal_path` yalnız `src/i18n/routing.ts` içindeki `pathnames` anahtarlarından biriyse render edilir; aksi hâlde öğe (ve boş kalan üst başlığı) sessizce düşer. Menü yapısı (0014) baştan tam yazılır; her faz kendi route'unu ekleyince ilgili bağlantı kendiliğinden görünür.
**Neden:** Sayfası olmayan bağlantı ölü bağlantıdır (404) — "öksüz sayfa yok" kuralının tersi. Menüyü faz faz seed etmek ise panelden yapılmış düzenlemeyle çakışır; yapıyı bir kez yazıp süzmek iki sorunu da çözer.
**Bilinen bedeli:** Faz 4 sonunda header'da yalnız marka, dil değiştirici ve (kapalı) CTA görünür; menü Faz 7–11 boyunca dolar. Süzme `buildMenuTree` içinde tek yerdedir ve testle kilitlidir.

### K-51 · Panelde service-role yok: davet OTP bağlantısıyla; modül API'si `index.ts` + `server.ts`
Kullanıcı daveti `auth.admin.inviteUserByEmail` (service-role) yerine `signInWithOtp({ shouldCreateUser: true })` ile yapılır: kişi e-postadaki bağlantıyla girer, profili `member` olarak oluşur, rolü super_admin panelden atar. Modüllerin dış API'si ikiye ayrılır: `index.ts` istemci bileşenlerine de inebilen ihracatlar (bileşenler, Server Action'lar, saf yardımcılar), `server.ts` yalnız sunucuda çalışan veri katmanı (`next/headers`).
**Neden:** Kural 4 service-role anahtarını istekle erişilebilen hiçbir yerde istemiyor; davet için de istisna açılmadı. `index.ts`'e sunucu-yalnız kod girince istemci bileşeni (`error.tsx`) onu içe aktardığında derleme kırıldı; iki giriş noktası sınırı ESLint'te görünür kılar.
**Bilinen bedeli:** Davetli kişi ilk girişte `member`dır; rol ataması ikinci adımdır (panelde tek tıkla). İki giriş dosyası: yeni modül iskeleti ikisini de açar.

---

## Değiştirilen Kararlar

*(Henüz yok. Bir karar değişirse buraya taşınır, gerekçesiyle.)*
