import 'server-only';
import { getSiteUrl } from '@/core/config/site';
import { createServiceClient } from '@/core/db/createServiceClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { logger } from '@/core/observability/logger';

export interface ReminderSummary {
  readonly checked: number;
  readonly queued: number;
  readonly notified: number;
}

const DAYS_AHEAD = 3;
const REPEAT_DAYS = 7;

/**
 * Hakediş hatırlatması (05-SALES-FINANCE): vadesi ≤ 3 gün kalan ya da geçmiş, bekleyen/kısmi hakedişler → sorumlu personele
 * mail (kuyruk) + panel bildirimi; 7 günde bir yinelenir. Sorumlu yoksa 'sales' rolüne bildirim. Service-role yalnız burada (K-56).
 */
export async function runPaymentRemindersJob(): Promise<Result<ReminderSummary>> {
  const started = Date.now();
  const client = createServiceClient();
  if (!client.ok) return client;
  const db = client.data;
  const finish = async (result: Result<ReminderSummary>) => {
    await db.from('cron_heartbeats').upsert(
      { job_key: 'payment_reminders', expected_interval_seconds: 129600, last_run_at: new Date().toISOString(), last_status: result.ok ? 'ok' : 'error', last_error: result.ok ? null : result.error.message, last_duration_ms: Date.now() - started },
      { onConflict: 'job_key' },
    );
    return result;
  };
  const horizon = new Date(Date.now() + DAYS_AHEAD * 86_400_000).toISOString().slice(0, 10);
  const repeatBefore = new Date(Date.now() - REPEAT_DAYS * 86_400_000).toISOString();
  const { data: due, error } = await db
    .from('payment_schedules')
    .select('id, sale_id, description, amount, due_date, status, reminder_sent_at, sale:sales(sale_no, assigned_to, customer:customers(type, full_name, company_title))')
    .in('status', ['pending', 'partially_paid'])
    .lte('due_date', horizon)
    .or(`reminder_sent_at.is.null,reminder_sent_at.lt.${repeatBefore}`)
    .limit(200);
  if (error) return finish(err(appError('external_service', error.message, { module: 'jobs/reminders' })));
  let queued = 0;
  let notified = 0;
  for (const row of due ?? []) {
    const sale = row.sale as { sale_no?: string; assigned_to?: string | null; customer?: { type?: string; full_name?: string | null; company_title?: string | null } | null } | null;
    const c = sale?.customer ?? null;
    const customer = (c ? (c.type === 'corporate' ? c.company_title || c.full_name : c.full_name || c.company_title) : null) || '—';
    const overdue = row.due_date < new Date().toISOString().slice(0, 10);
    const payload = { sale_no: sale?.sale_no ?? '', customer, description: row.description, due_date: row.due_date, amount: String(row.amount), status: overdue ? 'VADESİ GEÇTİ' : 'yaklaşıyor', admin_path: `/admin/sales/${row.sale_id}/finance`, site_url: String(getSiteUrl()) }; // static-ok: mail değişkeni (şablon metni DB'de), personel dili TR
    const assignee = sale?.assigned_to ?? null;
    let email: string | null = null;
    if (assignee) {
      const { data: u } = await db.auth.admin.getUserById(assignee);
      email = u.user?.email ?? null;
    }
    if (email) {
      const q = await db.from('email_queue').insert({ template_key: 'payment.reminder', to_email: email, locale: 'tr', payload, priority: 2, related_type: 'payment_schedule', related_id: row.id });
      if (q.error) logger.warn('Hatirlatma kuyruga alinamadi', { module: 'jobs/reminders', message: q.error.message });
      else queued += 1;
    }
    const n = await db.from('notifications').insert({ user_id: assignee, target_role: assignee ? null : 'sales', type: overdue ? 'schedule.overdue' : 'schedule.due', payload: { sale_no: payload.sale_no, customer, amount: payload.amount, due_date: row.due_date }, link_path: payload.admin_path });
    if (!n.error) notified += 1;
    await db.from('payment_schedules').update({ reminder_sent_at: new Date().toISOString() }).eq('id', row.id);
  }
  return finish(ok({ checked: due?.length ?? 0, queued, notified }));
}
