import { createServerClient } from '@/core/db/createServerClient';
import { INDEXNOW_JOB_KEY, readIndexNowKey } from '@/core/jobs/indexNowParse';

export interface IndexNowStatus {
  readonly configured: boolean;
  readonly lastRunAt: string | null;
  readonly lastStatus: string | null;
  readonly lastError: string | null;
}

/** SEO ayarları: IndexNow anahtarı var mı, son koşu (cron_heartbeats, staff read). Asla fırlatmaz. */
export async function getIndexNowStatus(): Promise<IndexNowStatus> {
  const configured = Boolean(readIndexNowKey());
  const client = await createServerClient();
  if (!client.ok) return { configured, lastRunAt: null, lastStatus: null, lastError: null };
  const { data } = await client.data.from('cron_heartbeats').select('last_run_at, last_status, last_error').eq('job_key', INDEXNOW_JOB_KEY).maybeSingle();
  return { configured, lastRunAt: data?.last_run_at ?? null, lastStatus: data?.last_status ?? null, lastError: data?.last_error ?? null };
}
