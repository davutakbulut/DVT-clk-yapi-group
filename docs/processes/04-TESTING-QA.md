# Test ve Kalite

## Katmanlar

| Katman | Araç | Ne test edilir |
|---|---|---|
| **Tip** | TypeScript `strict` | Derleme zamanı |
| **Birim** | Vitest | **Metraj motoru · tevkifat/KDV hesabı · slug üretimi · `returnUrl` doğrulayıcı** — hata pahalı olan saf mantık |
| **Veritabanı** | **PGlite + Vitest** (`npm run test:db`) | Migration zinciri sıfırdan · RLS: her rol için görmeli/**görmemeli** satırlar · kısıtlar · indeks planı — Docker'sız, ~4 sn (K-47) |
| **E2E** | Playwright | Teklif gönderme · teklif sepeti · giriş + returnUrl · konfigürasyon kaydetme · admin CRUD · dil değiştirme |
| **Görsel regresyon** | Playwright screenshot | Bölümler 3 kırılımda bozulmuyor |
| **Erişilebilirlik** | axe-core + klavye + VoiceOver | Odak sırası, etiket, kontrast, ARIA |
| **Performans** | Lighthouse CI | LCP/CLS/INP eşikleri |
| **Gerçek cihaz** | **iOS Simulator (Safari)** + Android emülasyon | Scroll video, drawer, dokunmatik |

## Neden Bu Dört Şey Birim Testi Alıyor

| Ne | Hata bedeli |
|---|---|
| Metraj motoru | Yanlış tonaj → yanlış fiyat → yanlış teklif |
| Tevkifat/KDV | Yanlış fatura → vergi sorunu |
| Slug üretimi | Türkçe karakter tuzağı → kırık URL, indekslenmeyen sayfa |
| `returnUrl` doğrulayıcı | Açık yönlendirme → kimlik avı saldırısı |

Bunların hepsi **saf fonksiyon** (`domain/` katmanı) — test yazmak kolay, hata pahalı.

## RLS Testi

Her rol için dört soru:

```
□ Görmesi gereken satırları görüyor mu
□ Görmemesi gereken satırları GÖRMÜYOR mu   ← asıl test
□ Yazabilmesi gereken satırları yazabiliyor mu
□ Yazmaması gereken satıra yazamıyor mu
```

**En sık atlanan ikinci madde.** "Admin her şeyi görüyor" testi her zaman geçer; "sales maliyeti görmüyor" testi yazılmazsa açık fark edilmez.

## UI/UX Doğrulaması

Her görsel faz sonunda sayfa tarayıcı panelinde **mobil / tablet / masaüstü** genişliklerinde açılıp **ekran görüntüsü paylaşılır**. "Çalışıyor" demekle yetinilmez.

Hero videosu gibi iOS'a özel riskli parçalar **iOS Simulator'da gerçek Safari** ile denenir.

## Bitti Tanımı

Her fazın sonunda zorunlu:

```
□ build · lint · typecheck temiz
□ Ön yüz ↔ admin karşılık matrisi işaretlendi
□ Statik veri taraması temiz (gömülü içerik/metin yok)
□ 3 kırılımda gözle kontrol + ekran görüntüsü paylaşıldı
□ Klavyeyle tam gezilebiliyor, odak halkası görünür
□ axe hatası yok
□ RLS yetkisiz rolle test edildi
□ Kritik akış için E2E testi yazıldı
□ Yeni sayfaya en az bir iç bağlantı veriliyor (öksüz sayfa yok)
□ Lighthouse eşik üstünde
□ docs/ROADMAP.md + docs/CHANGELOG.md güncellendi
□ Commit + push + Project board kartı taşındı
```

## Kritik Doğrulama Noktaları

| Faz | Doğrulama |
|---|---|
| **1** | 5 riskli mimari varsayım **kod yazmadan önce** deneyle doğrulanır |
| **6** | Scroll video gerçek iOS Safari'de test edilir |
| **10** | Test maili + `email_logs` kaydı + kuyruk canlılık denetimi |
| **12** | **Yayın öncesi tam denetim:** Lighthouse, sitemap, robots, hreflang, admin `X-Robots-Tag`, öksüz sayfa |
| **21** | Tevkifatlı fatura hesabı elle doğrulanır |
| **27** | Metraj çıktısı bilinen bir yapı için elle kontrol edilir |
| **30** | IndexNow, `llms.txt`, AI bot erişimi, çerez onayına bağlılık |
| **31** | Erişilebilirlik denetimi + **yedek geri yükleme tatbikatı** |

## CI

Her PR'da:
```
lint · typecheck · vitest · build · madge --circular · npm audit · Lighthouse CI
```

`main` korumalı — CI geçmeden merge edilemez.

## Faz 31 eklemeleri

- `e2e/accessibility-audit.spec.ts`: 21 ön yüz sayfası (mobil + desktop) ve 17 panel ekranı axe (WCAG 2.1 AA) ihlalsiz; yeni sayfa eklenince `PUBLIC_PAGES`/`ADMIN_PAGES` listesine yazılır.
- Yedek: `npm run backup:export` (üretimden JSON) → `npm run backup:drill` (PGlite'ta sıfırdan kurulum + geri yükleme + sayı doğrulama, rapor). Her büyük migration sonrası bir kez koşturulur.

