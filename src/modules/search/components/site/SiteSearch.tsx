'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useRouter } from '@/i18n/navigation';
import { hrefFor, normalizeQuery, splitHighlight, type SearchHit } from '../../domain/types';

/**
 * Header arama (K-102): büyüteç düğmesi → ≥1024px'de header altında açılan panel, mobilde tam ekran katman.
 * 250 ms gecikme, önceki isteği iptal, son 30 sorgu istemci önbelleğinde; ≥2 karakter; Esc kapatır; Enter → /arama sayfası.
 * Sonuçta tür rozeti + başlık + eşleşen alan ("Başlıkta", "İçerikte", "Ölçü tablosunda") + vurgulu parça.
 */
const CACHE_MAX = 30;

export function SiteSearch() {
  const t = useTranslations('Search');
  const locale = useLocale();
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // portal: header'ın backdrop-filter'ı fixed konumu hapsediyor → body'ye taşınır
  useEffect(() => setMounted(true), []);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cache = useRef(new Map<string, SearchHit[]>());
  const normalized = useMemo(() => normalizeQuery(q), [q]);

  const close = useCallback(() => { setOpen(false); setActive(-1); }, []);
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);
  // "/" kısayolu (bir alanda yazmıyorken)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === '/' && !open && tag !== 'INPUT' && tag !== 'TEXTAREA' && !(e.target as HTMLElement | null)?.isContentEditable) { e.preventDefault(); setOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!normalized) { setHits(null); setBusy(false); return; }
    const key = `${locale}:${normalized.toLocaleLowerCase('tr')}`;
    const hit = cache.current.get(key);
    if (hit) { setHits(hit); return; }
    const timer = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setBusy(true);
      setError(false);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(normalized)}&locale=${locale}`, { signal: ctrl.signal });
        const data = (await res.json()) as { hits: SearchHit[] };
        if (ctrl.signal.aborted) return;
        cache.current.set(key, data.hits);
        if (cache.current.size > CACHE_MAX) cache.current.delete(cache.current.keys().next().value as string);
        setHits(data.hits);
        setActive(-1);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError(true);
      } finally {
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [normalized, locale, open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && hits?.[active]) { const h = hrefFor(hits[active]!); if (h) { router.push(h as never); close(); return; } }
    if (normalized) { router.push({ pathname: '/search', query: { q: normalized } } as never); close(); }
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!hits?.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(hits.length - 1, a + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
  };
  const listId = `${id}-list`;

  return (
    <>
      <button type="button" className="site-search-toggle" aria-label={t('open')} aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen((o) => !o)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      </button>
      {open && mounted ? createPortal(
        <div id={`${id}-panel`} className="site-search" role="dialog" aria-label={t('title')} aria-modal="false">
          <button type="button" className="site-search-backdrop" aria-label={t('close')} tabIndex={-1} onClick={close} />
          <div className="site-search-box">
            <form role="search" onSubmit={submit} className="site-search-form">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="site-search-icon"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input ref={inputRef} type="search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown} placeholder={t('placeholder')} aria-label={t('title')} aria-controls={listId} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} autoComplete="off" enterKeyHint="search" className="site-search-input" />
              <button type="button" className="site-search-close" aria-label={t('close')} onClick={close}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </form>
            <div className="site-search-results" aria-live="polite" aria-busy={busy}>
              {!normalized ? <p className="site-search-hint">{t('hint')}</p> : null}
              {error ? <p className="site-search-hint">{t('error')}</p> : null}
              {normalized && hits && hits.length === 0 && !busy ? <p className="site-search-hint">{t('empty', { q: normalized })}</p> : null}
              {hits && hits.length > 0 ? (
                <ul id={listId} role="listbox" className="site-search-list">
                  {hits.map((h, i) => {
                    const href = hrefFor(h);
                    if (!href) return null;
                    return (
                      <li key={`${h.kind}:${h.slug}`} id={`${listId}-${i}`} role="option" aria-selected={active === i}>
                        <Link href={href as never} className="site-search-item" data-active={active === i ? '' : undefined} onClick={close}>
                          <span className="site-search-kind label-mono">{t(`kinds.${h.kind}`)}</span>
                          <span className="site-search-title">{splitHighlight(h.title, normalized ?? '').map((p, k) => (p.hit ? <mark key={k}>{p.text}</mark> : <span key={k}>{p.text}</span>))}</span>
                          <span className="site-search-where">{t(`fields.${h.field}`)}</span>
                          {h.snippet ? <span className="site-search-snippet">{splitHighlight(h.snippet, normalized ?? '').map((p, k) => (p.hit ? <mark key={k}>{p.text}</mark> : <span key={k}>{p.text}</span>))}</span> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {normalized && hits && hits.length > 0 ? (
                <Link href={{ pathname: '/search', query: { q: normalized } } as never} className="site-search-all" onClick={close}>
                  {t('all', { q: normalized })} →
                </Link>
              ) : null}
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
