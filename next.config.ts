import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Yayın (Faz 12) öncesi ve önizleme dağıtımlarında hiçbir şey indekslenmez.
// İkisi birden gerekir: Vercel üretim ortamı + açık yayın bayrağı.
const isIndexable = process.env.VERCEL_ENV === 'production' && process.env.SITE_INDEXABLE === 'true';

const NOINDEX = { key: 'X-Robots-Tag', value: 'noindex, nofollow' };
// 03-SECURITY: temel başlıklar. CSP nonce'suz (JSON-LD ve next/font inline) — Faz 25'te raporlamalı CSP.
const SECURITY = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  trailingSlash: false,
  // experiments/ altındaki kendi lockfile'ları kök tespitini şaşırtmasın
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      // K-36: admin her ortamda indeks dışı
      { source: '/:path*', headers: SECURITY },
      { source: '/admin/:path*', headers: [NOINDEX] },
      ...(isIndexable ? [] : [{ source: '/:path*', headers: [NOINDEX] }]),
    ];
  },
};

export default withNextIntl(nextConfig);
