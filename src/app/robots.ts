import type { MetadataRoute } from 'next';
import { getSiteUrl, isSiteIndexable } from '@/core/config/site';

export default function robots(): MetadataRoute.Robots {
  if (!isSiteIndexable()) return { rules: { userAgent: '*', disallow: '/' } };

  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/auth'] },
    host: getSiteUrl().origin,
  };
}
