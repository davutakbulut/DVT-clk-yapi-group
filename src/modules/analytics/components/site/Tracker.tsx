'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { readConsentFromDocument } from '@/modules/consent';
import { detectDevice, rateVital } from '../../domain/classify';

interface Props {
  readonly locale: string;
  readonly enabled: boolean;
  readonly sampleRate: number;
}

interface Batch {
  pageviews: Record<string, unknown>[];
  events: Record<string, unknown>[];
  vitals: Record<string, unknown>[];
  forms: Record<string, unknown>[];
}

const FLUSH_MS = 10_000;
const VISITOR_KEY = 'clk_vid';
const SESSION_KEY = 'clk_sid';
const rid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

function storage(kind: 'local' | 'session', key: string, make: () => string): string {
  try {
    const s = kind === 'local' ? localStorage : sessionStorage;
    const v = s.getItem(key);
    if (v) return v;
    const n = make();
    s.setItem(key, n);
    return n;
  } catch {
    return make();
  }
}

function selectorOf(el: Element | null): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && parts.length < 4 && node !== document.body) {
    const tag = node.tagName.toLocaleLowerCase('en');
    const id = node.id ? `#${node.id}` : '';
    const cls = !id && node.classList.length > 0 ? `.${Array.from(node.classList).slice(0, 2).join('.')}` : '';
    parts.unshift(`${tag}${id}${cls}`);
    if (id) break;
    node = node.parentElement;
  }
  return parts.join(' > ').slice(0, 200);
}

const CLICKABLE = 'a, button, input, select, textarea, label, summary, [role="button"], [role="link"], [role="tab"], [onclick]';

/**
 * Kendi izleyicimiz (06-ANALYTICS, ~4 KB): onay yoksa HİÇ başlamaz; olaylar biriktirilir, 10 sn'de bir / sayfa kapanırken
 * sendBeacon ile tek istekte gider. Tık (sayfa yüksekliğine göre %), öfke/ölü tık, scroll eşikleri, dikkat (bölüm görünürlüğü),
 * form odak/terk (içerik ASLA yok), Web Vitals (PerformanceObserver). Ziyaretçi kimliği rastgele; sunucu tuzlu özet saklar.
 */
