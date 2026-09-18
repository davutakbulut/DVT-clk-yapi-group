import { cached } from '@/core/cache/cached';
import { CACHE_TAGS } from '@/core/cache/tags';
import { createPublicClient } from '@/core/db/createPublicClient';
import { readOptions, type QuoteFormOptions } from '../domain/leadSchema';

async function fetchQuoteFormOptions(): Promise<QuoteFormOptions> {
  const client = createPublicClient();
  if (!client.ok) return { projectTypes: [], budgets: [], timelines: [] };
  const { data } = await client.data.from('site_settings').select('value').eq('key', 'quote_form.options').maybeSingle();
  return readOptions(data?.value);
}

export const getCachedQuoteFormOptions = cached(fetchQuoteFormOptions, ['leads', 'form-options'], { tags: [CACHE_TAGS.siteSettings] });
