import { unstable_cache } from 'next/cache';
import type { CacheTag } from './tags';

/** Varsayılan yeniden doğrulama: 1 saat. Yazma tarafı `revalidateTag` ile anında düşürür (Faz 5+). */
const DEFAULT_REVALIDATE_SECONDS = 3600;

/**
 * `unstable_cache` sarmalayıcısı (K-46: veri katmanı her zaman etiketli önbellekte).
 * Sarılan fonksiyon `Result` döndürmeli — fırlatırsa önbelleğe yazılmaz ve çağıran katman patlar.
 */
export function cached<TArgs extends readonly unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  keyParts: readonly string[],
  options: { readonly tags: readonly CacheTag[]; readonly revalidate?: number },
): (...args: TArgs) => Promise<TResult> {
  return unstable_cache(fn, [...keyParts], { tags: [...options.tags], revalidate: options.revalidate ?? DEFAULT_REVALIDATE_SECONDS });
}