export function Tracker({ locale, enabled, sampleRate }: Props) {
  const pathname = usePathname();
  const started = useRef(false);
  const stateRef = useRef<{ sid: string; vid: string; pvId: string; pvStart: number; maxScroll: number; batch: Batch; clicks: { x: number; y: number; t: number }[]; formFocus: Map<string, number>; attention: Map<string, number> } | null>(null);

  useEffect(() => {
    if (!enabled || started.current) return;
    const consent = readConsentFromDocument();
    const allowed = consent?.analytics === true || new URLSearchParams(window.location.search).get('e2e_track') === '1';
    if (!allowed) {
      const onConsent = () => window.location.reload();
      window.addEventListener('clk:consent', onConsent, { once: true });
      return () => window.removeEventListener('clk:consent', onConsent);
    }
    if (Math.random() > sampleRate) return;
    started.current = true;

    const vid = storage('local', VISITOR_KEY, rid);
    const sid = storage('session', SESSION_KEY, rid);
    const state = { sid, vid, pvId: rid(), pvStart: Date.now(), maxScroll: 0, batch: { pageviews: [], events: [], vitals: [], forms: [] } as Batch, clicks: [] as { x: number; y: number; t: number }[], formFocus: new Map<string, number>(), attention: new Map<string, number>() };
    stateRef.current = state;
    const device = detectDevice(window.innerWidth);
    const utm: Record<string, string> = {};
    for (const [k, v] of new URLSearchParams(window.location.search)) if (/^utm_|^gclid$|^fbclid$/.test(k)) utm[k.replace(/^utm_/, '')] = v.slice(0, 200);

    const pageview = () => ({ id: state.pvId, path: window.location.pathname, locale, viewed_at: new Date(state.pvStart).toISOString(), duration_ms: Date.now() - state.pvStart, max_scroll_pct: state.maxScroll, viewport_w: window.innerWidth, viewport_h: window.innerHeight });

    const flush = (final = false) => {
      const b = state.batch;
      const body = JSON.stringify({ session: { id: sid, visitor: vid, device, locale, referrer: document.referrer || undefined, utm, landing_path: window.location.pathname, viewport_w: window.innerWidth, viewport_h: window.innerHeight }, pageviews: [pageview(), ...b.pageviews].slice(0, 50), events: b.events.slice(0, 200), vitals: b.vitals.slice(0, 20), forms: b.forms.slice(0, 50) });
      state.batch = { pageviews: [], events: [], vitals: [], forms: [] };
      if (final && navigator.sendBeacon) navigator.sendBeacon('/api/analytics/collect', new Blob([body], { type: 'application/json' }));
      else void fetch('/api/analytics/collect', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => undefined);
    };

    const pushEvent = (type: string, extra: Record<string, unknown> = {}) => {
      state.batch.events.push({ pageview_id: state.pvId, type, path: window.location.pathname, occurred_at: new Date().toISOString(), ...extra });
    };
    const docHeight = () => Math.max(document.documentElement.scrollHeight, 1);

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const x = Math.round((e.clientX / Math.max(window.innerWidth, 1)) * 10000) / 100;
      const y = Math.round(((e.clientY + window.scrollY) / docHeight()) * 10000) / 100;
      const now = Date.now();
      state.clicks = state.clicks.filter((c) => now - c.t < 1000);
      state.clicks.push({ x: e.clientX, y: e.clientY, t: now });
      const rage = state.clicks.filter((c) => Math.abs(c.x - e.clientX) < 30 && Math.abs(c.y - e.clientY) < 30).length >= 3;
      const clickable = Boolean(target?.closest(CLICKABLE));
      const text = (target?.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
      pushEvent(rage ? 'rage_click' : clickable ? 'click' : 'dead_click', { x_pct: Math.min(100, x), y_pct: Math.min(100, y), selector: selectorOf(target), element_text: text || undefined });
    };
    const onScroll = () => {
      const pct = Math.min(100, Math.round(((window.scrollY + window.innerHeight) / docHeight()) * 100));
      if (pct > state.maxScroll) state.maxScroll = pct;
    };
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      const form = el?.closest('form');
      const name = (el as HTMLInputElement | null)?.name;
      if (!form || !name || (el as HTMLInputElement).type === 'hidden') return;
      state.formFocus.set(`${form.getAttribute('data-form-key') ?? form.id ?? 'form'}|${name}`, Date.now());
    };
    const onFocusOut = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      const form = el?.closest('form');
      const name = (el as HTMLInputElement | null)?.name;
      if (!form || !name) return;
      const key = `${form.getAttribute('data-form-key') ?? form.id ?? 'form'}|${name}`;
      const t0 = state.formFocus.get(key);
      if (!t0) return;
      state.formFocus.delete(key);
      const [form_key, field_name] = key.split('|') as [string, string];
      state.batch.forms.push({ form_key, field_name, focus: 1, time_ms: Math.min(Date.now() - t0, 600_000) });
    };
    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement | null;
      if (!form) return;
      pushEvent('conversion', { payload: { form: form.getAttribute('data-form-key') ?? form.id ?? 'form' } });
    };
    // Terk: sayfadan çıkarken hâlâ odaklı alan → abandon
    const abandonOpenFields = () => {
      for (const [key, t0] of state.formFocus) {
        const [form_key, field_name] = key.split('|') as [string, string];
        state.batch.forms.push({ form_key, field_name, abandon: 1, time_ms: Math.min(Date.now() - t0, 600_000) });
      }
      state.formFocus.clear();
    };

    // Dikkat: bölümler (section[id]) görünür kaldıkça süre biriktirir; sayfa kapanırken olay olur
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
      for (const en of entries) {
        const id = (en.target as HTMLElement).id;
        if (en.isIntersecting) state.attention.set(id, Date.now());
        else {
          const t0 = state.attention.get(id);
          if (t0) {
            const rect = (en.target as HTMLElement).getBoundingClientRect();
            const y = Math.round(((rect.top + window.scrollY) / docHeight()) * 10000) / 100;
            pushEvent('attention', { x_pct: 50, y_pct: Math.min(100, Math.max(0, y)), selector: `#${id}`, payload: { ms: Date.now() - t0 } });
            state.attention.delete(id);
          }
        }
      }
    }, { threshold: 0.5 }) : null;
    document.querySelectorAll('main section[id]').forEach((s) => io?.observe(s));

    // Web Vitals (PerformanceObserver; kütüphane yok)
    const vital = (metric: 'LCP' | 'CLS' | 'INP' | 'TTFB' | 'FCP', value: number) => state.batch.vitals.push({ path: window.location.pathname, metric, value: Math.round(value * 10000) / 10000, rating: rateVital(metric, value) });
    try {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (nav) vital('TTFB', nav.responseStart);
      let cls = 0;
      let lcp = 0;
      let inp = 0;
      const po = (type: string, cb: (list: PerformanceObserverEntryList) => void, opts: PerformanceObserverInit = {}) => {
        try {
          new PerformanceObserver(cb).observe({ type, buffered: true, ...opts });
        } catch {
          // desteklenmeyen tip
        }
      };
      po('largest-contentful-paint', (l) => { lcp = l.getEntries().at(-1)?.startTime ?? lcp; });
      po('layout-shift', (l) => { for (const e of l.getEntries() as (PerformanceEntry & { hadRecentInput?: boolean; value?: number })[]) if (!e.hadRecentInput) cls += e.value ?? 0; });
      po('event', (l) => { for (const e of l.getEntries()) inp = Math.max(inp, e.duration); }, { durationThreshold: 40 } as PerformanceObserverInit);
      po('paint', (l) => { const f = l.getEntries().find((e) => e.name === 'first-contentful-paint'); if (f) vital('FCP', f.startTime); });
      const finalVitals = () => {
        if (lcp > 0) vital('LCP', lcp);
        vital('CLS', cls);
        if (inp > 0) vital('INP', inp);
      };
      window.addEventListener('pagehide', finalVitals, { once: true });
    } catch {
      // ölçüm yoksa devam
    }

    const timer = window.setInterval(() => flush(false), FLUSH_MS);
    const onHide = () => {
      if (document.visibilityState !== 'hidden') return;
      abandonOpenFields();
      flush(true);
    };
    document.addEventListener('click', onClick, { capture: true, passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', () => flush(true));
    onScroll();
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('click', onClick, { capture: true });
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('submit', onSubmit, true);
      document.removeEventListener('visibilitychange', onHide);
      io?.disconnect();
    };
  }, [enabled, sampleRate, locale]);

  // İstemci gezinmesi: önceki sayfa görüntüsünü kapat, yenisini aç
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    s.batch.pageviews.push({ id: s.pvId, path: s.batch.pageviews.length >= 0 ? window.location.pathname : pathname, locale, viewed_at: new Date(s.pvStart).toISOString(), duration_ms: Date.now() - s.pvStart, max_scroll_pct: s.maxScroll, viewport_w: window.innerWidth, viewport_h: window.innerHeight });
    s.pvId = rid();
    s.pvStart = Date.now();
    s.maxScroll = 0;
  }, [pathname, locale]);

  return null;
}
