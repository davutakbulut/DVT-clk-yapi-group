import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createPublicClient } from '@/core/db/createPublicClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface UiOverride {
  readonly namespace: string;
  readonly key: string;
  readonly value: string;
}

/**
 * Arayüz etiketi override'ları (K-40 istisnası): anonim okur (0009), etiket 'ui_translations' — admin kaydedince düşer.
 * core/i18n'de durur: i18n/request.ts yalnız core'a bakabilir (modül girişine değil, boundaries kuralı).
 */
async function fetchUiOverrides(locale: string): Promise<Result<UiOverride[]>> {
  const client = createPublicClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('ui_translations').select('namespace, key, value').eq('locale', locale).limit(2000);
  if (error) return err(appError('external_service', error.message, { module: 'i18n' }));
  return ok(data);
}

export const getCachedUiOverrides = cached(fetchUiOverrides, ['translations', 'ui'], { tags: [CACHE_TAGS.translations] });

type Messages = Record<string, unknown>;

/** "Header.nav.services" gibi noktalı anahtarı mesaj ağacına yazar; yeni nesne döner (giriş değişmez). */
export function applyOverrides(messages: Messages, overrides: readonly UiOverride[]): Messages {
  if (overrides.length === 0) return messages;
  const out: Messages = structuredClone(messages);
  for (const o of overrides) {
    const path = [o.namespace, ...o.key.split('.')];
    let node: Messages = out;
    for (let i = 0; i < path.length - 1; i += 1) {
      const seg = path[i]!;
      const next = node[seg];
      if (typeof next !== 'object' || next === null) node[seg] = {};
      node = node[seg] as Messages;
    }
    node[path[path.length - 1]!] = o.value;
  }
  return out;
}
