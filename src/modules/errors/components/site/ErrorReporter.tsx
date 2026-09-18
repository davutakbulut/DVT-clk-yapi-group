'use client';

import { useEffect } from 'react';
import { createClientDedupe } from '../../domain/errorReport';

/** Tarayıcı hataları: window.onerror + yakalanmamış promise reddi → /api/errors (sayfa başına ≤ 5, aynı mesaj bir kez). Kişisel veri yok. */
export function ErrorReporter() {
  useEffect(() => {
    const allow = createClientDedupe(5);
    let visitor: string | undefined;
    try {
      visitor = localStorage.getItem('clk_vid') ?? undefined;
    } catch {
      visitor = undefined;
    }
    const send = (message: string, stack: string | undefined, extra: Record<string, unknown>) => {
      if (!allow(message)) return;
      const body = JSON.stringify({ source: 'client', module: 'browser', level: 'error', message: message.slice(0, 1000), stack: stack?.slice(0, 8000), path: window.location.pathname, visitor, context: { ...extra, userAgentHint: navigator.userAgent.slice(0, 120) } });
      void fetch('/api/errors', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => undefined);
    };
    const onError = (e: ErrorEvent) => send(e.message || 'Bilinmeyen hata', e.error?.stack, { file: e.filename, line: e.lineno, col: e.colno });
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as { message?: string; stack?: string } | string | undefined;
      send(typeof r === 'string' ? r : (r?.message ?? 'Yakalanmamış promise reddi'), typeof r === 'object' ? r?.stack : undefined, { kind: 'unhandledrejection' }); // static-ok: hata metni, yalnız panelde/logda görünür
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}
