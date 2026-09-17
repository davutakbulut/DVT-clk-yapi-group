# Mimari — Genel Yapı

## Modüler Monolit

Tek Next.js uygulaması, içi **dikey dilimlenmiş** bağımsız modüllerden oluşur. Bir ekip üyesi bir modülde çalışırken diğerinin dosyalarına dokunmaz.

```
src/
├─ modules/<module-name>/
│  ├─ domain/              tipler, Zod şemaları, iş kuralları (SAF — I/O yok)
│  ├─ data/                repository — veritabanına dokunan TEK yer
│  ├─ services/            kullanım senaryoları, orkestrasyon
│  ├─ components/site/     ön yüz bileşenleri
│  ├─ components/admin/    panel bileşenleri
│  ├─ events.ts            yaydığı ve dinlediği olaylar
│  ├─ module.config.ts     route, admin menü, yetki, açık/kapalı bayrağı
│  ├─ __tests__/
│  └─ index.ts             ★ PUBLIC API — dışarıdan sadece bu import edilir
│
├─ core/                   çapraz kesen altyapı
│  ├─ db/                  Supabase istemcileri, bağlantı havuzu
│  ├─ auth/                oturum, rol, yetki (soyutlama)
│  ├─ storage/             dosya yükleme (soyutlama)
│  ├─ realtime/            canlı bildirim (soyutlama)
│  ├─ cache/               unstable_cache sarmalayıcı + etiket sözlüğü
│  ├─ events/              süreç içi olay veri yolu
│  ├─ errors/              Result tipi, hata sınıfları, modül etiketli loglama
│  ├─ mail/                sağlayıcı soyutlaması + kuyruk
│  ├─ middleware/          middleware kompozisyonu (K-13) — test edilebilir, bağımlılıkları dışarıdan alır
│  ├─ config/              site URL, indekslenebilirlik bayrağı
│  └─ observability/       logger, RUM
│
├─ i18n/                   routing (pathnames), navigation, request, RouteAlternates — next-intl kuralı gereği src/i18n
├─ lib/                    saf yardımcılar (slugify…) — herkes import edebilir, kimseyi import etmez
├─ ui/                     ön yüz tasarım sistemi ilkelleri
├─ components/ui/          shadcn — YALNIZ admin
└─ app/                    route'lar — İNCE, sadece modülleri birleştirir
```

## Bağımlılık Kuralları

```
app  →  modules  →  core            ✅ izinli yön
core →  modules                     ❌ yasak
modules/a/… → modules/b/data/…      ❌ derin import yasak
modules/a  → modules/b (index.ts)   ✅ public API
```

**ESLint ile zorlanır** (`eslint-plugin-boundaries` + `no-restricted-imports`). Derleme zamanında hata verir.
**Döngüsel bağımlılık** `madge --circular` ile CI'da yakalanır.

### Neden derin import yasak

`modules/products/data/repository` dışarıdan çağrılabilseydi, o dosyanın iç yapısını değiştirmek başka modülleri kırardı. `index.ts` bir sözleşme: içerisi serbestçe değişir, dışarısı etkilenmez.

### Tablo sahipliği

Her tablo bir modüle aittir. `sales` modülü `products` tablosuna doğrudan SQL atmaz — `products` modülünün public API'sinden ister.

**Neden:** İki geliştirici aynı tabloyu farklı yönlere çektiğinde şema tutarsızlaşır. Sahiplik net olunca değişiklik tek elden gelir.

## Route Dosyaları İnce

`app/[locale]/(marketing)/products/[slug]/page.tsx` en fazla 20–30 satır olmalı:

```tsx
export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const result = await getProductBySlug(locale, slug);   // modülün public API'si
  if (!result.ok) notFound();

  return <ProductDetail data={result.data} />;           // modülün bileşeni
}
```

İş mantığı modülde yaşar. Route yapısı değişse modül etkilenmez, modül değişse route etkilenmez.

## Modüller Arası İletişim

İki yol vardır, üçüncüsü yoktur.

### 1. Public API çağrısı (senkron, tipli)

```ts
import { getProductById } from '@/modules/products';
```

Doğrudan bir veriye ihtiyaç duyulduğunda kullanılır.

### 2. Domain event (yan etkiler)

Yayan modül, dinleyenleri **bilmez**:

```ts
// leads modülü sadece olayı yayar
emit('lead.created', { leadId, source: 'quote_basket' });

// notifications modülü dinler  → panelde bildirim
// mail modülü dinler           → e-posta kuyruğuna yazar
// analytics modülü dinler      → dönüşüm olayı kaydeder
```

**Neden bu ayrım önemli:** Yarın "yeni talepte WhatsApp bildirimi gitsin" istenirse `leads` modülüne **hiç dokunmadan** yeni bir dinleyici eklenir. Ekip çalışmasında çakışan değişikliği en aza indiren tek mekanizma budur.

**Dinleyiciler izole çalışır:** Biri hata verirse diğerleri ve ana işlem etkilenmez; hata modül etiketiyle loglanır.

## MSSQL Geçişine Hazırlık

Proje ileride firmanın kendi MSSQL sunucusuna taşınacak (K-02). Bu geçişi mümkün kılan yapı:

| Önlem | Amaç |
|---|---|
| **Depo arayüzleri** — `data/` katmanı bir `interface` tanımlar, Supabase uygulaması onu gerçekler | Geçişte yalnız gerçekleme değişir, modüllerin geri kalanı dokunulmaz |
| **Supabase istemcisi yalnız `core/db` ve `modules/*/data` içinde** | Sızıntı olmaz; ESLint zorlar |
| **Yetkilendirme RLS'e tek başına bırakılmaz** | RLS kaybolduğunda güvenlik açığı oluşmaz — geçişin en kritik hazırlığı |
| `core/auth` · `core/storage` · `core/realtime` soyutlamaları | Supabase Auth/Storage/Realtime arkada durur |
| Veritabanına özel özelliklerden kaçınma | Taşınabilir karşılıklar tercih edilir |
| Şema dokümanı çift kolonlu (Postgres + MSSQL tipi) | Geçişte tip eşlemesi hazır |

**Ne kırılacak:**

| Supabase özelliği | MSSQL'de | Etki |
|---|---|---|
| RLS (`auth.uid()` ile) | RLS var, oturum entegrasyonu yok | 🔴 Servis katmanı yetkisi devralır |
| Auth | Yok | 🔴 Auth.js veya özel çözüm |
| Storage | Yok | 🟡 Azure Blob / S3 |
| Realtime | Yok | 🟡 SignalR veya yoklama |
| JSONB + ifade indeksi | JSON fonksiyonları var, JSONB tipi yok | 🟡 Hesaplanmış kalıcı kolon |
| `pg_cron` | SQL Server Agent | 🟢 Karşılığı var |

> MSSQL geçişi bu planın 31 fazına **dahil değil** — ayrı bir proje olarak ele alınacak.

## Yeni Modül Ekleme

1. `src/modules/<isim>/` klasörünü yukarıdaki iskeletle oluştur
2. `module.config.ts` yaz (route'lar, admin menü girdisi, gerekli rol, `enabled` bayrağı)
3. Modül kayıt listesine bir satır ekle
4. Bitti — çekirdek koda dokunulmaz
