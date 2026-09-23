import { unstable_cache } from 'next/cache';
import type { CacheTag } from './tags';

/** Varsayılan yeniden doğrulama: 1 saat. Yazma tarafı `revalidateTag` ile anında düşürür (Faz 5+). */
const DEFAULT_REVALIDATE_SECONDS = 3600;

class CachedFailure extends Error {
  constructor(readonly result: unknown) { super('cached: failure not stored'); }
}
const isFailure = (v: unknown): boolean => typeof v === 'object' && v !== null && 'ok' in v && (v as { ok: unknown }).ok === false;

/**
 * `unstable_cache` sarmalayıcısı (K-46: veri katmanı her zaman etiketli önbellekte).
 * Sarılan fonksiyon `Result` döndürmeli — fırlatırsa önbelleğe yazılmaz ve çağıran katman patlar.
 */
export function cached<TArgs extends readonly unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyParts: readonly string[],
  options: { readonly tags: readonly CacheTag[]; readonly revalidate?: number },
): (...args: TArgs) => Promise<TResult> {
  // K-104: `Result` hatası (ok:false) önbelleğe YAZILMAZ — geçici DB sorunu 1 saat boyunca 404/boş menü olarak donmasın.
  const wrapped = async (...args: TArgs): Promise<TResult> => {
    const result = await fn(...args);
    if (isFailure(result)) throw new CachedFailure(result);
    return result;
  };
  const cachedFn = unstable_cache(wrapped, [...keyParts], { tags: [...options.tags], revalidate: options.revalidate ?? DEFAULT_REVALIDATE_SECONDS });
  return async (...args: TArgs) => {
    try {
      return await cachedFn(...args);
    } catch (e) {
      if (e instanceof CachedFailure) return e.result as TResult;
      throw e;
    }
  };
}
