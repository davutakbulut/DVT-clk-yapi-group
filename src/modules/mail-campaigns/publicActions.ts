'use server';

import { headers } from 'next/headers';
import { z } from 'zod';
import { logger } from '@/core/observability/logger';
import { rateLimit } from '@/core/rate-limit';
import { clientIp } from '@/core/request/clientIp';
import { unsubscribeByToken } from './data/unsubscribeRepository';

export interface UnsubscribeState {
  readonly ok: boolean;
  readonly error?: 'invalid' | 'rateLimited' | 'unexpected';
}

/**
 * "Listeden çık" onayı (K-108): oturumsuz; anahtar e-postadaki bağlantıdan gelir. K-104: IP başına eşik + RPC içinde kapı ve genel eşik.
 * Bilinmeyen anahtar için de aynı ret mesajı döner (anahtar denemesi bilgi sızdırmaz).
 */
export async function confirmUnsubscribe(_prev: UnsubscribeState, formData: FormData): Promise<UnsubscribeState> {
  const token = z.string().uuid().safeParse(formData.get('token'));
  if (!token.success) return { ok: false, error: 'invalid' };
  const limit = await rateLimit(`unsubscribe:${clientIp(await headers())}`, 10, 600);
  if (!limit.allowed) return { ok: false, error: 'rateLimited' };
  const result = await unsubscribeByToken(token.data);
  if (!result.ok) {
    logger.error('Listeden cikma basarisiz', { module: 'mail-campaigns', message: result.error.message });
    return { ok: false, error: 'unexpected' };
  }
  if (result.data === 'limited') return { ok: false, error: 'rateLimited' };
  return result.data === 'done' ? { ok: true } : { ok: false, error: 'invalid' };
}
