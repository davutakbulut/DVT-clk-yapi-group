import 'server-only';
import { getSiteUrl } from '@/core/config/site';
import { createServiceClient } from '@/core/db/createServiceClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface HeartbeatSummary {
  readonly stale: number;
  readonly alerted: number;
}

const REPEAT_MS = 6 * 3600_000;

/**
 * Canlılık denetimi (06-ANALYTICS "Üretim izleme"): beklenen sürede kayıt bırakmayan ya da hata veren cron işleri →
 * admin rolüne bildirim + firma e-postasına mail (6 saatte bir yinelenir). Sistem sessizce durursa kimse fark etmez — bu iş fark eder.
 */
export async function runHeartbeatMonitorJob(): Promise<Result<HeartbeatSummary>> {
  const started = Date.now();
  const client = createServiceClient();
  if (!client.ok) return client;
  const db = client.data;
  const finish = async (result: Result<HeartbeatSummary>) => {
    await db.from('cron_heartbeats').upsert(
      { job_key: 'heartbeat_monitor', expected_interval_seconds: 3600, last_run_at: new Date().toISOString(), last_status: result.ok ? 'ok' : 'error', last_error: result.ok ? null : result.error.message, last_duration_ms: Date.now() - started },
      { onConflict: 'job_key' },
    );
    return result;
  };
  const { data: stale, error } = await db.from('stale_cron_jobs').select('job_key, last_run_at, expected_interval_seconds, last_status');
  if (error) return finish(err(appError('external_service', error.message, { module: 'jobs/heartbeat' })));
  const jobs = (stale ?? []).filter((j) => j.job_key !== 'heartbeat_monitor');
  const { data: rows } = await db.from('cron_heartbeats').select('job_key, alerted_at').in('job_key', jobs.map((j) => j.job_key ?? '').filter(Boolean));
  const alertedAt = new Map((rows ?? []).map((r) => [r.job_key, r.alerted_at]));
  const { data: setting } = await db.from('site_settings').select('value').eq('key', 'contact.email').maybeSingle();
  const to = typeof setting?.value === 'string' ? setting.value : null;
  let alerted = 0;
  for (const j of jobs) {
    const key = j.job_key ?? '';
    const last = alertedAt.get(key);
    if (last && Date.now() - new Date(last).getTime() < REPEAT_MS) continue;
    const payload = { job_key: key, last_run_at: j.last_run_at ?? '—', expected: String(j.expected_interval_seconds ?? ''), status: j.last_status ?? 'sessiz', site_url: String(getSiteUrl()) };
    await db.from('notifications').insert({ target_role: 'admin', type: 'system.stale_cron', payload, link_path: '/admin' });
    if (to) await db.from('email_queue').insert({ template_key: 'system.stale_cron', to_email: to, locale: 'tr', payload, priority: 1, related_type: 'cron', related_id: null });
    await db.from('cron_heartbeats').update({ alerted_at: new Date().toISOString() }).eq('job_key', key);
    alerted += 1;
  }
  return finish(ok({ stale: jobs.length, alerted }));
}
