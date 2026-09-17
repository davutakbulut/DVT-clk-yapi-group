import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['tr', 'en'],
  defaultLocale: 'tr',
  localePrefix: 'always',
  localeDetection: false,
  pathnames: {
    '/': '/',
    '/projects/[slug]': { tr: '/projeler/[slug]', en: '/projects/[slug]' },
    '/og-test': '/og-test',
    '/blog/[slug]': '/blog/[slug]',
  },
});
