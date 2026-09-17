# Satış ve Finans

Kârlılık takipli mini-ERP modülü. Firmanın en değerli ekranı burasıdır.

## Akış

```
Teklif Talebi (lead) ──┐
                       ├──→ SATIŞ KAYDI ──→ FATURA ──→ TAHSİLAT
Konfigüratör çıktısı ──┘         │
                                 └──→ Tamamlanınca PROJE olarak siteye yayınlanabilir
```

- Gelen talep **tek tıkla satışa dönüştürülür** (müşteri bilgileri otomatik dolar)
- Konfigüratör metrajı **doğrudan satış kalemi olur**
- Tamamlanan satış **referans projesi** olarak ön yüze eklenebilir

## Müşteriler (CRM)

```
tip (bireysel/kurumsal) · ad soyad · firma ünvanı
vergi dairesi · VKN/TCKN · adres · il/ilçe
e-posta · telefon · yetkili kişi · yetkili telefon
notlar · aktif mi · kaynak (talep/konfigüratör/manuel)
```

## Satış Giriş Ekranı

```
┌─ SATIŞ KAYDI ─────────────────────────── SAT-2026-0042 ─┐
│ Müşteri: [Ara/Seç ▾]  [+ Yeni Müşteri]                  │
│ Tarih: [__/__/____]    Durum: [Onaylandı ▾]             │
│ İlişkili Talep: [TLP-0118 ▾]   Proje: [Seç ▾]           │
├─ KALEMLER ──────────────────────────────────────────────┤
│  Hizmet/İşlem    Miktar  Birim  B.Fiyat  Tutar  Maliyet │
│ ▸ Çelik Konstr.    45    ton    52.000  2.340.000 1.820.000│
│ ▸ Kutu Profil      380   m²      1.450    551.000   410.000│
│ ▸ [+ serbest] Vinç kiralama 6 gün 18.000 108.000   95.000│
├─ EK GİDERLER ───────────────────────────────────────────┤
│ ▸ Nakliye ............................... 85.000         │
│ ▸ Konaklama ............................. 22.000         │
├─ FATURA ────────────────────────────────────────────────┤
│ ☑ Faturalı  →  KDV %20 otomatik eklenir                 │
├─ ÖZET ──────────────────────────────────────────────────┤
│ Ara Toplam ......................... 2.999.000 ₺         │
│ İskonto (%2) .......................... -59.980 ₺        │
│ KDV (%20) .......................... +587.804 ₺          │
│ GENEL TOPLAM ....................... 3.526.824 ₺         │
│ ───────────────────────────────────────────────          │
│ Toplam Maliyet ..................... 2.432.000 ₺  🔒     │
│ BRÜT KÂR ........................... 507.020 ₺    🔒     │
│ KÂR MARJI ................................ %17,2  🟢 🔒  │
└──────────────────────────────────────────────────────────┘
```

🔒 = `sales` rolüne **RLS seviyesinde kapalı**
Kâr marjı renk kodlu: 🔴 %10 altı · 🟡 %10-20 · 🟢 %20 üstü

**Kalem tipleri:** hizmet listesinden seçim **veya serbest metin** (vinç kiralama gibi tek seferlik işler için).
**Ek giderler** kaleme bağlı olmayan maliyetler: nakliye, işçilik, vinç/ekipman, yol/konaklama, taşeron.

## Fatura ve Tevkifat

Yapım işlerinde standart oran **4/10**.

```
Matrah ................................. 2.939.020,00 ₺
KDV (%20) ................................ 587.804,00 ₺
Fatura Toplamı ......................... 3.526.824,00 ₺
─────────────────────────────────────────────────────
Tevkifat 4/10 (alıcı beyan eder) ......  -235.121,60 ₺
═════════════════════════════════════════════════════
TAHSİL EDİLECEK TUTAR .................. 3.291.702,40 ₺
```

