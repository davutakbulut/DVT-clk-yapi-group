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
Kullanıcı daveti `auth.admin.inviteUserByEmail` (service-role) yerine `signInWithOtp({ shouldCreateUser: true })` ile yapılır: kişi e-postadaki bağlantıyla girer, profili `member` olarak oluşur, rolü super_admin panelden atar. Modüllerin dış API'si üçe ayrılır: `index.ts` istemci bileşenlerine de inebilen ihracatlar (bileşenler, saf yardımcılar), `server.ts` yalnız sunucuda çalışan veri katmanı (`next/headers`), `actions.ts` Server Action'lar (doğrudan içe aktarılır; barrel üzerinden yeniden dışa aktarım üretim paketinde referansı düşürüyor — Faz 5'te E2E yakaladı).
**Neden:** Kural 4 service-role anahtarını istekle erişilebilen hiçbir yerde istemiyor; davet için de istisna açılmadı. `index.ts`'e sunucu-yalnız kod girince istemci bileşeni (`error.tsx`) onu içe aktardığında derleme kırıldı; iki giriş noktası sınırı ESLint'te görünür kılar.
**Bilinen bedeli:** Davetli kişi ilk girişte `member`dır; rol ataması ikinci adımdır (panelde tek tıkla). İki giriş dosyası: yeni modül iskeleti ikisini de açar.

### K-52 · Tarayıcıda Supabase istemcisi yok; oturum özeti `/api/me`
İstemci bileşenleri oturum durumunu `@supabase/ssr` tarayıcı istemcisiyle değil, çerezli `/api/me` uç noktasından (ad + personel mi) okur. Giriş action'ı `redirect()` yerine `redirectTo` döner; form tam sayfa yönlendirmesi yapar.
**Neden:** Tek oturum yöneticisi sunucudur (middleware yeniler, Server Action yazar). Tarayıcıda ikinci bir istemci aynı çerezi yönetmeye kalkınca yarış ve hata ayıklama yüzeyi büyür; anon anahtarla istemciden veri çekmek de "veri sunucuda" kuralını (K-46) gevşetirdi. Action içi 303 yönlendirmesi + RSC gezinmesinde Set-Cookie'nin uygulanma sırası tarayıcıya bağlı; tam sayfa yönlendirme kesin.
**Bilinen bedeli:** Header'da hesap durumu bir ek `fetch` ile gelir (private, no-store); `pageshow` ile tazelenir. Realtime gibi istemci-tarafı abonelikler gerektiğinde (Faz 10 bildirimler) ayrı, salt-okunur bir istemci kararı verilir.

### K-53 · Zengin metin v1'de Markdown: sunucuda render, izinli etiket kümesi
İçerik gövdeleri (hakkımızda, hizmet, blog…) veritabanında Markdown olarak tutulur; `src/lib/markdown.ts` başlık (h2–h4), paragraf, liste, kalın/italik, bağlantı, alıntı ve çizgiyi HTML'e çevirir. Her metin parçası kaçırılır, yalnız `https:`/`/`/`mailto:`/`tel:` href'leri kabul edilir; çıktı `dangerouslySetInnerHTML` ile basılır. Tiptap/editör yok.
**Neden:** Blok editörü (Tiptap + JSON şema) v1'de 1 hafta iş ve ayrı bir bağımlılık kümesi; içerik ekibi bir kişi. Markdown veritabanında taşınabilir (K-02), diff'lenebilir, çeviri makinesine düz metin olarak verilebilir; sanitize edilmiş küçük bir dönüştürücü XSS yüzeyini kapalı tutar.
**Bilinen bedeli:** Tablo, görsel yerleştirme ve iç içe liste yok; gerektiğinde Faz 9 (blog) ya da Faz 18'de editör kararı yeniden açılır — depolama biçimi değişmeden.

### K-54 · Tasarım rehberleri depoda, tasarım sistemi kararı tek dosyada
`.claude/skills/ui-ux-pro-max` (GitHub'ın en çok yıldızlı tasarım skill'i — kural indeksi; Python arama motoru ve CSV'leri depoya alınmadı, plugin kurulumuyla gelir) ve `.claude/skills/frontend-design` (Anthropic) proje skill'i olarak eklendi. Aracın `--design-system` çıktısı marka prototipiyle birleştirilip `references/clk-design-system.md` MASTER dosyasına yazıldı; ön yüz tasarım işi bu dosyayla başlar.
**Neden:** Faz 6'da ürün sahibi tasarımı yetersiz buldu; sorun ön yüzün boş olması (yalnız "Yapım aşamasında") kadar tasarım kararlarının yazılı olmamasıydı. Araç önerilerinden markayla çelişenler (ikinci vurgu rengi "safety orange", Plus Jakarta Sans) açıkça reddedildi; marka prototipi kazanır.
**Bilinen bedeli:** Skill metinleri üst kaynaktan kopya; güncellemesi elle. Tam veri tabanlı arama için `/plugin install ui-ux-pro-max@ui-ux-pro-max-skill` gerekir.

### K-55 · Başlangıç içeriği: tanımlayıcı metin seed edilir, iddia edilmez
Hero, hakkımızda ve hizmet açıklamaları gibi **tanımlayıcı** metinler migration'la başlangıç içeriği olarak yazılır (yalnız tablo boşsa, yalnız TR yayında, EN makine taslağı onaysız). Müşteri yorumu, proje, ekip üyesi, sertifika, fiyat gibi **iddia** taşıyan veriler boş başlar; sayısal istatistik seed edilmez.
**Neden:** Boş bir site tasarım kalitesini görünmez kılar (Faz 6'da ürün sahibi "tasarım rezalet" dedi — sayfa yalnız "Yapım aşamasında" idi). Hizmet açıklaması firmanın ne yaptığını anlatır, doğrulanması gereken bir olgu öne sürmez; prototipteki brief de aynı metinleri içerir. Yorum/proje/sertifika ise gerçek dünyada karşılığı olmayan bir iddiaya dönüşür.
**Bilinen bedeli:** `conventions.test.ts` "boş başlar" listesinden `services` çıkarıldı; ürün sahibi hizmet metinlerini panelden gözden geçirmeli (yayından kaldırabilir).

### K-56 · Service-role yalnız cron işlerinde; ziyaretçi yazımı security definer RPC ile
`leads`, `email_queue`, `notifications` anonim yazıma kapalıdır. Ziyaretçi formu `submit_lead(jsonb)` **security definer** RPC'sine gider: doğrulama, talep, kuyruk satırları ve rol bildirimi tek transaction'da; anonim taraf tabloları görmez. Kuyruğu boşaltan cron (`/api/cron/mail`) `CRON_SECRET` ile korunan makine isteğidir ve `createServiceClient` (RLS'i atlar) yalnız `src/core/jobs/**` içinden çağrılır; ESLint başka her yerde içe aktarımı reddeder.
**Neden:** Kural 4 service-role'ü kullanıcı isteğiyle erişilen yollardan uzak tutar; formun kendisi RLS'in gerçek sınır kaldığı yoldur (RPC içi doğrulama + kısıtlar). Cron ise kullanıcı bağlamı olmayan bir iş: oturum yok, RLS'in koruyacağı "kim" yok. Alternatif (pg_cron + pg_net) uzantı gerektirir (K-47 uzantısızlık) ve mail sağlayıcı sırrını veritabanına taşırdı.
**Bilinen bedeli:** İki gizli anahtar (CRON_SECRET, SUPABASE_SECRET_KEY) Vercel ortamında tanımlanmalı; yerelde cron elle tetiklenir. Süreç içi hız sınırı tek instance'ı korur — üretimde Upstash beklenir.

### K-57 · AI tarayıcılarına açık izin; çerez onayı tek birinci-taraf çerezde
`robots.txt` yayın bayrağı açıkken GPTBot, ClaudeBot, PerplexityBot, ChatGPT-User, Google-Extended, CCBot, Applebot-Extended ve OAI-SearchBot'a **açıkça** izin verir; `/llms.txt` veritabanından site özeti sunar. Çerez onayı `clk_consent` adlı tek JSON çerezinde (sürüm, zorunlu=true, analitik, pazarlama, tarih; 180 gün, SameSite=Lax) tutulur; üçüncü taraf CMP yok.
**Neden:** 02-SEO: AI cevaplarında görünmek klasik SEO'dan ayrı hazırlık ister ve varsayılan şablonlar bu botları engeller. Onay için üçüncü taraf CMP (Cookiebot vb.) kendi scriptini ve çerezlerini getirir; KVKK'nın istediği şey açık onay + geri alınabilirlik — bunu 60 satırlık kendi bandımız karşılar ve onay durumu sunucuda da okunabilir (`cookies()`), Faz 23 analitik scriptlerini buna göre yükler.
**Bilinen bedeli:** Onay metni ve kategori listesi kendi bakımımızda; ileride "onay kaydı sunucuda tutulmalı" gereksinimi çıkarsa `consent_logs` tablosu eklenir (çerez sürümü v2).

### K-58 · Teklif sepeti tarayıcıda yaşar; kalem adları sunucuda dondurulur
Sepet oturum/hesap gerektirmez: `localStorage` (`clk_basket`) içinde ürün id + varyant id + miktar + not tutulur; sunucuya yalnız kimlikler ve miktar gider. `submit_lead` RPC'si ürün adını, ölçü etiketini ve stok kodunu **veritabanından** okuyup `lead_items` satırlarına anlık görüntü olarak yazar; taslak ya da silinmiş ürünler sessizce atlanır, 50 kalemden fazlası reddedilir.
**Neden:** Fiyat yok (K-27), dolayısıyla "sepet" bir alışveriş değil, bir teklif isteğinin kalem listesidir — misafir akışı doğal olanıdır ve veritabanına anonim sepet tablosu (temizlik, GDPR) eklemeyi gerektirmez. İstemciden gelen metinlere güvenmeyerek satış ekibi her zaman o anki gerçek katalog adını görür; ürün sonradan silinse bile talep okunabilir kalır.
**Bilinen bedeli:** Sepet cihaza bağlıdır (başka cihazda görünmez) ve JS ister; JS'siz kullanıcı ürün sayfasındaki "Teklif iste" bağlantısıyla tek ürün için form doldurur. Faz 19 CRM'de giriş yapan müşteri için sunucu sepeti eklenebilir.

### K-59 · Fiyat rehberi herkese açık, malzeme fiyat tablosu değil
`material_prices` anonime kapalıdır (0008, K-29: konfigüratörde fiyat üyeye özel). Fiyat rehberi ise bilinçli olarak herkese açık bir SEO sayfasıdır (01-PUBLIC-PAGES "Ton Fiyatları"). Çelişki `get_price_guide_by_slug` ile çözülür: **security definer** RPC yalnız `status='published'` ve o dilde yayındaki rehberin satırlarını, kaynak fiyat × min/max çarpan olarak **türetilmiş** biçimde döndürür; tablo, kod, not ve geçmiş dışarı çıkmaz. Rehber sayfasına `Offer`/`PriceSpecification` şeması eklenmez (aralık tahmindir, teklif değildir).
**Neden:** Alternatif, `material_prices`'a anonim SELECT açmaktı — o zaman işçilik, bağlantı ve kaplama fiyatları da (rehberde olmasa bile) herkese açılırdı. Definer RPC "ne yayınlandıysa o görünür" sınırını tam olarak çizer; fiyat bir yerde güncellenince rehber otomatik tazelenir (`touch_price_guide`), panel `stale_after_days` ile "bayat" uyarısı verir.
**Bilinen bedeli:** RPC'nin WHERE koşulu RLS yerine geçer — değiştirilirken `price-guides.test.ts` (taslak → null, anonim tablo → hata) yeşil kalmalı. Hesaplayıcının metraj girdisi Faz 23'e kadar analitiğe yazılmaz.

### K-60 · Yorum carousel'i yerel scroll-snap; Google yorumları "bekleyen" başlar
Carousel Embla yerine CSS `scroll-snap` + küçük bir istemci bileşeniyle yapılır: sürükleme, dokunma ve klavye kaydırma tarayıcıdan gelir; oklar, noktalar ve otomatik kayma (hover/odakta durur, `prefers-reduced-motion`'da başlamaz) bileşende. Google Places'tan çekilen yorumlar `pending` yazılır, metin/puan salt-okunurdur; yayın kararı insanındır. Rozet ve `AggregateRating` yalnız yayındaki yorumlardan, şema yalnız yorumun bağlı olduğu varlık sayfasında.
**Neden:** Embla ~8 KB gzip ve ayrı bir bağımlılık; istenen davranışların tamamı yerel kaydırmayla karşılanıyor ve erişilebilirlik (klavye, dokunma) tarayıcıdan gelir. Google yorumu herkese açık olsa da sitede hangi yorumların öne çıkacağı editoryal karardır (K-08 ile tutarlı); spam ya da alakasız yorumlar otomatik yayınlanmaz. Şema kapsamı 02-SEO'nun Google politikası notudur.
**Bilinen bedeli:** Sonsuz döngü (loop) yok — son karttan ilke "atlar". Google en çok 5 yorum döndürür; tam arşiv istenirse üçüncü taraf toplayıcı gerekir. Proje/ürün sayfalarında yorum bölümü slotu hazır, JSON-LD hizmetle başladı.

### K-61 · Kill switch bayrağı herkese açık; elle yönlendirmeler middleware'de bellekten
`modules.enabled` `is_public=true` olur: kapalı modülün route'u `notFound()` verir, menü bağlantısı `getMenu` içinde süzülür, ana sayfa bölümü render edilmez — üçü de aynı anonim okumaya dayanır. Elle yönlendirmeler (`redirects`) middleware'de uygulanır: liste `/api/redirects`'ten (etiketli önbellek, admin kaydedince düşer) 60 sn'de bir çekilip instance belleğinde tutulur; yalnız eşleşen isteklerde 301…410 döner ve isabet arka planda (`record_redirect_hit`, security definer) sayılır.
**Neden:** Bayrak gizli kalsaydı her sayfa sunucu oturumuyla okumak zorunda kalır ya da RPC gerekirdi; bayrağın kendisi sır değildir (sayfa zaten 404). Yönlendirme için her isteğe veritabanı yolculuğu eklemek CVE-2025-29927 sonrası "middleware ince kalsın" ilkesiyle çelişir; 60 sn'lik bellek listesi bunu sıfıra indirir. `next.config` redirects derleme zamanlıdır, editörün anında kaydetmesine izin vermez.
**Bilinen bedeli:** Yeni yönlendirme en geç 60 sn içinde (instance başına) etkinleşir; çok instance'lı Vercel'de her instance kendi saatini tutar. `record_redirect_hit` anonim çağrılabilir — yalnız sayaç artar, kötüye kullanım en fazla sayacı şişirir.

### K-62 · Para hesabı kuruş tamsayısıyla; durumlar türetilir; rol-duyarlı yazma
Satış, fatura ve tahsilat tutarları TypeScript'te kayan nokta yerine kuruş tamsayısı (kur çarpımında BigInt) ve yarım-yukarı yuvarlamayla hesaplanır — 0007'nin CHECK kısıtlarıyla (round(…, 2)) birebir. Hakediş ve fatura durumları tahsilatlardan `recalc_sale_payments` ile türetilir; "vadesi geçti" saklanmaz, `due_date < today` ile okunur. Satış kaydında admin temel tablolara (maliyet dahil), `sales` rolü maliyetsiz görünümlere yazar; gider tablosu sales için hiç yüklenmez.
**Neden:** 0,1 + 0,2 ≠ 0,3: kayan nokta ile hesaplanan toplam CHECK'e takılır ve satış kaydedilemez; kuruş tamsayısı deterministiktir. Türetilen durum, gece çalışan bir "vade kontrol" cron'una bağımlılığı kaldırır (cron dursa bile ekran doğru). Rol-duyarlı yazma K-33'ün "arayüzde gizlemek yetmez" ilkesinin uygulamasıdır: sales rolü maliyet kolonunu göremediği gibi yazamaz da (guard tetikleyicisi).
**Bilinen bedeli:** İki yol (tablo/görünüm) iki kod dalı demektir; test dosyaları her ikisini de sürer. Tevkifat oranı ve KDV hesabının vergi mevzuatına uygunluğu ürün sahibinin muhasebesince doğrulanır (K-31) — yazılım hesabı doğru yapar, oranı seçmez.

### K-63 · İzleyici: onay iki kemerle, kimlik sunucuda tuzlanır, paket tek RPC ile
İzleyici tarayıcıda yalnız `clk_consent.analytics=true` ise başlar; `/api/analytics/collect` aynı çerezi sunucuda yeniden okur, yoksa paketi 204 ile atar (istemci atlatılsa bile veri girmez). Ziyaretçi kimliği tarayıcıda rastgele üretilir, sunucu `md5(tuz + kimlik)` saklar; tuz `site_settings.analytics.salt` (gizli) ilk kullanımda üretilir. Paket zod ile doğrulanır, bot UA süzülür, IP maskelenir, ardından `ingest_analytics` security definer RPC'si tek işlemde yazar (K-56). Web Vitals PerformanceObserver ile kütüphanesiz ölçülür.
**Neden:** 06-ANALYTICS "onay yoksa hiç yüklenmez" ilkesi tek başına istemciye güvenir; sunucu denetimi ikinci kemerdir. Tuzlu özet, veritabanı sızsa bile ziyaretçi kimliğinin geri döndürülememesini sağlar; tuz değişirse eski özetler eşleşmez (ziyaretçi sayımı sıfırlanır — bilinçli). `web-vitals` paketi ~2 KB ama ek bağımlılık; dört gözlemci 40 satır.
**Bilinen bedeli:** Playwright/E2E tarayıcısı bot sayılır — testler `?e2e_track=1` ile açıkça izin alır, bu bayrak yalnız bot süzgecini gevşetir (onay yine gerekir). Attention ölçümü yalnız `main section[id]` bölümlerinde; INP yaklaşımı `event` gözlemcisinin en uzun süresidir (resmi INP algoritması değil).

### K-64 · Hata takibi kendi tablomuzda; logger raporlar; CSP önce yalnız raporlar
Üçüncü parti hata servisi (Sentry vb.) yok: tarayıcı ve sunucu hataları `/api/errors` üzerinden `report_error` RPC'sine düşer, sunucuda parmak izine (kaynak | modül | sayı/uuid maskeli mesaj | stack ilk satırı) göre gruplanır. `logger.error` çağrıları otomatik raporlanır (aynı hata dakikada bir; test ortamında kapalı), çağıran kod değişmez. 404'ler tarayıcıdan raporlanır ki bot tarayıcıları sunucuda süzülsün. CSP `Report-Only` başlığıyla başlar; ihlaller aynı tabloya `csp` modülüyle düşer.
**Neden:** 06-ANALYTICS "üçüncü parti yok, veri bizde" ilkesi; ücretsiz plan ve KVKK açısından hata servisine kişisel veri göndermemek. Zorlayıcı CSP, Next.js'in satır içi scriptleri ve üçüncü parti etiketler yüzünden ilk günde siteyi kırardı — rapor birikince zorlamaya geçilir.
**Bilinen bedeli:** Sunucu tarafı raporlama kendi origin'e fetch'tir (Vercel'de yanıttan sonra kesilebilir; kritik hatalar console'da da kalır). `unsafe-inline`/`unsafe-eval` içeren rapor politikası güvenlik sağlamaz, yalnız envanter çıkarır.

### K-65 · Konfigüratör geometrisi saf TypeScript'te, sahne yalnız çizer; profil kesitleri görsel, ağırlık veritabanından
`buildStructure(params, rules)` prototip v4'ün `build()` fonksiyonunun bire bir portudur ve Three.js'e bağımlı değildir: eleman listesi (grup, profil anahtarı, uç noktalar, boy), paneller (köşe noktaları, alan), plakalar, civata sayısı döner. `Scene` bu listeyi çizer; Faz 27 metraj aynı listeden hesaplanır — 3D ile metraj tek kaynaktan gelir, sayılar sahneden okunmaz. `domain/profiles` yalnız kesit çizim ölçülerini tutar; kg/m `steel_profiles` tablosundan gelir (K-55, tohum yok). Eleman grubu → profil kodu eşlemesi `configurator_rules.profile_map` ile panelden değiştirilir.
**Neden:** Vitest'te WebGL yok; geometri testleri (aks sayısı, eleman sayısı, alanlar) elle doğrulanan sayılarla saf fonksiyona yazılır. Metrajın sahneyle ayrışması "3D'de görünen ≠ fiyatlanan" hatasını yapısal olarak engeller.
**Bilinen bedeli:** Kesit ölçü tablosu (`SECTIONS`) koddadır; yeni profil kodu eklenirse görsel için varsayılan IPE300 kesiti kullanılır (metraj etkilenmez).

### K-66 · Metrajda bilinmeyen ağırlık sıfır değil "yok"tur
`computeTakeoff` kg/m'si girilmemiş profil için ağırlığı `null` döner, tonajı yalnız bilinen satırlardan toplar ve eksik kodları listeler; arayüz "—" ve "kg/m girilmedi: …" uyarısı gösterir. Varsayılan kesit tablosu (`domain/profiles`) ağırlık taşımaz.
**Neden:** Sıfır ya da tahmini bir kg/m, tonajı ve Faz 28 fiyatını sessizce yanlış yapar; müşteri karşısına "uydurma" sayı çıkar (CLAUDE.md "asla"). Eksikliğin görünür olması ürün sahibini kataloğu doldurmaya zorlar.
**Bilinen bedeli:** Katalog boşken metraj "ağırlıksız" görünür; Faz 28 fiyat kutusu tonaj tamamlanmadan hesaplanmaz.

### K-67 · PDF = tarayıcının yazdırma akışı; fiyat üyeye birim fiyat tablosuyla istemcide hesaplanır
Konfigürasyon çıktısı için PDF kütüphanesi (jsPDF, react-pdf ~1 MB) eklenmez: `/konfigurator/k/[token]/yazdir` yazdırma CSS'li sade bir sayfadır, "PDF olarak kaydet" tarayıcıda yapılır. Üyeye fiyat için sunucu `material_prices`'tan (RLS: yalnız oturumlu) birim fiyat tablosunu okuyup istemciye verir; kaydırıcı her değiştiğinde fiyat istemcide anında güncellenir. Ziyaretçiye tablo hiç gönderilmez (kapı sunucuda). Kaydederken metraj ve fiyat **sunucuda** yeniden hesaplanır; istemciden gelen sayı kabul edilmez.
**Neden:** Bundle boyutu ve bakım; fiyat canlı olmalı (RSC turu olmadan). K-29 kapısı "istemcide gizle" değil "sunucudan gönderme" ile sağlanır.
**Bilinen bedeli:** Yazdırma çıktısının görünümü tarayıcıya bağlıdır (antet/altbilgi). Üye, birim fiyatları ağ sekmesinden görebilir — üyeye zaten gösterilen bilgidir.

### K-68 · IndexNow sitemap farkından; RSS yalnız blog; üçüncü parti "ping" yok
IndexNow gönderimi içerik eylemlerine değil, saatlik cron'a bağlıdır: iş `sitemap.xml`'i okur, `lastmod`'u son başarılı koşudan yeni olan URL'leri tek istekle gönderir. Modül eylemleri (yayınla/güncelle) IndexNow'u bilmez. RSS yalnız blog için üretilir (ürün/proje beslemesi yok); Google için ek ping yapılmaz (kaldırıldı; sitemap yeter).
**Neden:** Sitemap zaten "yayındaki tüm URL'ler + son değişiklik"in tek kaynağı; her modüle bildirim eklemek (K-07/K-08 kuralları, dil bazlı yayın) tekrar ve hata üretirdi. Saatlik gecikme kurumsal site için kabul edilebilir.
**Bilinen bedeli:** `lastmod`'suz URL'ler (statik sayfalar) yalnız ilk koşuda gönderilir; anahtar yoksa ya da site indekslenebilir değilse iş sessizce `not_configured` döner (heartbeat'e yazılmaz, canlılık uyarısı üretmez).

### K-69 · İkinci hat yedek: PostgREST ile JSON dışa aktarım + PGlite'ta geri yükleme tatbikatı
Supabase'in günlük anlık görüntüsüne ek olarak `scripts/backup-export.mjs` tüm public tabloları ve auth kullanıcılarını JSON'a alır; `scripts/backup-restore-drill.mjs` boş bir PGlite'a şim + tüm migration'ları uygulayıp satırları tipli `insert`'lerle (jsonb/dizi/üretilmiş sütun farkındalığıyla) geri yükler, sayıları karşılaştırır ve süreyi raporlar. Tatbikat üretime dokunmaz ve Docker/pg_restore gerektirmez.
**Neden:** "Denenmemiş yedek yedek değildir" (05-ENVIRONMENTS). Yerelde `pg_dump` yok; PGlite test altyapısı zaten şemayı sıfırdan kurabiliyor — aynı yol yedeğin bütünlüğünü de kanıtlar. İleride MSSQL'e geçişte JSON dışa aktarım taşıma girdisi olur.
**Bilinen bedeli:** Storage nesneleri ve şifre özetleri kapsam dışı (Supabase anlık görüntüsünden döner). JSON'da SQL NULL ile jsonb `null` ayırt edilemez → not-null jsonb sütunlarda `'null'::jsonb` kabul edilir. Dışa aktarım kişisel veri içerir: `backups/` gitignore'da, şifreli diske alınır.

### K-70 · `sideEffects: false` — barrel içe aktarımı istemciye sunucu kodu sürüklemesin
`package.json`'da `sideEffects: ["*.css"]`. Modül barrel'ları (`index.ts`) hem bileşen hem önbellekli veri fonksiyonu dışa aktarır; istemci bileşeni yalnız bileşeni kullansa da webpack, yan etki varsayımıyla veri katmanını (ve supabase-js'i, 88 KB gz) istemci paketine alıyordu.
**Neden:** Ana sayfa JS'i %58 küçüldü; modül sınırı kuralı (yalnız `index.ts`) korunurken bedeli sıfırlandı.
**Bilinen bedeli:** Yan etkiye dayanan bir modül (kayıt/polyfill) eklenirse bayrağın dışına alınmalı; şu an yalnız CSS böyle.

### K-71 · Hero videosu betikle üretilir; header'da logo başta, dar ekranda dil + sepet üst barda
Hero videosu panelden ham yüklenmez: `scripts/hero-video-build.mjs` kaynağı `-g 1` ile (her kare keyframe) iki çözünürlükte kodlar, posteri ilk kareden üretir ve aktif hero kaydına bağlar. Header ortalanmış logodan "logo + menü solda, araçlar sağda" düzenine geçti; 1280 px altında dil değiştirici ve sepet ana satırdan çıkıp üstte ince bir bara taşınır.
**Neden:** Normal GOP'lu videoda `currentTime` scrub takılır (03-RESPONSIVE-ANIMATION); panelden yüklenen ham dosya bu garantiyi vermez. Header'da 7 menü öğesi + logo + dil + sepet + hesap + CTA 1024–1280 arasında sıkışıyordu; öğeleri gizlemek yerine ikinci satıra almak her kırılımda erişilebilir tutar (K-50).
**Bilinen bedeli:** Video değişince betik yeniden çalıştırılır (ffmpeg gerekir; `FFMPEG_PATH`). < 1280 px'te header 104 px (üst bar 40 + satır 64). `-g 1` dosyayı ~2,5 kat büyütür (2,6 → 6,4 MB); `reduced-motion`/`saveData`'da video hiç yüklenmez.

### K-72 · Tipografi: Archivo + Geist + Geist Mono, `display: swap`
Başlık Archivo (değişken; genişlik ekseni %116 ile geniş kesim), gövde Geist, teknik etiketler Geist Mono. Fontlar `block` ile yüklenir (önce `swap` denendi; yedekten marka fontuna görünür geçiş ürün sahibince istenmedi) ve ilk girişte yükleyici fontları açıkça yükler.
**Neden:** Google alt kümeleri ayrı dosyalardır; Türkçe'ye özgü harfler `latin-ext` dosyasındadır. `optional` ile bu dosya ilk ~100 ms'de yetişmezse o sayfa görünümünde `ş ğ İ ı` yedek fontla, geri kalan harfler marka fontuyla çiziliyordu. Syne'ın sedilli harf çizimi de zayıftı. Üç yeni font Türkçe glifleri tam ve tutarlı içerir; değişken oldukları için ağırlık başına dosya yoktur.
**Bilinen bedeli:** `swap` yavaş bağlantıda kısa bir yedek-font anı (FOUT) gösterir; next/font'un metrik uyumlu yedeği kaymayı (CLS) önler. Laboratuvar LCP'si metin boyamasına bağlı sayfalarda bir miktar gecikebilir. Önceki marka fontu kararı (01-DESIGN-SYSTEM) bu kararla değişti.

### K-73 · İngilizce yayın: ürün sahibinin açık talimatı onay sayılır, meta'da işaretlenir
K-08 EN yayını için insan onayı ister. Ürün sahibi 2026-09-18'de İngilizce sitenin tamamlanmasını istedi; mevcut makine taslakları gözden geçirilip `translation_meta.en = {machine: true, reviewed: true, approved_via: "urun-sahibi-talimati-2026-09-18"}` ile yayınlandı. `reviewed_by` boştur; panelde bir dil uzmanı onayladığında dolar.
**Kapsam dışı:** yasal sayfalar ve mail şablonları (K-08 listesi) — hukuki sorumluluk taşır, İngilizcesi insan eliyle girilir.

### K-74 · İlk giriş yükleyicisi: kurulum animasyonu gerçek ilerlemeye bağlı, içerik altta render edilir
İlk girişte (oturumda bir kez) tam ekran yükleyici: çelik çerçeve, yükleme ilerledikçe kurulur (zemin → kolonlar → makaslar → aşıklar → çaprazlar → bulonlar; mahyada kaynak kıvılcımı). İlerleme = hero videosunun akışla indirilmesi %70 + `load` %20 + fontlar %10; en az 1,4 sn, en fazla 7 sn. Hero videosu scrub modunda `fetch` ile tamamen indirilip blob olarak bağlanır.
**Neden:** Ürün sahibi, video ve görseller hazır olmadan sitenin açılmasını istemedi; scrub'ın takılmadan çalışması için videonun tamamının bellekte olması zaten en sağlam yoldur. 03-RESPONSIVE-ANIMATION'daki "loader yok" kararı bu kararla değişti.
**Bedeli ve sınırları:** Gerçek kullanıcıda ilk anlamlı boyama gecikir. Bunu sınırlamak için katman varsayılan gizlidir ve yalnız satır içi betik `html.clk-loading` eklerse görünür (JS yoksa çıkmaz); `navigator.webdriver` olan ortamlarda (E2E, Lighthouse, otomasyon) kapalıdır; sayfa katmanın altında tam render edildiği için arama motorları içeriği görür; React çalışmazsa CSS animasyonu 9. saniyede katmanı kaldırır. `<html>` sınıfı hidrasyondan önce eklendiği için `suppressHydrationWarning` kullanılır.

### K-75 · Ürün kataloğu firmanın kendi işinden türetilir; standart tablo değeri uydurma sayılmaz
Katalog, `assets/` altındaki gerçek iş fotoğraflarının gösterdiği dört ürün hattıyla kuruldu (kutu profil karkas, alçıpan karkası, hafif çelik, körkasa). Genel bir çelik profil listesi (IPE/HEA/HEB…) eklenmedi: firmanın bunları sattığına dair bir veri yoktu. Açıklamalar sistemi ve tipik uygulamayı anlatır, karşılaştırmalar nitelikseldir. Ölçü tablolarındaki kg/m değerleri TS EN 10219 kutu profillerin kesit alanından türeyen standart değerlerdir (DB testi 40×40×2 = 2,31'i doğrular).
**Neden:** "Asla uydurma" kuralı (CLAUDE.md) ürün gamını da kapsar; görseller elimizdeki tek doğrulanabilir kaynaktı. Yayımlanmış standart değeri firma iddiası değildir.
**Kapsam dışı:** fiyat, stok miktarı, üretim kapasitesi, teslim süresi, referans — bunlar WhatsApp/teklif akışında insanla konuşulur. Stok kodları (`KP-…`, `KK-…`) iç adlandırmadır; ürün sahibi değiştirebilir.

---

### K-76 · Sahadan videolar: tıklanınca yüklenen, çerezsiz gömme; kaynak YouTube ya da kendi dosyamız
**Karar:** Ana sayfadaki video şeridi `field_videos` tablosundan gelir. Kaynak ya YouTube kimliği ya da medya kütüphanesindeki video dosyasıdır (CHECK ile tutarlı). Kart ilk yüklemede yalnız kapak görselidir; iframe/`<video>` kullanıcı tıklayınca oluşturulur ve YouTube `youtube-nocookie.com` alan adından gömülür.
**Neden:** YouTube gömmesi ~1 MB betik ve üçüncü taraf çerezi getirir → ilk yüklemede LCP/INP'yi ve çerez onayı yükümlülüğünü etkiler. Tıklayınca yükleme ikisini de ortadan kaldırır. Kendi dosyamız seçeneği, YouTube'a koymak istenmeyen saha görüntüleri içindir (Storage, dikey MP4).
**Sonuç:** Tohum veri yok; kayıt yoksa bölüm çizilmez. Panelde İçerik grubunda ayrı sayfa. Büyük dosyalar için öneri YouTube (Storage kotası ve bant genişliği).

## Değiştirilen Kararlar

*(Henüz yok. Bir karar değişirse buraya taşınır, gerekçesiyle.)*
