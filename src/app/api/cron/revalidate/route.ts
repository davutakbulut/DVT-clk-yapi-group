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
  if (!secret || header !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const wanted = (new URL(request.url).searchParams.get('tags') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const known = wanted.filter((k): k is keyof typeof CACHE_TAGS => k in CACHE_TAGS);
  for (const k of known) revalidateTag(CACHE_TAGS[k]);
  return NextResponse.json({ ok: true, revalidated: known, ignored: wanted.filter((k) => !(k in CACHE_TAGS)) });
}
