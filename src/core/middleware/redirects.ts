import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';

export interface RedirectRule {
  readonly source: string;
  readonly target: string | null;
  readonly status: 301 | 302 | 307 | 308 | 410;
}

interface CacheState {
  fetchedAt: number;
  rules: ReadonlyMap<string, RedirectRule>;
}

const TTL_MS = 60_000;
const SKIP = ['/admin', '/api', '/_next', '/auth'];
let state: CacheState | null = null;

function normalize(pathname: string): string {
  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return trimmed || '/';
}

async function loadRules(origin: string): Promise<ReadonlyMap<string, RedirectRule>> {
  const now = Date.now();
  if (state && now - state.fetchedAt < TTL_MS) return state.rules;
  try {
    const res = await fetch(`${origin}/api/redirects`, { headers: { accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as { rules?: RedirectRule[] };
    const map = new Map<string, RedirectRule>();
    for (const r of body.rules ?? []) map.set(normalize(r.source), r);
    state = { fetchedAt: now, rules: map };
  } catch {
    // Liste alınamazsa eski önbellek kalır; hiç yoksa boş: yönlendirme atlanır, site çalışır (K-42)
    state = state ?? { fetchedAt: now, rules: new Map() };
    state = { ...state, fetchedAt: now };
  }
  return state.rules;
}

/**
 * Elle yönlendirmeler (K-61): middleware kuralları /api/redirects'ten 60 sn'de bir çeker, bellekte tutar; eşleşince
 * 301/302/307/308 ya da 410 döner ve isabeti arka planda sayar. Veritabanı yolculuğu yalnız eşleşen isteklerde (hit).
 */
export async function matchRedirect(request: NextRequest, event: NextFetchEvent): Promise<NextResponse | null> {
  const { pathname, origin, search } = request.nextUrl;
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  if (SKIP.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  const rules = await loadRules(origin);
  if (rules.size === 0) return null;
  const rule = rules.get(normalize(pathname));
  if (!rule) return null;
  event.waitUntil(fetch(`${origin}/api/redirects/hit`, { method: 'POST', headers: { 'content-type': 'application/json', ...(process.env['RPC_GATE_SECRET'] ? { 'x-clk-gate': process.env['RPC_GATE_SECRET'] } : {}) }, body: JSON.stringify({ path: rule.source }) }).catch(() => undefined));
  if (rule.status === 410 || !rule.target) return new NextResponse(null, { status: 410 });
  const target = /^https?:\/\//.test(rule.target) ? new URL(rule.target) : new URL(`${rule.target}${rule.target.includes('?') ? '' : search}`, origin);
  return NextResponse.redirect(target, rule.status);
}

/** Test/yeniden yükleme için. */
export function resetRedirectCache(): void {
  state = null;
}
