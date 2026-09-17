# Proje Özeti

## Firma

**CLK Yapı Group** — çelik konstrüksiyon ve yapı işleri yapan inşaat firması.

## Başlangıç Durumu

Proje başladığında elde olanlar:
- 3 statik HTML anasayfa denemesi (`_archive/prototypes/`)
- 5 Three.js konfigüratör prototipi — geometri motoru çalışır durumda, ticari katman yok
- 162 saha fotoğrafı (`assets/`)

Hiçbiri birbirine bağlı değildi; veritabanı, alt sayfa ve navigasyon yoktu.

**Önemli tespit:** `homepage-v3-clk-rebrand.html` zaten CLK marka kimliğini taşıyor (çelik mavisi paleti + Syne tipografisi). v1 ve v2 eski marka denemeleridir. v3 aynı zamanda bir SEO iniş sayfası örneğidir ("Çelik Konstrüksiyon ile Kentsel Dönüşüm") — bu sayfa tipi projede ayrı bir içerik türü olarak kuruldu.

## Hedef

Tamamı veritabanına bağlı, çift dilli (TR/EN), ön yüz + yönetim paneli olan bütünleşik bir sistem.

Panel yalnız içerik yönetmiyor: **müşteri kayıtları, satış ve maliyet takibi, tevkifatlı faturalama, hakediş planı ve kârlılık raporlaması** da yapıyor. Mevcut 3D konfigüratör prototipi ticari araca dönüşüyor: metraj → tonaj → fiyat → teklif.

## Kapsam

| Alan | İçerik |
|---|---|
| **Ön yüz** | Ana sayfa (scroll video hero) · Hizmetler · Ürün kataloğu · Projeler · Blog · Çözüm sayfaları · Fiyat rehberi · 3D konfigüratör · Kurumsal sayfalar · Teklif sistemi · Üye alanı |
| **Yönetim** | Tüm içerik CRUD · Talep yönetimi · CRM · Satış & maliyet · Fatura & tahsilat · Raporlar · Davranış analitiği · Sıcaklık haritası · Hata takip · Kullanıcı & rol |
| **Diller** | Türkçe (birincil) + İngilizce |
| **Fazlar** | 31 faz, 7 sürüm — bkz. [ROADMAP.md](ROADMAP.md) |
| **Tablolar** | ~80, tamamı RLS korumalı |

## Terim Sözlüğü

Bu projede sık geçen ve karıştırılabilecek terimler:

### İnşaat / Çelik

| Terim | Açıklama | EN |
|---|---|---|
| **Aks aralığı** | Taşıyıcı çerçeveler arası mesafe | Bay spacing |
| **Aşık** | Çatı kaplamasını taşıyan yatay eleman | Purlin |
| **Kuşak** | Duvar kaplamasını taşıyan yatay eleman | Girt |
| **Makas** | Çatı taşıyıcı sistemi | Truss |
| **Mahya** | Çatının en üst çizgisi | Ridge |
| **Saçak yüksekliği** | Duvar üst kotu | Eave height |
| **Körkasa** | Kapı/pencere boşluğuna gömülen çelik kasa | Steel door frame |
| **Kutu profil** | Kare/dikdörtgen kesitli içi boş profil | Hollow section (SHS/RHS) |
| **Hafif çelik** | İnce cidarlı soğuk şekillendirilmiş profil | Light gauge steel |
| **Metraj** | Malzeme miktarı hesabı | Quantity take-off |

### Ticari / Mali

| Terim | Açıklama |
|---|---|
| **Tevkifat** | KDV'nin bir kısmının alıcı tarafından beyan edilmesi. Yapım işlerinde tipik oran 4/10 |
| **Hakediş** | İşin tamamlanma oranına göre yapılan kısmi ödeme |
| **Matrah** | KDV hesaplanan tutar (KDV hariç toplam) |
| **VUK** | Vergi Usul Kanunu — ticari kayıtların 5 yıl saklanmasını zorunlu kılar |

### Sistem

| Terim | Açıklama |
|---|---|
| **Lead / Talep** | Potansiyel müşteriden gelen teklif isteği |
| **Çözüm sayfası** | Belirli bir ihtiyaç için hizmeti anlatan SEO iniş sayfası |
| **Fiyat rehberi** | Yapılandırılmış fiyat tablosu + hesaplayıcı içeren sayfa |
| **Teklif sepeti** | Birden fazla ürünün biriktirilip tek teklifle istendiği liste |
| **Dikey dilim** | Bir özelliğin ön yüz + admin tarafının aynı fazda bitirilmesi |
| **Bitti Tanımı** | Bir fazın tamamlanmış sayılması için gereken kontrol listesi |

## Paydaşlar

| Rol | Kim | Sorumluluk |
|---|---|---|
| Ürün sahibi | Davut Akbulut | Kararlar, içerik onayı, firma bilgileri |
| Geliştirme | Claude Code + ekip | Uygulama |
| Hukuk | (atanacak) | KVKK ve yasal metin onayı |

## Bilinmeyenler

Proje başlarken netleşmemiş, ilerledikçe doldurulacak bilgiler [23-MISSING-INFO](#) yerine doğrudan burada izlenir:

- [ ] Domain adı
- [ ] Firma telefon · adres · e-posta · çalışma saatleri
- [ ] Sosyal medya hesapları
- [ ] Logo dosyası (vektörel tercih edilir)
- [ ] WhatsApp destek numarası
- [ ] Google Business `place_id`
- [ ] Gerçek fiyat verileri (fiyat rehberi için)
- [ ] Proje bilgileri (ad, lokasyon, yıl, m²) — görseller var, veriler yok
- [ ] Ekip üyesi bilgileri
- [ ] Sertifika ve belgeler
- [ ] DNS erişimi (SPF/DKIM/DMARC kayıtları için)
