# RLS ve Yetkilendirme

## Üç Katman

| Katman | Rolü | Atlatılabilir mi |
|---|---|---|
| **Middleware** | Yalnız deneyim — düzgün yönlendirme, panel iskeletinin görünmemesi | ✅ Evet (CVE-2025-29927) |
| **Sunucu bileşeni rol kontrolü** | Asıl kapı — `app/admin/layout.tsx` içinde `getUser()` + rol sorgusu | Zor |
| **RLS** | **Gerçek sınır** — diğer ikisi tamamen atlansa bile boş sonuç döner | ❌ |

> ⚠️ **MSSQL geçişinde RLS kaybolacak** (K-02). Bu yüzden **servis katmanındaki yetki kontrolü açık ve eksiksiz yazılır** — RLS ikinci emniyet kemeri olarak kalır, tek dayanak değil.

## Roller

| Rol | Kim |
|---|---|
| `super_admin` | Sistem sahibi — kullanıcı yönetimi dahil her şey |
| `admin` | Yönetici — içerik, talep, satış, mali veri |
| `editor` | İçerik editörü — yazar, yayınlar; mali veri göremez |
| `sales` | Satış personeli — talep ve satış görür, **maliyet göremez** |
| `viewer` | Salt okuma — raporları izler |
| `member` | Site üyesi — yalnız kendi kayıtları |

## Yetki Matrisi

| Alan | super_admin | admin | editor | sales | viewer | member | anon |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Yayındaki içerik (okuma) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Taslak içerik | ✅ | ✅ | ✅ | ❌ | 👁️ | ❌ | ❌ |
| İçerik yazma (proje/hizmet/ürün/blog) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Kullanıcı yönetimi | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Site ayarları / modül anahtarı | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Talepler | ✅ | ✅ | 👁️ | ✅ | 👁️ | kendi | ❌ |
| Müşteriler | ✅ | ✅ | ❌ | ✅ | 👁️ | ❌ | ❌ |
| Satış — **fiyat** | ✅ | ✅ | ❌ | ✅ | 👁️ | ❌ | ❌ |
| Satış — **maliyet & kâr** | ✅ | ✅ | ❌ | **❌** | ❌ | ❌ | ❌ |
| Fatura & tahsilat | ✅ | ✅ | ❌ | 👁️ | 👁️ | ❌ | ❌ |
| Raporlar | ✅ | ✅ | 👁️ | kısmi | 👁️ | ❌ | ❌ |
| Analitik & sıcaklık haritası | ✅ | ✅ | 👁️ | 👁️ | 👁️ | ❌ | ❌ |
| Konfigürasyonlar | ✅ | ✅ | 👁️ | ✅ | 👁️ | kendi | token ile |
| Denetim kaydı (audit) | ✅ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ |

👁️ = salt okuma · **kendi** = yalnız `user_id = auth.uid()` olan kayıtlar

## Finansal Veri Gizleme

`sales` rolü fiyat görür ama **maliyet ve kâr göremez**. Bu, arayüzde gizlemekle yetinilmez — veritabanı seviyesinde uygulanır.

**Gizlenen kolonlar:**
```
sales.total_cost · sales.gross_profit · sales.margin_pct
sale_items.unit_cost · sale_items.line_cost · sale_items.line_profit
sale_expenses.*  (tüm tablo)
```

**Uygulama:** Maliyet içermeyen bir görünüm (`view`) `sales` rolüne açılır; temel tablolar yalnız `admin` ve `super_admin`'e görünür. Böylece API üzerinden bile çekilemez.

**Neden bu kadar sıkı:** Satış personelinin kâr marjını görmesi, müşteriyle pazarlıkta firmanın aleyhine kullanılabilir. Arayüzde gizlemek yetmez — tarayıcı geliştirici araçlarından ağ isteği incelenebilir.

## Politika Desenleri

### Genel okuma (yayındaki içerik)

```sql
create policy "public read published" on projects
  for select to anon, authenticated
  using (status = 'published');
```

### Editör yazma

```sql
create policy "editors manage" on projects
  for all to authenticated
  using (exists (select 1 from profiles p
                 where p.id = auth.uid()
                   and p.role in ('super_admin','admin','editor')
                   and p.is_active))
  with check (…aynı…);
```

`with check` unutulursa kullanıcı göremediği bir satırı **yazabilir**. `using` okumayı, `with check` yazmayı denetler; ikisi de gerekir.

### Üyenin kendi kaydı

```sql
create policy "own configurations" on configurations
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

### Anonim erişim — doğrudan değil, RPC ile

Anonim konfigürasyonlara tablo erişimi **yoktur**. Yalnız `public_token` alan bir `security definer` fonksiyon üzerinden okunur:

```sql
create function get_configuration_by_token(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(c) from configurations c where c.public_token = p_token;
$$;
```

**Neden RPC:** Tabloyu `anon` rolüne açıp `where public_token = ...` filtresine güvenmek, filtreyi kaldıran bir istekle tüm tablonun çekilmesine yol açar. Fonksiyon parametresi bu riski ortadan kaldırır.

## Service-Role Anahtarı

> **İstekle erişilebilen hiçbir yerde kullanılmaz.** RLS'i tamamen bypass eder.

| Yer | İzin |
|---|---|
| Migration, seed | ✅ |
| Route handler, server action, middleware | ❌ |
| `generateStaticParams` (build) | ⚠️ Mümkünse anon key + public politika |

## Test

RLS politikaları **pgTAP** ile test edilir. Her rol için:

```
□ Görmesi gereken satırları görüyor mu
□ Görmemesi gereken satırları GÖRMÜYOR mu   ← asıl test bu
□ Yazabilmesi gereken satırları yazabiliyor mu
□ Yazmaması gereken satıra yazamıyor mu
```

**En sık atlanan:** İkinci madde. "Admin her şeyi görüyor" testi geçer ama "sales maliyeti görmüyor" testi yazılmazsa açık fark edilmez.

Bitti Tanımı'nda **"RLS yetkisiz rolle test edildi"** maddesi bunu zorunlu kılar.
