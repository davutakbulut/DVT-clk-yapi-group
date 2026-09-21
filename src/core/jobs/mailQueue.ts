import 'server-only';
import { createServiceClient } from '@/core/db/createServiceClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { sendWithFallback } from '@/core/mail/provider';
import { renderMail } from '@/core/mail/render';
import { logger } from '@/core/observability/logger';
import { getSiteUrl } from '@/core/config/site';
import { isReservedTestAddress } from '@/core/mail/reservedAddress';

export interface MailQueueSummary {
  readonly claimed: number;
  readonly sent: number;
  readonly failed: number;
  readonly durationMs: number;
}

const LOCK_TIMEOUT_MS = 5 * 60_000;
const BACKOFF_MINUTES = [1, 5, 15, 60, 360];

/**
 * Kuyruk işçisi (07-MAIL): pending işleri kilitler → şablonu render eder → Resend, olmazsa SMTP → email_logs + durum.
 * Her koşu cron_heartbeats'e iz bırakır; sessiz duruş stale_cron_jobs'ta görünür. Çöken işçinin kilidi zaman aşımıyla düşer.
 */
export async function processMailQueue(limit = 20): Promise<Result<MailQueueSummary>> {
  const started = Date.now();
  const client = createServiceClient();
  if (!client.ok) return client;
  const db = client.data;
  const now = new Date();
  const nowIso = now.toISOString();

  // Kilit: pending ve vadesi gelmiş, ya kilitsiz ya da kilidi bayat olan işler
  const { data: due, error: dueError } = await db
    .from('email_queue')
    .select('id')
    .eq('status', 'pending')
    .lte('next_attempt_at', nowIso)
    .or(`locked_at.is.null,locked_at.lt.${new Date(now.getTime() - LOCK_TIMEOUT_MS).toISOString()}`)
    .order('priority')
    .order('next_attempt_at')
    .limit(limit);
  if (dueError) return finish(db, started, err(appError('external_service', dueError.message, { module: 'jobs/mail' })), 0, 0, 0);
  const ids = (due ?? []).map((r) => r.id);
  if (ids.length === 0) return finish(db, started, ok({ claimed: 0, sent: 0, failed: 0, durationMs: Date.now() - started }), 0, 0, 0);

  const { data: jobs, error: lockError } = await db.from('email_queue').update({ status: 'processing', locked_at: nowIso }).in('id', ids).eq('status', 'pending').select('id, template_key, to_email, to_name, locale, payload, attempts, max_attempts, related_type, related_id');
  if (lockError) return finish(db, started, err(appError('external_service', lockError.message, { module: 'jobs/mail' })), 0, 0, 0);

  const keys = [...new Set((jobs ?? []).map((j) => j.template_key))];
  const { data: templates } = await db.from('email_templates').select('key, subject, body, is_active').in('key', keys);
  const templateByKey = new Map((templates ?? []).map((t) => [t.key, t]));
  const { data: siteNameRow } = await db.from('site_settings').select('value').eq('key', 'site.name').maybeSingle();
  const siteName = ((siteNameRow?.value as { tr?: string } | null)?.tr ?? 'CLK Yapı Group').toString(); // static-ok: son çare marka adı
  const siteUrl = getSiteUrl().origin;

  let sent = 0;
  let failed = 0;
  for (const job of jobs ?? []) {
    // RFC 2606/6761 ayrılmış alan adları (E2E testleri bunları kullanır) gerçek posta kutusu değildir: gönderilmez, iptal edilir.
    // Canlıya geçişte birikmiş test kuyruğu example.com'a gönderilmeye başlamıştı → geri dönen iletiler gönderici itibarını bozar.
    if (isReservedTestAddress(job.to_email)) {
      await db.from('email_queue').update({ status: 'cancelled', locked_at: null, last_error: 'Ayrilmis test adresi: gonderilmedi' }).eq('id', job.id);
      continue;
    }
    const template = templateByKey.get(job.template_key);
    const attempts = job.attempts + 1;
    let outcome: { ok: boolean; provider: 'resend' | 'smtp'; messageId?: string; error?: string };
    let subject = job.template_key;
    if (!template || !template.is_active) {
      outcome = { ok: false, provider: 'resend', error: `Sablon yok ya da pasif: ${job.template_key}` };
    } else {
      const s = template.subject as Record<string, string>;
      const b = template.body as Record<string, string>;
      const locale = job.locale === 'en' && s['en'] && b['en'] ? 'en' : 'tr';
      const rendered = renderMail({ subject: s[locale] ?? '', body: b[locale] ?? '', variables: { ...(job.payload as Record<string, unknown>), site_url: siteUrl }, siteName });
      subject = rendered.subject;
      outcome = await sendWithFallback({ ...rendered, to: job.to_email, toName: job.to_name });
    }
    const { data: log } = await db
      .from('email_logs')
      .insert({ queue_id: job.id, template_key: job.template_key, to_email: job.to_email, subject, provider: outcome.provider, status: outcome.ok ? 'sent' : 'failed', provider_message_id: outcome.messageId ?? null, error: outcome.error ?? null, related_type: job.related_type, related_id: job.related_id })
      .select('id')
      .single();
    if (outcome.ok) {
      sent++;
      await db.from('email_queue').update({ status: 'sent', attempts, locked_at: null, last_error: null }).eq('id', job.id);
      if (job.related_type === 'lead_reply' && job.related_id && log) await db.from('lead_replies').update({ email_log_id: log.id, sent_at: new Date().toISOString() }).eq('id', job.related_id);
    } else {
      failed++;
      const exhausted = attempts >= job.max_attempts;
      const backoff = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)]!;
      await db.from('email_queue').update({ status: exhausted ? 'failed' : 'pending', attempts, locked_at: null, last_error: outcome.error ?? null, next_attempt_at: new Date(Date.now() + backoff * 60_000).toISOString() }).eq('id', job.id);
      logger.warn('Mail gonderilemedi', { module: 'jobs/mail', template: job.template_key, attempts, error: outcome.error });
    }
  }
  return finish(db, started, ok({ claimed: jobs?.length ?? 0, sent, failed, durationMs: Date.now() - started }), jobs?.length ?? 0, sent, failed);
}

async function finish<T>(db: ReturnType<typeof createServiceClient> extends Result<infer C> ? C : never, started: number, result: Result<T>, claimed: number, sent: number, failed: number): Promise<Result<T>> {
  const duration = Date.now() - started;
  await db.from('cron_heartbeats').upsert(
    { job_key: 'mail_queue', expected_interval_seconds: 120, last_run_at: new Date().toISOString(), last_status: result.ok ? 'ok' : 'error', last_error: result.ok ? null : result.error.message, last_duration_ms: duration },
    { onConflict: 'job_key' },
  );
  if (!result.ok) logger.error('Mail kuyrugu kosusu basarisiz', { module: 'jobs/mail', message: result.error.message, claimed, sent, failed });
  return result;
}
