import { secretMatches } from '@/core/rate-limit';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { CACHE_TAGS } from '@/core/cache/tags';

export const dynamic = 'force-dynamic';

/**
 * Önbellek düşürme (K-89): panel dışından yapılan veri değişiklikleri (içerik betikleri, migration) sonrası ilgili etiketler
 * anında yenilenir. `?tags=products,media` — yalnız CACHE_TAGS anahtarları; sırsız istek 401 (cron ucu deseni).
 */
export async function GET(request: Request) {
  const secret = process.env['CRON_SECRET'];
  const header = request.headers.get('authorization') ?? '';
  if (!secretMatches(header.replace(/^Bearer\s+/i, ''), secret)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 }); // sabit zamanlı (K-104)
  const wanted = (new URL(request.url).searchParams.get('tags') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const known = wanted.filter((k): k is keyof typeof CACHE_TAGS => Object.hasOwn(CACHE_TAGS, k));
  for (const k of known) revalidateTag(CACHE_TAGS[k]);
  return NextResponse.json({ ok: true, revalidated: known, ignored: wanted.filter((k) => !(Object.hasOwn(CACHE_TAGS, k))) });
}
