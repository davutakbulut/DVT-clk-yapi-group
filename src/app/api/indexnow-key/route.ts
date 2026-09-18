import { readIndexNowKey } from '@/core/jobs/indexNow';

export const dynamic = 'force-dynamic';

/** IndexNow anahtar dosyası (keyLocation): düz metin anahtar; yapılandırılmamışsa 404. Gizli değildir (protokol gereği herkese açık). */
export function GET() {
  const key = readIndexNowKey();
  if (!key) return new Response('not configured', { status: 404 });
  return new Response(key, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' } });
}
