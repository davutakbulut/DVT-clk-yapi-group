# 3D Konfigüratör (K-110)

Altı yapı türü tek motorda: **çelik hol** · **çok katlı yapı** · **çatı & cephe kaplama** · **ara kat platformu** · **çit & korkuluk** · **alçıpan bölme duvar**.
Rotalar `(configurator)` grubunda (K-23, Lenis yok, Three.js yalnız burada dinamik import — K-24); seçim sayfası `/konfigurator` (K-80); rehber sayfaları K-107.

## Mimari

```
engine/catalog.ts   standart profil tabloları → kesit çokgeni → kesit değerleri (A, G, I, W, Wpl, i, It, AL)   [saf]
engine/kit.ts       yapım fonksiyonunun çizdiğini kaydeder (eleman, levha, cıvata, yüzey) + levha/cıvata sayımı [saf]
engine/apps/*.ts    altı yapım fonksiyonu: durum → Model + metraj satırları + KPI + bayrak + lejant              [saf]
engine/runtime.ts   durum doğrulama (sınır/adım/seçenek/katalog), panel geçersiz kılmaları, yapım + toplamlar   [saf]
EngineScene.tsx     Model → Three.js (ExtrudeGeometry, InstancedMesh, gölge, sis, OrbitControls, görünüşler)     [istemci]
EngineConfigurator  panel + tuval + katalog penceresi + CSV/yazdır/paylaş + kayıt + fiyat                        [istemci]
EngineConfiguratorPage / SharedConfigurationView  katalog, kurallar, ayarlar, fiyat tablosu                      [sunucu]
```

**Görünen = sayılan:** metraj da sahne de aynı `Model` kaydından çıkar; sahne hesap yapmaz (K-65).
**Doğruluk:** `engine/__tests__/golden/*.json` ürün sahibinin prototiplerinden tarayıcıda alınmış 19 durumdur; port satır satır eşleşir.

## Veri

| Tablo / anahtar | İçerik | Panel |
|---|---|---|
| `steel_profiles` | kod, etiket, aile, tür, ölçüler (mm), **kg/m** (tek ağırlık kaynağı), aktif | `/admin/configurator/profiles` |
| `configurator_rules.engine.<tür>` | alan min/max/adım/varsayılan, varsayılan profiller, notlar TR/EN | `/admin/configurator/rules?kind=` |
| `configurator_rules.labor_factor`, `price_map` | işçilik katsayısı, fiyat kalemi → malzeme kodu | `/admin/configurator/rules` |
| `site_settings.configurator.disclaimer` | yasal uyarı | Site Ayarları |
| `configurations` + `configuration_versions` + `configuration_items` | kayıt (`params = {kind, state}`), sürümler, kalemler | `/admin/configurator` |

Metinler: `Engine.*` (alanlar, kalemler, notlar, katalog) ve `Configurator.*` (başlıklar, kayıt, fiyat, paylaşım) mesaj ad alanları; `ui_translations` ile geçersiz kılınabilir.

## Üyelik kapısı (K-29/K-30)

3D model, ölçü değiştirme ve metraj/tonaj herkese açık. **Fiyat** yalnız üyeye (ziyaretçiye bulanık kutu + kayıt bağlantısı). **Kaydetme:** üye hesabına; anonim e-posta + KVKK onayı + token bağlantısı (e-posta doğrulanınca hesaba geçer). Paylaşım sayfası `/konfigurator/k/[token]`: model + yeni sürüm + fiyat paylaşım anahtarı + teklif formu; yazdırma `/yazdir`.

## Fiyat

`computeEnginePrice`: çelik kg (levha ve cıvata dahil) × birim + işçilik (× katsayı − 1) + çatı m² × birim + duvar/cephe m² × birim. Birim fiyat yoksa kalem fiyatlanmaz ve söylenir (K-66); çelik fiyatı/para birimi yoksa fiyat gösterilmez.

## Yeni tür eklemek

1. `engine/apps/<tür>.ts` (AppDef: sections, profiles, noteKeys, build) + `apps/<tür>.messages.json` → `messages/*.json` `Engine.<tür>`
2. `engine/registry.ts` (ENGINE_KINDS, ENGINE_HREF) · `i18n/routing.ts` yol · rota dosyası · `Configurator.types.<tür>` mesajları
3. `configurator_rules.engine.<tür>` satırı (migration) · seçim sayfası kartı (`page.tsx` TYPES) · rehber sayfası (K-107)
4. Altın veri testi: prototip varsa tarayıcıdan metraj tablosu kaydı; yoksa elle doğrulanmış bir durum

## Güvenlik

- `configurations` RLS: üye yalnız kendi kayıtlarını görür; anonim yalnız token RPC'si (`get_configuration_by_token`)
- `save_configuration` K-104 kapısı + eşik; metraj ve fiyat **sunucuda** yeniden hesaplanır, istemci sayısı kabul edilmez
- Paylaşım sayfası IP başına 60/dk (token tarama)

## Doğrulama

- `npx vitest run src/modules/configurator` — katalog (±%2 katalog değerleri), altın veri (19 durum), çalışma zamanı, fiyat
- E2E `configurator*.spec.ts` — KPI/metraj, katalog seçimi, segment, CSV, EN, mobil çekmece, kayıt/paylaşım/yazdır/teklif, admin ayarlar ve profil
