import 'server-only';
import { createServiceClient } from '@/core/db/createServiceClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface NightlySummary {
  readonly day: string;
  readonly heatmapRows: number;
  readonly scrollRows: number;
  readonly purged: number;
}

/** Gece işi (06-ANALYTICS): dünün özeti (sıcaklık/scroll) + 60 günden eski ham olayların silinmesi. Service-role yalnız burada (K-56). */
export async function runAnalyticsNightlyJob(day?: string): Promise<Result<NightlySummary>> {
  const started = Date.now();
  const client = createServiceClient();
  if (!client.ok) return client;
  const db = client.data;
  const target = day ?? new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const finish = async (result: Result<NightlySummary>) => {
    await db.from('cron_heartbeats').upsert(
      { job_key: 'analytics_nightly', expected_interval_seconds: 129600, last_run_at: new Date().toISOString(), last_status: result.ok ? 'ok' : 'error', last_error: result.ok ? null : result.error.message, last_duration_ms: Date.now() - started },
      { onConflict: 'job_key' },
    );
    return result;
  };
  const agg = await db.rpc('aggregate_analytics_day', { p_day: target });
  if (agg.error) return finish(err(appError('external_service', agg.error.message, { module: 'jobs/analytics' })));
  const purge = await db.rpc('purge_old_analytics', { p_keep_days: 60 });
  if (purge.error) return finish(err(appError('external_service', purge.error.message, { module: 'jobs/analytics' })));
  const a = (agg.data ?? {}) as { heatmap_rows?: number; scroll_rows?: number };
  return finish(ok({ day: target, heatmapRows: a.heatmap_rows ?? 0, scrollRows: a.scroll_rows ?? 0, purged: Number(purge.data ?? 0) }));
}
