// Modül etiketli loglama. `error` seviyesi ayrıca /api/errors'a raporlanır (Faz 25): parmak izine göre gruplanır,
// aynı hata bir dakikada bir kez gider. Sunucuda kendi origin'e fetch (fire-and-forget), tarayıcıda göreli yol.
// Test ortamında ve CLK_ERROR_REPORTING=off ile kapalı; çağıranlar için arayüz değişmez.

type LogLevel = 'info' | 'warn' | 'error';

export interface LogContext {
  readonly module: string;
  readonly [key: string]: unknown;
}

const recent = new Map<string, number>();
const DEDUPE_MS = 60_000;

function reportingEnabled(): boolean {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env['NODE_ENV'] === 'test' || process.env['VITEST']) return false;
    if (process.env['CLK_ERROR_REPORTING'] === 'off') return false;
  }
  return true;
}

function safeContext(rest: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (k === 'stack' || k === 'componentStack') continue;
    out[k] = typeof v === 'string' ? v.slice(0, 300) : typeof v === 'number' || typeof v === 'boolean' || v === null ? v : String(v).slice(0, 300);
  }
  return out;
}

function report(level: LogLevel, message: string, context: LogContext): void {
  if (level !== 'error' || !reportingEnabled()) return;
  const key = `${context.module}|${message}`;
  const now = Date.now();
  if ((recent.get(key) ?? 0) > now - DEDUPE_MS) return;
  recent.set(key, now);
  if (recent.size > 500) recent.clear();
  const { module, stack, componentStack, ...rest } = context;
  const isBrowser = typeof window !== 'undefined';
  const body = JSON.stringify({
    source: isBrowser ? 'client' : 'server',
    module,
    level,
    message: message.slice(0, 1000),
    stack: typeof stack === 'string' ? stack.slice(0, 8000) : typeof componentStack === 'string' ? componentStack.slice(0, 8000) : undefined,
    path: isBrowser ? window.location.pathname : undefined,
    context: safeContext(rest),
  });
  try {
    const url = isBrowser ? '/api/errors' : `${process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000'}/api/errors`;
    void fetch(url, { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => undefined);
  } catch {
    // raporlama asla uygulamayı bozmaz
  }
}

function write(level: LogLevel, message: string, context: LogContext): void {
  const { module, ...rest } = context;
  console[level](`[${module}] ${message}`, rest);
  report(level, message, context);
}

export const logger = {
  info: (message: string, context: LogContext): void => write('info', message, context),
  warn: (message: string, context: LogContext): void => write('warn', message, context),
  error: (message: string, context: LogContext): void => write('error', message, context),
};
