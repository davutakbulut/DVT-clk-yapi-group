import { defineRouting } from 'next-intl/routing';

// K-11 · Klasör adları İngilizce, URL'ler çevrili. Anahtar = app/[locale] altındaki klasör yolu.
// Her faz KENDİ route'unu buraya ekler (ekleme yapılan ortak dosya — CONTRIBUTING).
// Sayfası olmayan yol eklenmez: tipli <Link href> 404'e bağlantı üretebilir hâle gelir.
export const routing = defineRouting({
  locales: ['tr', 'en'],
  defaultLocale: 'tr',
  localePrefix: 'always',
  // Bilinçli: Accept-Language: en-US gönderen Türk ziyaretçi /en'e düşmesin;
  // "/" crawler ve edge önbelleği için tek anlamlı kalsın.
  localeDetection: false,
  pathnames: {
    '/': '/',
    // Faz 5 · üyelik
    '/login': { tr: '/giris', en: '/login' },
    '/register': { tr: '/kayit', en: '/register' },
    '/forgot-password': { tr: '/sifremi-unuttum', en: '/forgot-password' },
    '/reset-password': { tr: '/sifre-yenile', en: '/reset-password' },
    '/account': { tr: '/hesabim', en: '/account' },
    // K-103 · hesabım alt bölümleri
    '/account/quotes': { tr: '/hesabim/teklifler', en: '/account/quotes' },
    '/account/quotes/[id]': { tr: '/hesabim/teklifler/[id]', en: '/account/quotes/[id]' },
    '/account/configurations': { tr: '/hesabim/konfigurasyonlar', en: '/account/configurations' },
    '/account/basket': { tr: '/hesabim/sepet', en: '/account/basket' },
    '/account/profile': { tr: '/hesabim/profil', en: '/account/profile' },
    '/account/security': { tr: '/hesabim/guvenlik', en: '/account/security' },
    '/account/notifications': { tr: '/hesabim/bildirimler', en: '/account/notifications' },
    '/account/data': { tr: '/hesabim/verilerim', en: '/account/data' },
    // Faz 7 · hizmetler
    '/services': { tr: '/hizmetler', en: '/services' },
    '/services/[slug]': { tr: '/hizmetler/[slug]', en: '/services/[slug]' },
    // Faz 8 · projeler
    '/projects': { tr: '/projeler', en: '/projects' },
    '/projects/[slug]': { tr: '/projeler/[slug]', en: '/projects/[slug]' },
    '/projects/category/[slug]': { tr: '/projeler/kategori/[slug]', en: '/projects/category/[slug]' },
    // Faz 9 · blog
    '/blog': '/blog',
    '/blog/[slug]': '/blog/[slug]',
    '/blog/category/[slug]': { tr: '/blog/kategori/[slug]', en: '/blog/category/[slug]' },
    '/blog/tag/[slug]': { tr: '/blog/etiket/[slug]', en: '/blog/tag/[slug]' },
    // Faz 10 · talep
    '/contact': { tr: '/iletisim', en: '/contact' },
    '/get-quote': { tr: '/teklif-al', en: '/get-quote' },
    // Faz 11 · kurumsal
    '/about': { tr: '/hakkimizda', en: '/about' },
    '/team': { tr: '/ekibimiz', en: '/team' },
    '/references': { tr: '/referanslarimiz', en: '/references' },
    '/certificates': { tr: '/belgelerimiz', en: '/certificates' },
    '/careers': { tr: '/kariyer', en: '/careers' },
    '/careers/[slug]': { tr: '/kariyer/[slug]', en: '/careers/[slug]' },
    '/faq': { tr: '/sss', en: '/faq' },
    '/search': { tr: '/arama', en: '/search' },
    // Faz 12 · yasal + site haritası
    '/privacy-policy': { tr: '/gizlilik-politikasi', en: '/privacy-policy' },
    '/cookie-policy': { tr: '/cerez-politikasi', en: '/cookie-policy' },
    '/data-protection': { tr: '/kvkk-aydinlatma-metni', en: '/data-protection' },
    '/terms-of-use': { tr: '/kullanim-kosullari', en: '/terms-of-use' },
    '/sitemap': { tr: '/site-haritasi', en: '/sitemap' },
    // Faz 13 · ürün kataloğu
    '/products': { tr: '/urunler', en: '/products' },
    '/products/category/[slug]': { tr: '/urunler/kategori/[slug]', en: '/products/category/[slug]' },
    '/products/[slug]': { tr: '/urunler/[slug]', en: '/products/[slug]' },
    // Faz 15 · çözüm sayfaları
    '/solutions': { tr: '/cozumler', en: '/solutions' },
    '/solutions/[slug]': { tr: '/cozumler/[slug]', en: '/solutions/[slug]' },
    // Faz 26 · konfigüratör (kendi route grubu, K-23)
    '/configurator': { tr: '/konfigurator', en: '/configurator' },
    // Seçim sayfası → tür sayfaları (K-80)
    '/configurator/hall': { tr: '/konfigurator/hol', en: '/configurator/hall' },
    '/configurator/multi-storey': { tr: '/konfigurator/cok-katli', en: '/configurator/multi-storey' },
    '/configurator/cladding': { tr: '/konfigurator/cati-cephe', en: '/configurator/cladding' },
    '/configurator/mezzanine': { tr: '/konfigurator/ara-kat', en: '/configurator/mezzanine' },
    '/configurator/fence': { tr: '/konfigurator/cit-korkuluk', en: '/configurator/fence' },
    '/configurator/drywall': { tr: '/konfigurator/alcipan-duvar', en: '/configurator/drywall' },
    '/configurator/k/[token]': { tr: '/konfigurator/k/[token]', en: '/configurator/k/[token]' },
    '/configurator/k/[token]/print': { tr: '/konfigurator/k/[token]/yazdir', en: '/configurator/k/[token]/print' },
    // Faz 17 · müşteri yorumları
    '/reviews': { tr: '/yorumlar', en: '/reviews' },
    // Faz 16 · fiyat rehberi
    '/pricing': { tr: '/fiyatlar', en: '/pricing' },
    '/pricing/[slug]': { tr: '/fiyatlar/[slug]', en: '/pricing/[slug]' },
    // Faz 14 · teklif sepeti
    '/quote-basket': { tr: '/teklif-sepeti', en: '/quote-basket' },
  },
});

export type Locale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;
