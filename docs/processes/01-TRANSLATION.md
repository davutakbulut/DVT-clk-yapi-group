# Çeviri Akışı (TR → EN)

**Yaklaşım: makine taslağı + zorunlu insan onayı.**
Otomatik çeviri tek başına yayınlanmaz; elle çeviri tek başına sürdürülebilir değil.

## Admin Arayüzü

```
┌ Ürün: Körkasa Profili ─────────────────────────────────┐
│  [ TÜRKÇE ]  [ İNGİLİZCE ⚠ ]          ← dil sekmeleri  │
│  Başlık   [ Körkasa Profili                          ] │
│  Özet     [ Kapı ve pencere boşluklarında kullanılan…] │
│           ⟳ Tümünü İngilizceye Çevir                   │
└────────────────────────────────────────────────────────┘

┌ [ İNGİLİZCE ] sekmesi ─────────────────────────────────┐
│  🟡 Makine çevirisi — gözden geçirilmedi               │
│  Başlık   [ Steel Door Frame Profile                 ] │
│  Slug     [ steel-door-frame-profile ]  ← elle girilir │
│  ☐ Gözden geçirdim, yayına hazır                       │
└────────────────────────────────────────────────────────┘
```

## Kurallar

- Her çevrilebilir alanın yanında **"TR'den çevir"** butonu + kaydın tümünü çeviren toplu buton
- Makine çevirisi yapılan kayıt **sarı rozet** alır (`translation_meta` JSONB)
- **`published_locales`'e `en` eklenmesi manuel onay ister** — onaysız kayıt İngilizce sitede **404 verir**
- **Slug otomatik çevrilmez** — SEO anahtar kelimesi çeviriyle değil araştırmayla belirlenir
- **Otomatik çeviri kapalı:** KVKK, gizlilik, çerez, kullanım koşulları, mail şablonları
- `/admin/translations/missing` — EN tarafı boş kayıtlar tek listede

## Terim Sözlüğü

`translation_glossary` — bu olmadan teknik metin bozulur:

| Türkçe | İngilizce |
|---|---|
| Körkasa | Steel door frame |
| Aşık | Purlin |
| Mahya | Ridge |
| Kuşak | Girt |
| Makas | Truss |
| Aks aralığı | Bay spacing |
| Saçak yüksekliği | Eave height |
| Kutu profil | Hollow section (SHS/RHS) |
| Hafif çelik | Light gauge steel |
| Tevkifat | VAT withholding |
| Hakediş | Progress payment |
| Kentsel dönüşüm | Urban regeneration |

Sözlük her çeviri isteğine **bağlam olarak gönderilir**, ayrıca çeviri sonrası zorlayıcı değiştirme yapılır. Yeni terim çıktıkça admin'den eklenir.

**Neden sözlük şart:** "Körkasa" kelimesi kelimesine çevrilirse anlamsız bir şey çıkar. "Aşık" ise günlük dilde tamamen farklı bir anlam taşır — bağlamsız çeviri komik sonuçlar verir.

## Claude API

- Anahtar **sunucu tarafında** (`ANTHROPIC_API_KEY`), tarayıcıya asla inmez
- Çeviri bir **Server Action** üzerinden çağrılır
- Yalnız `admin` ve `editor` rolleri tetikleyebilir, **hız sınırlı**
- Zaman aşımı + devre kesici — servis yanıt vermezse admin elle yazmaya devam eder, panel çökmez
- İstek terim sözlüğü + **içerik tipi bağlamıyla** gönderilir: bir ürün açıklaması pazarlama tonunu, bir teknik özellik satırı kuru dilini korur

## İngilizce Kapsamı

| İçerik | İngilizce |
|---|---|
| Ana sayfa · Hizmetler · Ürünler · Hakkımızda · İletişim · Teklif | **Zorunlu** |
| Çözüm sayfaları · Fiyat rehberi | Öncelikli |
| Projeler · Blog · Kariyer | **İsteğe bağlı** |
| KVKK · Gizlilik · Çerez · Kullanım | Elle (makine çevirisi kapalı) |

`published_locales` sayesinde çevrilmemiş içerik İngilizce listede çıkmaz, `hreflang` yazılmaz, sitemap'e girmez. **Ziyaretçi yarım çevrilmiş bir site görmez.**

## Arayüz Mikro-Metinleri

"Devamını Oku", "Gönder", "Sonraki" gibi metinler bu akışın **dışında**: `next-intl` mesaj dosyalarında iki dilde birlikte yazılır, `ui_translations` tablosundan admin override edebilir.

Sayıca sınırlı ve sabit oldukları için makine çevirisine gerek yok; ayrıca mesaj dosyaları önbelleklenebilir.
