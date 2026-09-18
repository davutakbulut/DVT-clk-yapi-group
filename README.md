# CLK Yapı Group — Web Sitesi & Yönetim Sistemi

Çelik konstrüksiyon ve yapı işleri yapan CLK Yapı Group için çift dilli (TR/EN) kurumsal web sitesi ve yönetim paneli.

## Ne İçeriyor

**Ön yüz** — Scroll ile oynayan video hero, hizmetler, ürün kataloğu, projeler, blog, çözüm sayfaları, fiyat rehberi, 3D çelik yapı konfigüratörü, kurumsal sayfalar, teklif sistemi.

**Yönetim paneli** — Tüm içeriğin yönetimi + müşteri kayıtları (CRM), satış ve maliyet takibi, tevkifatlı faturalama, hakediş planı, kârlılık raporları, davranış analitiği ve sıcaklık haritası, hata takip.

## Teknoloji

| Katman | Seçim |
|---|---|
| Çatı | Next.js 15 (App Router) · TypeScript |
| Stil | Tailwind CSS v4 |
| Veritabanı | Supabase (Postgres + Auth + Storage + RLS) |
| Dil | next-intl (TR/EN, locale-prefixed) |
| Animasyon | GSAP + ScrollTrigger · Lenis · Motion |
| Admin UI | shadcn/ui · TanStack Table · Recharts · Tiptap |
| 3D | React Three Fiber |
| Mail | Resend (birincil) + SMTP (yedek), kuyruklu |
| Hosting | Vercel |

## Hızlı Başlangıç

```bash
npm install
cp .env.example .env.local     # değerleri doldurun (Supabase'siz de açılır)
# Yerel Docker YOK (K-47): şema PGlite testleriyle doğrulanır, uzak projeye db push edilir
npm run dev
```

Ön yüz: `http://localhost:3000/tr` · Panel: `http://localhost:3000/admin` *(Faz 5)*

### Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run check` | **PR öncesi hepsi:** lint · typecheck · test · circular · statik veri taraması · build |
| `npm run test` | Vitest birim testleri (`src/**/__tests__/`) |
| `npm run test:e2e` | Playwright + axe — üretim derlemesine karşı, 3 kırılımda |
| `npm run scan:static` | "Sıfır statik veri" kuralı taraması |
| `npm run circular` | Döngüsel bağımlılık denetimi (madge) |
| `npm run test:db` | PGlite üzerinde migration + RLS testleri (~5 sn, Docker'sız) |
| `npm run db:push` | Migration'ları bağlı projeye uygular — hedef izin listesinden doğrulanır |
| `npm run db:types` · `db:report` | Tip üretimi · şema gezgini HTML (`supabase/.temp/`) |
| `npm run media:migrate` · `media:report` | `assets/` → WebP → Storage · medya galerisi HTML (Node ≥ 22.18) |

## Dokümantasyon

**[docs/00-START-HERE.md](docs/00-START-HERE.md) ile başlayın** — hangi işi yapacağınıza göre okuma sırası orada.

| Konu | Yer |
|---|---|
| Kararlar ve gerekçeleri | [docs/02-DECISIONS.md](docs/02-DECISIONS.md) |
| Mimari | [docs/architecture/](docs/architecture/) |
| Veritabanı | [docs/database/](docs/database/) |
| Tasarım sistemi | [docs/design/](docs/design/) |
| Modül spesifikasyonları | [docs/modules/](docs/modules/) |
| Süreçler (SEO, güvenlik, test) | [docs/processes/](docs/processes/) |
| **Güncel durum** | [docs/ROADMAP.md](docs/ROADMAP.md) |
| Değişiklik geçmişi | [docs/CHANGELOG.md](docs/CHANGELOG.md) |
| Katkı kuralları | [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) |

## Temel Kurallar

1. **Sıfır statik veri** — ön yüzde görünen hiçbir içerik koda gömülmez, hepsi veritabanından gelir
2. **Modül sınırları** — modüller yalnız `index.ts` üzerinden konuşur, derin import ESLint'te hata verir
3. **`main` her zaman dağıtılabilir** — yarım iş merge edilmez
4. **Her fazın ön yüzü ve admin'i birlikte biter** — dikey dilim

## Lisans

Özel — CLK Yapı Group'a aittir.
