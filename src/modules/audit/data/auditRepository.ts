import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface AuditRow {
  readonly id: string;
  readonly action: string;
  readonly table_name: string;
  readonly row_id: string | null;
  readonly old_data: Readonly<Record<string, unknown>> | null;
  readonly new_data: Readonly<Record<string, unknown>> | null;
  readonly created_at: string;
  readonly actorName: string;
}

export interface AuditFilter {
  readonly table?: string;
  readonly actor?: string;
  readonly limit?: number;
}

const fail = (message: string) => err(appError('external_service', message, { module: 'audit' }));

/** Denetim kaydı (0001: yalnız-ekleme, super_admin/admin okur). Tablo/aktör süzgeci, son 100. */
export async function listAuditLogs(filter: AuditFilter = {}): Promise<Result<{ rows: AuditRow[]; tables: string[] }>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  let q = client.data.from('audit_logs').select('id, action, table_name, row_id, old_data, new_data, created_at, actor:profiles!audit_logs_actor_id_fkey(full_name)').order('created_at', { ascending: false }).limit(filter.limit ?? 100);
  if (filter.table) q = q.eq('table_name', filter.table);
  if (filter.actor) q = q.eq('actor_id', filter.actor);
  const [list, tables] = await Promise.all([q, client.data.from('audit_logs').select('table_name').limit(1000)]);
  if (list.error) return fail(list.error.message);
  const rows = list.data.map((r) => {
    const actor = r.actor as { full_name?: string | null } | null;
    return { id: r.id, action: r.action, table_name: r.table_name, row_id: r.row_id, old_data: (r.old_data ?? null) as AuditRow['old_data'], new_data: (r.new_data ?? null) as AuditRow['new_data'], created_at: r.created_at, actorName: actor?.full_name || '—' };
  });
  const tableNames = Array.from(new Set((tables.data ?? []).map((t) => t.table_name))).sort();
  return ok({ rows, tables: tableNames });
}

/** Değişen alanlar: eski/yeni farkı (uzun JSON yerine yalnız değişenler). */
export function changedFields(row: Pick<AuditRow, 'old_data' | 'new_data'>): { key: string; from: unknown; to: unknown }[] {
  const keys = new Set([...Object.keys(row.old_data ?? {}), ...Object.keys(row.new_data ?? {})]);
  const out: { key: string; from: unknown; to: unknown }[] = [];
  for (const k of keys) {
    if (k === 'updated_at') continue;
    const from = row.old_data?.[k];
    const to = row.new_data?.[k];
    if (JSON.stringify(from) !== JSON.stringify(to)) out.push({ key: k, from, to });
  }
  return out;
}
