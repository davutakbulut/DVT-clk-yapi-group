import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Yayın (Faz 12) öncesi ve önizleme dağıtımlarında hiçbir şey indekslenmez.
// İkisi birden gerekir: üretim ortamı (Vercel üretimi ya da kendi sunucumuzda SITE_ENV=production) + açık yayın bayrağı.
const isIndexable = (process.env.VERCEL_ENV === 'production' || process.env.SITE_ENV === 'production') && process.env.SITE_INDEXABLE === 'true';

const NOINDEX = { key: 'X-Robots-Tag', value: 'noindex, nofollow' };
// 03-SECURITY: temel başlıklar. CSP nonce'suz (JSON-LD ve next/font inline) — Faz 25'te raporlamalı CSP.
const SECURITY = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Faz 25: raporlamalı CSP — ihlaller /api/csp-report'a düşer, engelleme YOK (K-64). Zorlamaya geçiş: rapor temizlenince.
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.google-analytics.com https://www.googletagmanager.com https://www.facebook.com https://places.googleapis.com",
      "frame-src https://www.google.com https://maps.google.com https://www.youtube.com https://www.youtube-nocookie.com",
      "frame-ancestors 'none'",
      'report-uri /api/csp-report',
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  // Dev sunucusu ayrı klasöre yazar: E2E/üretim derlemesi (.next) çalışırken dev sunucusu açık kalabilir, manifestler çakışmaz.
  // NEXT_DIST_DIR: paylaşım tüneli (scripts/share-tunnel.sh) kendi klasöründe derlenir → E2E/derleme onu bozmaz.
  distDir: process.env.NEXT_DIST_DIR ?? (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'),
  // cPanel/VPS paketi (scripts/cpanel-package.sh): node_modules'suz, kendi kendine yeten sunucu çıktısı. Vercel ve dev'de kapalı.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
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
