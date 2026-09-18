'use client';

import { useEffect } from 'react';

/** 404 raporu (🔗 kırık linkler): yol + referrer → /api/errors (kod 404). Tarayıcıdan gider → bot UA'ları sunucuda süzülür. */
export function NotFoundReporter() {
  useEffect(() => {
    const e2e = new URLSearchParams(window.location.search).get('e2e_track') === '1';
    const body = JSON.stringify({ source: 'client', module: 'router', level: 'warn', code: '404', message: `404: ${window.location.pathname}`, path: window.location.pathname, status_code: 404, context: { referrer: document.referrer || null } });
    void fetch(`/api/errors${e2e ? '?e2e_track=1' : ''}`, { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => undefined);
  }, []);
  return null;
}
