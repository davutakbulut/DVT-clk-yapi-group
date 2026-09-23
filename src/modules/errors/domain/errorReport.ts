import { z } from 'zod';

/** /api/errors paketi (istemci penceresi, sunucu logger'ı, 404 sayfası, CSP raporu hepsi buraya iner). */
export const errorReportSchema = z.object({
  source: z.enum(['client', 'server', 'edge', 'cron']).default('client'),
  module: z.string().trim().min(1).max(80).default('unknown'),
  level: z.enum(['warn', 'error', 'fatal']).default('error'),
  code: z.string().trim().max(40).optional(),
  message: z.string().trim().min(1).max(1000),
  stack: z.string().max(8000).optional(),
  path: z.string().max(500).optional(),
  status_code: z.number().int().min(100).max(599).optional(),
  visitor: z.string().max(64).optional(),
  context: z.record(z.string().max(60), z.unknown()).refine((v) => JSON.stringify(v).length <= 2048, 'context').default({}), // K-104: <= 2 KB
});
export type ErrorReport = z.infer<typeof errorReportSchema>;

/** CSP ihlal raporu (report-uri biçimi ya da Reporting API) → hata paketi. */
export function cspReportToError(body: unknown): ErrorReport | null {
  const b = body as { 'csp-report'?: Record<string, unknown> } | Record<string, unknown>[] | null;
  const r = Array.isArray(b) ? (b[0] as { body?: Record<string, unknown> } | undefined)?.body : (b as { 'csp-report'?: Record<string, unknown> } | null)?.['csp-report'];
  if (!r || typeof r !== 'object') return null;
  const directive = String(r['violated-directive'] ?? r['effectiveDirective'] ?? r['effective-directive'] ?? '?').slice(0, 200);
  const blocked = String(r['blocked-uri'] ?? r['blockedURL'] ?? '?').slice(0, 200);
  const doc = String(r['document-uri'] ?? r['documentURL'] ?? '');
  let path: string | undefined;
  try {
    path = doc ? new URL(doc).pathname : undefined;
  } catch {
    path = undefined;
  }
  return { source: 'client', module: 'csp', level: 'warn', code: 'csp', message: `CSP: ${directive} engelledi: ${blocked}`, ...(path ? { path } : {}), context: { directive, blocked } };
}

/** Tarayıcı hata yakalayıcısı için: sayfa başına en çok N rapor, aynı mesaj bir kez. */
export function createClientDedupe(limit = 5) {
  const seen = new Set<string>();
  return (message: string): boolean => {
    if (seen.size >= limit || seen.has(message)) return false;
    seen.add(message);
    return true;
  };
}
