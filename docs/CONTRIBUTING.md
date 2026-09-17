# Katkı Kuralları

## Dal Akışı

```
main (korumalı)  ←  feat/faz-NN-konu
```

`main`'e doğrudan push kapalı. PR zorunlu, CI geçmeden merge edilemez.

**Dal adlandırma:**
```
feat/faz-07-services
fix/leads-mail-retry
docs/update-schema
chore/upgrade-tailwind
```

## Commit Formatı

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat: hizmet detay sayfası ve admin CRUD eklendi
fix: dil değiştirici dinamik slug'ı çevirmiyordu
docs: veritabanı şeması güncellendi
chore: bağımlılıklar güncellendi
refactor: lead servisi Result tipine geçirildi
test: tevkifat hesabı birim testleri
perf: ürün listesi sorgusu tek RPC'ye indirildi
```

Commit mesajı **Türkçe**, tip öneki İngilizce.

## Faz Yaşam Döngüsü

```
1. Issue açılır          "Faz 07 — Hizmetler (ön yüz + admin)"
                          → board: 📋 Yapılacak
2. Dal açılır            feat/faz-07-services
                          → board: 🔨 Devam Eden
3. Geliştirme            dikey dilim: ön yüz + admin BİRLİKTE
4. Bitti Tanımı          12 maddelik liste işaretlenir
                          → board: 🧪 Test
5. PR açılır             CI: lint · typecheck · test · build · madge · audit · Lighthouse
6. Ekran görüntüleri     mobil / tablet / masaüstü — PR'a eklenir
7. Merge → main          Vercel otomatik dağıtım
8. Issue kapanır         → board: ✅ Tamamlandı
9. Aynı PR'da            ROADMAP.md (faz ✅) + CHANGELOG.md güncellenir
10. Sürüm bitince        git tag v1.0.0 + GitHub Release
```

## Temel Kural

> **`main` dalı her zaman dağıtılabilir durumdadır.**

Yarım kalmış iş `main`'e girmez. İş herhangi bir anda durduğunda canlı site tutarlı ve çalışır hâlde kalır.

## Dikey Dilim

Bir özelliğin **ön yüzü ve admin karşılığı aynı fazda** biter.

**Neden:** İlk planda admin 12. fazdaydı. O sırayla iş Faz 11'de dursa, güzel görünen ama **içeriği yönetilemeyen** bir site kalırdı — blog yazısı eklenemez, talep görülemezdi.

## Kod Sahipliği

`CODEOWNERS` her modül klasörü için sorumlu geliştirici tanımlar; PR'da otomatik gözden geçiren olarak eklenir.

## Çakışma Yüzeyi

Modül klasörleri ayrık olduğu için iki geliştirici aynı dosyaya nadiren dokunur.

**Ortak noktalar yalnız ikisi:**
- `src/i18n/routing.ts` (pathnames)
- Modül kayıt listesi

İkisi de **ekleme yapılan** dosyalardır — satır çakışması minimum.

## Testler Modülün İçinde

```
src/modules/<modul>/__tests__/
```

Modülü taşırsan testleri de gelir. Merkezi bir `tests/` klasörü, modül sınırlarını zayıflatır.

## Yeni Modül Ekleme

1. `src/modules/<isim>/` klasörünü standart iskeletle oluştur
2. `module.config.ts` yaz (route'lar, admin menü, gerekli rol, `enabled` bayrağı)
3. Modül kayıt listesine bir satır ekle
4. Bitti — **çekirdek koda dokunulmaz**

## Ajan Kullanımı

| Durum | Yaklaşım |
|---|---|
| Bağımsız modüller | Paralel ajanlar |
| Araştırma gerektiren konular | Explore ajanı |
| Riskli mimari kararlar | Plan ajanı |
| Faz sonu | `/code-review` |
| Tek dosyalık işler, hata ayıklama | **Ajan kullanılmaz** — bağlam kaybı ve tekrar maliyeti |

**Aynı dosyalara dokunan işler paralelleştirilmez.** Faz 2 (veritabanı şeması) gibi temel işler sırayla yapılır.

## Not

Bu sınırlar tek kişilik bir projede fazladan tören demek. Ekip çalışması hedeflendiği için kuruluyor ve **ESLint ile zorlandığı** için ayakta kalıyor. Denetlenmeyen mimari kuralı birkaç hafta içinde çürür.
