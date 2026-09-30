import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export type UnsubscribeOutcome = 'done' | 'unknown' | 'limited';

/**
 * "Listeden çık" (K-108): anonim RPC (kapı + eşik 0057'de).
 * done → adres engel listesinde · unknown → anahtar tanınmıyor · limited → veritabanı eşiği aşıldı (P0429).
 */
export async function unsubscribeByToken(token: string): Promise<Result<UnsubscribeOutcome>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.rpc('mail_unsubscribe', { p_token: token });
  if (error) return error.code === 'P0429' ? ok('limited') : err(appError('external_service', error.message, { module: 'mail-campaigns' }));
  return ok(data ? 'done' : 'unknown');
}
