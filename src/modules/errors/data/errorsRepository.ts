import { createPublicClient } from '@/core/db/createPublicClient';
import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import type { Json } from '@/types/database';
import type { ErrorReport } from '../domain/errorReport';

export interface ErrorRow {
  readonly id: string;
  readonly module: string;
  readonly source: string;
  readonly level: string;
  readonly code: string | null;
  readonly message: string;
  readonly stack: string | null;
  readonly path: string | null;
  readonly status_code: number | null;
  readonly user_agent: string | null;
  readonly context: Readonly<Record<string, unknown>>;
  readonly occurrences: number;
  readonly affected_users: number;
  readonly first_seen_at: string;
  readonly last_seen_at: string;
  readonly resolved_at: string | null;
}

export interface BrokenLink {
  readonly path: string;
  readonly hits: number;
  readonly lastSeen: string;
  readonly referrers: readonly string[];
}

export interface VitalRow {
  readonly path: string;
  readonly metric: string;
  readonly samples: number;
  readonly p75: number;
  readonly good: number;
  readonly needsImprovement: number;
  readonly poor: number;
}

const fail = (message: string) => err(appError('external_service', message, { module: 'errors' }));

/** Anonim RPC (0037): parmak izine göre gruplar; hata yutulur (raporlama uygulamayı bozmaz). */
export async function reportError(report: ErrorReport & { readonly ip_masked?: string | null; readonly user_agent?: string | null }): Promise<boolean> {
  const client = createPublicClient();
  if (!client.ok) return false;
  const { error } = await client.data.rpc('report_error', { p: report as unknown as Json });
  return !error;
}

export async function listErrors(filter: { readonly module?: string; readonly source?: string; readonly resolved?: 'open' | 'resolved' | 'all' } = {}): Promise<Result<{ rows: ErrorRow[]; modules: string[] }>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  let q = client.data.from('error_logs').select('id, module, source, level, code, message, stack, path, status_code, user_agent, context, occurrences, affected_users, first_seen_at, last_seen_at, resolved_at').or('code.is.null,code.neq.404').order('last_seen_at', { ascending: false }).limit(200);
  if (filter.module) q = q.eq('module', filter.module);
  if (filter.source) q = q.eq('source', filter.source);
  if (filter.resolved === 'open' || !filter.resolved) q = q.is('resolved_at', null);
  if (filter.resolved === 'resolved') q = q.not('resolved_at', 'is', null);
  const [list, mods] = await Promise.all([q, client.data.from('error_logs').select('module').limit(2000)]);
  if (list.error) return fail(list.error.message);
  return ok({ rows: list.data.map((r) => ({ ...r, context: (typeof r.context === 'object' && r.context !== null ? r.context : {}) as Record<string, unknown> })), modules: [...new Set((mods.data ?? []).map((m) => m.module))].sort() });
}

/** 🔗 Kırık linkler: 404 raporları yola göre; referrer'lar context.last.referrer'dan. */
export async function listBrokenLinks(): Promise<Result<BrokenLink[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('error_logs').select('path, occurrences, last_seen_at, context').eq('code', '404').order('occurrences', { ascending: false }).limit(200);
  if (error) return fail(error.message);
  return ok(
    data.map((r) => {
      const ctx = (r.context ?? {}) as { last?: { referrer?: unknown; referrers?: unknown } };
      const refs = Array.isArray(ctx.last?.referrers) ? (ctx.last!.referrers as unknown[]).map(String) : typeof ctx.last?.referrer === 'string' ? [ctx.last.referrer] : [];
      return { path: r.path ?? '?', hits: r.occurrences, lastSeen: r.last_seen_at, referrers: refs.slice(0, 5) };
    }),
  );
}

/** ⚡ Yavaş sayfalar: p75 (RPC 0037), kötüden iyiye. */
export async function listVitals(from: string, to: string): Promise<Result<VitalRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.rpc('web_vitals_summary', { p_from: from, p_to: to });
  if (error) return fail(error.message);
  return ok((data ?? []).map((r) => ({ path: r.path, metric: r.metric, samples: Number(r.samples), p75: Number(r.p75), good: Number(r.good), needsImprovement: Number(r.needs_improvement), poor: Number(r.poor) })).sort((a, b) => b.poor / Math.max(1, b.samples) - a.poor / Math.max(1, a.samples)));
}

export async function setResolved(id: string, resolved: boolean, userId: string): Promise<Result<void>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { error } = await client.data.from('error_logs').update(resolved ? { resolved_at: new Date().toISOString(), resolved_by: userId } : { resolved_at: null, resolved_by: null }).eq('id', id);
  if (error) return fail(error.message);
  return ok(undefined);
}
