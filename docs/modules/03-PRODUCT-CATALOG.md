# Ürün Kataloğu

Vitrin mantığı: ürünler sergilenir, **sepet ve ödeme yoktur**, her ürün teklif talebine dönüşür.

`assets/` altındaki **Körkasa · Kutu Profil · Hafif Çelik** klasörleri bu modülün ilk ürünleridir.

## Hizmet ile Farkı (K-25)

Körkasa, Kutu Profil ve Hafif Çelik **hem hizmet hem ürün** olarak yer alır. Çift içerik riskini önleyen ayrım:

| | Hizmet sayfası | Ürün sayfası |
|---|---|---|
| Sorusu | *"Nasıl uyguluyoruz?"* | *"Ne satıyoruz?"* |
| İçerik | Uygulama süreci, montaj aşamaları, saha koşulları, ekip, süre, referans projeler | Teknik özellik tablosu, ölçü/varyant tablosu, malzeme standardı, belgeler |
| Odak kelime | `kutu profil montajı` | `kutu profil ölçüleri` |
| CTA | Keşif / teklif | Teklif listesine ekle |

**Zorunlu kurallar:**
- Odak anahtar kelimeler **farklı** olmak zorunda — SEO panelinde benzersizlik kontrolü
- Aynı paragraf iki sayfaya kopyalanamaz — %60 üstü örtüşmede uyarı
- **Karşılıklı iç bağlantı zorunlu** — Google'a farklı amaçlı iki sayfa olduğu böyle anlatılır
- Her sayfa **kendine** canonical verir (birbirine değil)

## Ürün Detay Sayfası

```
┌ GALERİ (zoom + lightbox) ┐  Körkasa Profili
│   [ana görsel]           │  Kategori › Körkasa
│   ▫ ▫ ▫ ▫ küçük görsel   │  ★ Kısa açıklama
└──────────────────────────┘  ┌──────────────────────────┐
                              │  💬 Teklif İste          │
TEKNİK ÖZELLİKLER             │  ➕ Teklif Listesine Ekle│
┌──────────────┬────────────┐ │  📞 WhatsApp'tan Sor     │
│ Malzeme      │ DKP Sac    │ └──────────────────────────┘
│ Yüzey        │ Galvaniz   │
│ Standart     │ TS EN …    │  📄 Teknik Föy (PDF)
└──────────────┴────────────┘  📄 Montaj Kılavuzu (PDF)

ÖLÇÜ / VARYANT TABLOSU
┌─────────────┬────────┬──────────┬─────────┐
│ Ölçü        │ Et kal.│ Ağırlık  │ Stok kod│
│ 40×40 mm    │ 1.5 mm │ 1.78 kg/m│ KP-4015 │ [Listeye ekle]
│ 50×50 mm    │ 2.0 mm │ 2.93 kg/m│ KP-5020 │ [Listeye ekle]
└─────────────┴────────┴──────────┴─────────┘
   ↑ mobilde yatay kaydırmalı

AÇIKLAMA · KULLANIM ALANLARI · SSS
→ İlgili hizmet · Benzer ürünler · İlgili projeler · Fiyat rehberi
```

## Teklif Sepeti

Satın alma yok, ama **birden fazla ürünü biriktirip tek teklif isteme** var — tedarikçi sitelerinde en işe yarayan kalıp.

```
"Teklif Listesine Ekle" → ürün + varyant + adet listeye eklenir
                        → localStorage (üyelik gerekmez, tarayıcı kapansa da durur)
                        → header'da sayaç rozeti
/teklif-sepeti          → kalemler düzenlenir (adet, not, kaldır)
                        → tek formla gönderilir
                        → leads + lead_items kayıtları oluşur
```

Admin talebi açtığında **hangi ürün, hangi ölçü, kaç adet** karşısında olur.
Üye girişi varsa liste hesaba bağlanır ve cihazlar arası taşınır.

**localStorage neden yeterli:** Teklif sepeti geçici bir niyet listesidir, kritik veri değil. Sunucuya yazmak her ekleme için istek demek; localStorage anında ve ücretsiz. Gönderim anında veri veritabanına geçer.

## Veritabanı (6 tablo)

| Tablo | İçerik |
|---|---|
| `products` | slug · ad · kısa/uzun açıklama · kategori · kapak · ilgili hizmet · öne çıkan · sıra · durum · SEO · `published_locales` |
| `product_categories` | slug · ad · açıklama · görsel · üst kategori · sıra |
| `product_images` | ürün · görsel · alt metin (JSONB) · sıra |
| `product_specs` | ürün · özellik adı · değer · birim · grup · sıra |
| `product_variants` | ürün · ölçü adı · boyutlar · et kalınlığı · **`kg_per_m`** · stok kodu · sıra |
| `product_documents` | ürün · belge adı · dosya · tip (teknik föy / sertifika / montaj kılavuzu) |

`product_variants.kg_per_m`, konfigüratörün `steel_profiles` tablosuyla aynı mantıkta — ileride metraj motoruyla birleştirilebilir.

## SEO

Her ürün `Product` şeması alır.

> ⚠️ **Fiyat yayınlanmadığı için uydurma `Offer` yazılmaz.** Sahte fiyat işaretlemesi Google'ın yapılandırılmış veri politikası ihlalidir ve zengin sonuç cezası getirir. `AggregateRating` yalnız o ürüne ait gerçek yorum varsa eklenir.

## Admin

`/admin/products` — Liste (arama, kategori filtresi, durum) · Ekle · Düzenle · Sil · Sırala · Öne çıkar · **Çoklu görsel yükle** · Teknik özellik satırı ekle/sil/sırala · **Varyant tablosu düzenle** · Belge yükle · İlgili hizmet bağla · SEO alanları · TR/EN sekmesi

`/admin/product-categories` — Tam CRUD · Hiyerarşi · Sırala · Görsel
