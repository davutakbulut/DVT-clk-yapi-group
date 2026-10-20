import { z } from 'zod';
import { appError, err, ok, type Result } from '@/core/errors/result';

const schema = z.object({ url: z.url() });

export type MediaEnv = z.infer<typeof schema>;

/**
 * Herkese açık medyanın kök adresi (K-116): hosting'de ~/public_html/media → https://<site>/media. Tarayıcıya inmesi serbest.
 * NEXT_PUBLIC_MEDIA_URL yoksa site adresinin /media'sı. Fırlatmaz: tanımsızsa görselli bölüm sessizce çizilmez (Kural 3).
 */
export function readMediaEnv(): Result<MediaEnv> {
  // process.env.X biçimi birebir yazılmalı — Next bu ifadeleri derlemede metin olarak değiştirir.
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const parsed = schema.safeParse({ url: process.env.NEXT_PUBLIC_MEDIA_URL ?? (site ? `${site.replace(/\/+$/, '')}/media` : undefined) });
  return parsed.success ? ok(parsed.data) : err(appError('not_configured', 'Medya adresi (NEXT_PUBLIC_MEDIA_URL / NEXT_PUBLIC_SITE_URL) eksik', { module: 'core/storage' }));
}