Oran seçimi: **2/10 · 3/10 · 4/10 · 5/10 · 7/10 · 9/10 · 10/10**, varsayılan kapalı.
Tevkifatlı/tevkifatsız tutarlar raporlarda **ayrı izlenir** — nakit akışını doğrudan etkiliyor.

**Fatura tipleri:** e-Fatura · e-Arşiv · Proforma
**Durum akışı:** kesilmedi → kesildi → gönderildi → ödendi / kısmi ödendi → iptal

## Hakediş / Ödeme Planı

```
┌─ ÖDEME PLANI ───────────────────────────────────────────┐
│  #  Açıklama        Oran    Tutar       Vade      Durum │
│  1  Peşinat          %30   987.510  01.10.2026  ✅ Tahsil│
│  2  Montaj başlangıç %40 1.316.681  15.11.2026  🟡 Bekliyor│
│  3  Teslim           %30   987.511  20.12.2026  ⏳ Bekliyor│
│  Toplam Plan: 3.291.702 ₺ · Tahsil: 987.510 ₺           │
│  Kalan: 2.304.192 ₺                                      │
└──────────────────────────────────────────────────────────┘
```

Vadesi geçen hakedişler dashboard'da **kırmızı uyarı** + sorumlu personele otomatik hatırlatma maili.

## Çoklu Para Birimi

- Satış ₺ / USD / EUR ile girilebilir
- **İşlem tarihindeki TCMB kuru kayda yazılır** (otomatik çekilir, manuel override edilebilir)
- Her kayıtta `para_birimi` + `kur` + `₺_karşılığı` saklanır
- **Tüm raporlar ₺ bazında** birleşir
- Kur farkı kârı/zararı ayrı raporlanır

**Kur neden kaydediliyor:** Kaydedilmezse geçmiş satışlar bugünkü kurla hesaplanır ve tarihsel raporlar bozulur. 2 yıl önceki bir satışın kârı, o günkü kurla hesaplanmalı.

**TCMB servisi çökerse:** en son çekilen kur kullanılır ve "kur X tarihli" notu düşülür — işlem durmaz (devre kesici deseni).

## Raporlar (9)

| Rapor | İçerik |
|---|---|
| **Ciro Özeti** | Aylık/çeyreklik/yıllık grafik, geçen döneme göre değişim |
| **Kârlılık** | Gelir vs maliyet vs kâr trendi, ortalama marj |
| **Hizmet Bazlı** | Hangi hizmet ne kadar ciro ve **kâr** getirdi |
| **Müşteri Bazlı** | En çok ciro yapan müşteriler, müşteri kârlılığı |
| **Fatura Durumu** | Kesilen/kesilmeyen, tahsil edilen/edilmeyen |
| **Alacak Yaşlandırma** | Vadesi geçen: 0-30 / 31-60 / 61-90 / 90+ gün ⚠ |
| **Tahsilat Takvimi** | Yaklaşan vadeler, nakit akış projeksiyonu |
| **Dönüşüm Hunisi** | Talep → Teklif → Satış oranı |
| **Maliyet Dağılımı** | Gider kategorilerinin payı |

Tarih aralığı filtresi + **Excel / PDF export**.

## KVKK ve Yasal Saklama Çatışması

**Sorun:** KVKK "verilerimi silin" hakkı tanır; VUK ticari kayıtların **5 yıl** saklanmasını zorunlu kılar.

**Çözüm — silme değil anonimleştirme:**

| Veri | İşlem |
|---|---|
| `profiles` kaydı | **Tamamen silinir** |
| `customers` / `leads` kişisel alanlar (ad, e-posta, telefon, adres) | **Maskelenir** |
| `invoices`, `sales` | **Saklanır** — vergi kimliğiyle, kişisel veri olmadan |

Kullanıcıya bu durum açıkça bildirilir ve KVKK aydınlatma metnine yazılır.

## Doğrulama

Faz 21 sonunda **tevkifatlı fatura hesabı elle doğrulanır.** Tevkifat hesabı `domain/` katmanında saf fonksiyon olarak yazılır ve birim testi zorunludur — yanlış hesap yanlış fatura demektir.
