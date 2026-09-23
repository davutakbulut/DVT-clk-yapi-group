import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getCachedSearch } from '../../data/searchRepository';
import { hrefFor, normalizeQuery, splitHighlight } from '../../domain/types';
import { headers } from 'next/headers';
import { appError, err } from '@/core/errors/result';
import { rateLimit } from '@/core/rate-limit';
import { clientIp } from '@/core/request/clientIp';

/** /arama sayfası (K-102): JS'siz de çalışır (GET formu); aynı RPC ve önbellek. */
export async function SearchResults({ locale, q }: { readonly locale: string; readonly q: string | undefined }) {
  const t = await getTranslations('Search');
  const query = normalizeQuery(q);
  // K-104: /arama sayfası da API ile aynı sınırda (IP başına 60/dk); aşımda sorgu çalıştırılmaz
  const allowed = query ? (await rateLimit(`search:${clientIp(await headers())}`, 60, 60)).allowed : true;
  const result = query && allowed ? await getCachedSearch(locale, query, 50) : query ? err(appError('validation', 'search: rate limited', { module: 'search' })) : null;
  const hits = result?.ok ? result.data : [];
  return (
    <div className="grid gap-8">
      <form role="search" method="get" className="site-search-form site-search-form-page">
        <input type="search" name="q" defaultValue={q ?? ''} placeholder={t('placeholder')} aria-label={t('title')} className="field" minLength={2} maxLength={60} autoFocus />
        <button type="submit" className="btn btn-primary">{t('submit')}</button>
      </form>
      {query ? <p className="text-[var(--color-text-muted)]" aria-live="polite">{result && !result.ok ? t('error') : t('count', { count: hits.length, q: query })}</p> : <p className="text-[var(--color-text-muted)]">{t('hint')}</p>}
      {hits.length > 0 ? (
        <ul className="site-search-list site-search-list-page">
          {hits.map((h) => {
            const href = hrefFor(h);
            if (!href) return null;
            return (
              <li key={`${h.kind}:${h.slug}`}>
                <Link href={href as never} className="site-search-item">
                  <span className="site-search-kind label-mono">{t(`kinds.${h.kind}`)}</span>
                  <span className="site-search-title">{splitHighlight(h.title, query!).map((p, k) => (p.hit ? <mark key={k}>{p.text}</mark> : <span key={k}>{p.text}</span>))}</span>
                  <span className="site-search-where">{t(`fields.${h.field}`)}</span>
                  {h.snippet ? <span className="site-search-snippet">{splitHighlight(h.snippet, query!).map((p, k) => (p.hit ? <mark key={k}>{p.text}</mark> : <span key={k}>{p.text}</span>))}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
