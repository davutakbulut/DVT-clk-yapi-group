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
    // Faz 7 · hizmetler
    '/services': { tr: '/hizmetler', en: '/services' },
    '/services/[slug]': { tr: '/hizmetler/[slug]', en: '/services/[slug]' },
  },
});

export type Locale = (typeof routing.locales)[number];
export type AppPathname = keyof typeof routing.pathnames;
