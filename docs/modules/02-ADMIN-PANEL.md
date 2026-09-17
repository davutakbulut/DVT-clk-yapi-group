# Yönetim Paneli

`/admin` — locale dışında, **route'lar İngilizce**, arayüz dili Türkçe.
Örnek: `/admin/products` adresi **"Ürünler"** başlıklı Türkçe bir sayfa açar.

## Ön Yüz ↔ Admin Karşılık Matrisi

> **Bu matris Bitti Tanımı'nın parçasıdır.** Ön yüze eklenen her öğenin admin karşılığı işaretlenmeden faz tamamlanmış sayılmaz.

| Ön yüzde görünen | Admin ekranı | İşlemler |
|---|---|---|
| Header + footer menüleri | `/admin/menus` | CRUD · **sürükle-bırak sırala** · sol/sağ grup · dil bazlı |
| Logo, favicon, site adı, slogan | `/admin/settings` | Düzenle · görsel yükle |
| Hero videosu (masaüstü + mobil ayrı) | `/admin/pages/home` | Yükle · poster · süre |
| Hakkımızda + istatistikler | `/admin/pages/about` | Düzenle · istatistik CRUD |
| **Hizmetler** | `/admin/services` | CRUD · sırala · galeri · SEO · TR/EN |
| **Ürünler** | `/admin/products` | CRUD · sırala · çoklu görsel · **özellik satırları** · **varyant tablosu** · belge · SEO · TR/EN |
| Ürün kategorileri | `/admin/product-categories` | CRUD · hiyerarşi · sırala |
| **Çözüm sayfaları** | `/admin/solutions` | CRUD · bölüm bölüm · karşılaştırma tablosu · SSS · SEO |
| **Fiyat rehberleri** | `/admin/pricing` | CRUD · tablo satırları · birim fiyat · metraj ön ayarları · **bayat uyarısı** |
| **Projeler** | `/admin/projects` | CRUD · sırala · çoklu görsel · öne çıkar · hizmet/ürün bağla |
| Proje kategorileri | `/admin/project-categories` | CRUD · sırala |
| **Blog** | `/admin/blog` | CRUD · Tiptap · **canlı SEO paneli** · taslak önizleme · zamanlama · revizyon |
| Blog kategori / etiket | `/admin/blog/categories` · `/admin/blog/tags` | CRUD |
| Blog yorumları | `/admin/blog/comments` | **Onayla/Reddet/Spam** · yanıtla · toplu işlem |
| **Müşteri yorumları** | `/admin/testimonials` | CRUD · sırala · öne çıkar · hizmet/proje bağla · ziyaretçi yorumu onayı · **Google senkronu (salt-okunur)** |
| Ekip üyeleri | `/admin/team` | CRUD · sürükle-bırak · fotoğraf |
| Referans logoları | `/admin/references` | CRUD · logo · öne çıkar |
| Belgeler / sertifikalar | `/admin/certificates` | CRUD · PDF + görsel · geçerlilik |
| Kariyer ilanları | `/admin/careers` | CRUD · yayınla/kapat · son tarih · SEO |
| İş başvuruları | `/admin/careers/applications` | Liste · filtre · CV indir · durum · not · Excel |
| SSS | `/admin/faq` | CRUD · sırala · varlığa bağla |
| Teklif formu seçenekleri | `/admin/settings/form` | Seçenek CRUD · sırala |
| **Gelen talepler** | `/admin/leads` | Liste · filtre · detay · not · **cevapla (mail)** · durum · ata · **ürün kalemleri** · Excel |
| İletişim, sosyal medya, çalışma saatleri | `/admin/settings` | Düzenle |
| **WhatsApp butonu** | `/admin/settings/whatsapp` | Numara · mesaj şablonları · saatler · sayfa bazlı gizle |
| Yasal sayfalar | `/admin/pages` | Düzenle · TR/EN |
| Çerez onay bandı | `/admin/settings/cookies` | Düzenle |
| **404/403/500 metinleri** | `/admin/pages/errors` | Düzenle · TR/EN |
| Bakım modu | `/admin/settings` | Aç/kapa · metin · süre |
| **Modül aç/kapa** | `/admin/settings/modules` | Kill switch |
| Üyeler ve roller | `/admin/users` | Liste · davet · rol · aktif/pasif · şifre sıfırla · aktivite |
| Arayüz etiketleri | `/admin/translations` | Ara · düzenle · varsayılana dön |
| Terim sözlüğü | `/admin/translations/glossary` | CRUD · TR↔EN · bağlam |
| Çevirisi eksikler | `/admin/translations/missing` | EN tarafı boş kayıtlar |
| Yönlendirmeler | `/admin/redirects` | CRUD · `slug_history` otomatik |
| SEO varsayılanları, doğrulama kodları | `/admin/settings/seo` | Düzenle · **öksüz sayfa raporu** |
| Mail şablonları | `/admin/mail-templates` | Düzenle · değişkenler · **test gönder** · loglar |
| Bülten aboneleri | `/admin/newsletter` | Liste · dışa aktar · sil |
| Bildirimler | `/admin/notifications` | Liste · okundu · tercihler |
| Konfigüratör | `/admin/configurator/{profiles,prices,rules,submissions}` | CRUD · fiyat geçmişi · **satışa dönüştür** |

