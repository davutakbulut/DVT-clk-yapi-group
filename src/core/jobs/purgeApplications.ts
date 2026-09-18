import 'server-only';
import { createServiceClient } from '@/core/db/createServiceClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { logger } from '@/core/observability/logger';

export interface PurgeSummary {
  readonly purged: number;
  readonly filesRemoved: number;
  readonly fileErrors: number;
}

/**
 * KVKK saklama süresi (job_applications.retention_until) dolan başvuruları siler ve CV dosyalarını Storage'dan kaldırır (0004/0028).
 * Cron (günlük) → service-role yalnız burada (K-56). Heartbeat 'purge_applications'.
 */
export async function runPurgeApplicationsJob(): Promise<Result<PurgeSummary>> {
  const started = Date.now();
  const client = createServiceClient();
  if (!client.ok) return client;
  const db = client.data;
  const { data, error } = await db.rpc('purge_expired_job_applications');
  const finish = async (result: Result<PurgeSummary>) => {
    await db.from('cron_heartbeats').upsert(
      { job_key: 'purge_applications', expected_interval_seconds: 129600, last_run_at: new Date().toISOString(), last_status: result.ok ? 'ok' : 'error', last_error: result.ok ? null : result.error.message, last_duration_ms: Date.now() - started },
      { onConflict: 'job_key' },
    );
    return result;
  };
  if (error) return finish(err(appError('external_service', error.message, { module: 'jobs/purge' })));
  const rows = (data ?? []) as { cv_bucket: string; cv_path: string | null }[];
  const byBucket = new Map<string, string[]>();
  for (const r of rows) if (r.cv_path) byBucket.set(r.cv_bucket, [...(byBucket.get(r.cv_bucket) ?? []), r.cv_path]);
  let filesRemoved = 0;
  let fileErrors = 0;
  for (const [bucket, paths] of byBucket) {
    const { data: removed, error: rmError } = await db.storage.from(bucket).remove(paths);
    if (rmError) {
      fileErrors += paths.length;
      logger.warn('CV dosyalari silinemedi', { module: 'jobs/purge', bucket, message: rmError.message });
      continue;
    }
    filesRemoved += removed?.length ?? 0;
  }
  return finish(ok({ purged: rows.length, filesRemoved, fileErrors }));
}
