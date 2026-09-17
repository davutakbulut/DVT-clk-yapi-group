# Fonksiyon ve Kod Yazım Standardı

## Katman Kuralları

| Katman | Yapar | Yapmaz |
|---|---|---|
| `domain/` | İş kuralı hesaplar | I/O, tarih okuma, rastgelelik |
| `data/` | Veritabanı okur/yazar | İş mantığı |
| `services/` | Kullanım senaryosu orkestre eder | Doğrudan SQL |
| `components/` | Aldığı veriyi gösterir | Veri çeker (sunucu bileşeni hariç) |

### `domain/` — Saf fonksiyonlar

I/O yok, rastgelelik yok, `new Date()` yok — tarih parametre olarak alınır.

```ts
export function calculateVatWithholding(
  base: number,
  vatRate: number,
  withholdingRatio: WithholdingRatio | null
): VatBreakdown {
  const vat = base * vatRate;
  const withheld = withholdingRatio ? vat * withholdingRatio : 0;
  return { base, vat, withheld, collectable: base + vat - withheld };
}
```

**Neden saf:** Test edilebilir, tahmin edilebilir, hata pahalı olan mantık burada yaşar. Tevkifat hesabı yanlışsa fatura yanlış kesilir — bu yüzden bu fonksiyonun testi zorunlu.

### `data/` — Yalnız I/O

```ts
export async function findProductBySlug(
  locale: Locale,
  slug: string
): Promise<Result<ProductRow, DataError>> {
  // yalnız gerekli kolonlar — select * YASAK
  // Result döner, fırlatmaz
}
```

**`select *` neden yasak:** Liste ekranlarında ağır JSONB gövde alanları gereksiz yere çekilir; 50 satırlık bir listede bu megabaytlara çıkar.

### `services/` — Tek senaryo, tek fonksiyon

Fiil + isim adlandırma:

```ts
createLeadFromBasket()
convertConfigurationToSale()
syncGoogleReviews()
anonymizeCustomerData()
```

## Hata Yönetimi

**Beklenen hatalar fırlatılmaz, döndürülür.**

```ts
type Result<T, E = AppError> =
  | { ok: true;  data: T }
  | { ok: false; error: E };
```

| Durum | Yöntem |
|---|---|
| Kayıt bulunamadı | `Result` — çağıran karar verir (404 mü, boş liste mi) |
| Doğrulama hatası | `Result` — kullanıcıya gösterilir |
| Dış servis yanıt vermedi | `Result` — önbellekli değere düşülür |
| Programcı hatası (null deref, tip uyuşmazlığı) | **Fırlatılır** — üstteki sınır yakalar |

**Neden bu ayrım:** Bir bölümün verisi gelmediğinde sayfa çökmemeli. `Result` ile çağıran "veri yok" durumunu görüp bölümü sessizce gizler; fırlatma olsaydı tüm sayfa hata sınırına düşerdi.

## Her Dışa Açık Fonksiyonda

- ✅ Açık dönüş tipi (`Promise<Result<T>>` — çıkarıma bırakılmaz)
- ✅ Sınırda Zod doğrulaması — gelen veriye asla güvenilmez
- ✅ Tek sorumluluk
- ✅ Yan etki varsa adında belli (`send…`, `create…`, `sync…`)

## Adlandırma

```
Bileşen            PascalCase.tsx        ProductVariantTable.tsx
Hook               useCamelCase.ts       useQuoteBasket.ts
Yardımcı           camelCase.ts          formatCurrency.ts
Tip / arayüz       PascalCase            ProductVariant
Sabit              UPPER_SNAKE           MAX_BASKET_ITEMS
Klasör             kebab-case            product-catalog/
Migration          <sıra>_<konu>.sql     0001_content_schema.sql
Doküman            UPPER-KEBAB.md        02-DECISIONS.md
```

**Kod ve yapı İngilizce, içerik Türkçe.** Değişken adı `urunListesi` değil `productList`; ama veritabanındaki başlık Türkçe.

## Türkçe Metin İşleme Tuzakları

### `toLowerCase()` kullanmayın

```ts
'I'.toLocaleLowerCase('tr')  // → 'ı'  (noktasız)
'İ'.toLowerCase()            // → 'i' + U+0307 birleşen nokta
```

Slug üretiminde açık harf çevrim tablosu kullanılır:

```ts
const TR_MAP: Record<string, string> = {
  'ç':'c','Ç':'c','ğ':'g','Ğ':'g','ı':'i','I':'i','İ':'i','i':'i',
  'ö':'o','Ö':'o','ş':'s','Ş':'s','ü':'u','Ü':'u',
};
```

Sonra NFKD normalize → `[a-z0-9-]` dışını süz → tireleri sadeleştir.
**Son emniyet:** veritabanında `CHECK (slug->>'tr' ~ '^[a-z0-9]+(-[a-z0-9]+)*$')`.

### Karşılaştırma ve sıralama

Türkçe alfabetik sıralama için `Intl.Collator('tr')` kullanılır — `sort()` varsayılanı yanlış sıralar (`ç` → `c`'den sonra değil, `z`'den sonra gelir).

## Yorum Yazma

Kod ne yaptığını kendi söylemeli; yorum **neden** öyle yapıldığını söyler.

```ts
// ❌ döngüyü çevir
// ✅ Ters sırada yürüyoruz çünkü sıralama sonrası en yeni kayıt sonda kalıyor
```

Özellikle şu durumlarda yorum zorunlu: tuhaf görünen ama gerekli bir çözüm, dış servis kısıtı, `docs/02-DECISIONS.md` kaydına referans.
