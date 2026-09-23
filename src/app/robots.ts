import type { MetadataRoute } from 'next';
import { getSiteUrl, isSiteIndexable } from '@/core/config/site';

// 02-SEO › AI arama görünürlüğü: AI tarayıcılarına AÇIK izin (varsayılan şablonlar engeller; bilinçli açıyoruz).
const AI_BOTS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'ChatGPT-User', 'Google-Extended', 'CCBot', 'Applebot-Extended', 'OAI-SearchBot'];
const PRIVATE = ['/admin', '/api', '/auth', '/tr/hesabim', '/en/account', '/tr/giris', '/en/login', '/tr/kayit', '/en/register', '/tr/arama', '/en/search'];

export default function robots(): MetadataRoute.Robots {
  if (!isSiteIndexable()) return { rules: { userAgent: '*', disallow: '/' } };
  const origin = getSiteUrl().origin;
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: '/', disallow: PRIVATE })),
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