**Ön yüz karşılığı olmayan yönetim ekranları:** Dashboard · Müşteriler · Satışlar · Faturalar · Tahsilatlar · Raporlar · Sıcaklık Haritası · Hata Takip · Medya Kütüphanesi · Denetim Kaydı.

## Dashboard

- Bugün/bu hafta gelen talep sayısı, dönüşüm oranı
- Son talepler (hızlı erişim)
- Vadesi yaklaşan/geçen hakedişler ⚠
- Onay bekleyen yorumlar
- Ciro ve kâr grafiği (yetkiye göre)
- Ziyaretçi özeti
- Modül sağlık durumu (hata veren modüller)

## Blog Editörü — Canlı SEO Paneli

Yazı yazılırken sağ sütunda 17 maddelik anlık kontrol listesi, her madde 🟢/🟡/🔴:

```
ODAK ANAHTAR KELİME  [ çelik konstrüksiyon maliyeti ]

🟢 Başlık uzunluğu            54 karakter (50-60 ideal)
🟢 Anahtar kelime başlıkta    var, ilk 40 karakterde
🟡 Meta açıklama              98 karakter (120-160 önerilir)
🟢 Anahtar kelime URL'de      var
🟢 Anahtar kelime ilk paragrafta
🟢 H1 tek, hiyerarşi düzgün   H1→H2→H3
🟡 Anahtar kelime yoğunluğu   %0.7 (%0.5-2.5 ideal)
🟢 İçerik uzunluğu            1.240 kelime
🔴 Görsel alt metni           3 görselin 1'i eksik
🟢 İç bağlantı                4 adet
🟡 Dış bağlantı               yok (1-2 otoriter kaynak önerilir)
🟢 Okunabilirlik              ortalama cümle 16 kelime
🟢 Kapak görseli + OG         var, 1200×630
🟢 Yazar atanmış              …
🟡 SSS bloğu                  yok (AI aramalarda alıntılanma şansını artırır)
🟢 Odak kelime benzersiz      başka sayfada kullanılmıyor
🟢 İçerik örtüşmesi           %8 (eşik %60)

GENEL SKOR  78/100  🟡
```

**Son iki madde K-25 için kritik:** Hizmet ve ürün sayfaları aynı konuyu iki açıdan anlatıyor. Aynı odak kelimeyi veya aynı paragrafı kullanırlarsa çift içerik oluşur. Bu iki kontrol o riski yakalar.

**Diğer editör özellikleri:** slug önizleme + Google sonuç önizlemesi (TR/EN ayrı) · taslak/yayında/**zamanlanmış** · **Draft Mode ile gerçek sayfa önizlemesi** · revizyon geçmişi · otomatik kaydetme · okuma süresi · yayınlamadan önce kırık iç bağlantı kontrolü · canonical override · `noindex` anahtarı.

## Çeviri Akışı

```
[ TÜRKÇE ] [ İNGİLİZCE ⚠ ]        ← dil sekmeleri
  ⟳ Tümünü İngilizceye Çevir      (Claude API + terim sözlüğü)
  🟡 Makine çevirisi — gözden geçirilmedi
  ☐ Gözden geçirdim, yayına hazır  ← işaretlenmeden EN'de yayınlanmaz
```

Ayrıntı: [`../processes/01-TRANSLATION.md`](../processes/01-TRANSLATION.md)

## Ortak Desenler

| Desen | Uygulama |
|---|---|
| **Liste ekranları** | TanStack Table · **sunucu tarafı** sayfalama/sıralama/filtre · Excel export |
| **Sürükle-bırak sıralama** | `sort_order` · ertelenebilir unique kısıt (toplu yeniden sıralama tek işlemde) |
| **Görsel yükleme** | react-dropzone → Storage → `media_library` kaydı · MIME + sihirli bayt doğrulaması |
| **Eşzamanlı düzenleme** | `updated_at` ile iyimser kilitleme — "bu kayıt siz açtıktan sonra değişti" |
| **Oturum zaman aşımı** | 8 saat hareketsizlik → otomatik çıkış · son 15 dk uyarı |
| **Silme** | Yayındaki içerik silinirse URL **410 Gone** döner; yerine geçen varsa 301 |

## Mobil Uyumluluk

| Ekran | Hedef |
|---|---|
| Dashboard · Talepler · Bildirimler | **Mobil uyumlu** — sahadan talep kontrolü gerçek ihtiyaç |
| Satış · Fatura · Rapor · Sıcaklık haritası | Tablet üstü — veri yoğun tablolar telefonda anlamlı değil |

## İndekslenmeme

`/admin/*` dört katmanla korunur:

1. **`X-Robots-Tag: noindex, nofollow` HTTP başlığı** ← asıl koruma
2. `robots.txt` Disallow
3. Layout'ta `<meta name="robots">`
4. Sitemap'te yok + hiçbir genel sayfadan bağlantı yok

**Neden robots.txt yetmez:** `Disallow` taramayı engeller, **indekslemeyi engellemez**. Google başka bir yerden `/admin` bağlantısı bulursa adresi açıklamasız şekilde indeksleyebilir.
