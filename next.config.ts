import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Yayın (Faz 12) öncesi ve önizleme dağıtımlarında hiçbir şey indekslenmez.
// İkisi birden gerekir: Vercel üretim ortamı + açık yayın bayrağı.
const isIndexable = process.env.VERCEL_ENV === 'production' && process.env.SITE_INDEXABLE === 'true';

const NOINDEX = { key: 'X-Robots-Tag', value: 'noindex, nofollow' };

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // experiments/ altındaki kendi lockfile'ları kök tespitini şaşırtmasın
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      // K-36: admin her ortamda indeks dışı
      { source: '/admin/:path*', headers: [NOINDEX] },
      ...(isIndexable ? [] : [{ source: '/:path*', headers: [NOINDEX] }]),
    ];
  },
};

export default withNextIntl(nextConfig);
