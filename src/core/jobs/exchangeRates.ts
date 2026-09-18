import 'server-only';
import { createServiceClient } from '@/core/db/createServiceClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { parseTcmbXml } from './tcmb';

export interface RatesSummary {
  readonly rateDate: string | null;
  readonly upserted: number;
}

const TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';

/**
 * Günlük kur (K-32): TCMB XML → exchange_rates (currency, rate_date) upsert. Cron hafta içi 15:45 TR sonrası.
 * Servis çökerse iş hata döner ama satış girişi durmaz: form en son çekilen kuru "X tarihli" notuyla kullanır (devre kesici).
 */
export async function runExchangeRatesJob(fetcher: typeof fetch = fetch): Promise<Result<RatesSummary>> {
  const started = Date.now();
  const client = createServiceClient();
  if (!client.ok) return client;
  const db = client.data;
  const finish = async (result: Result<RatesSummary>) => {
    await db.from('cron_heartbeats').upsert(
      { job_key: 'exchange_rates', expected_interval_seconds: 172800, last_run_at: new Date().toISOString(), last_status: result.ok ? 'ok' : 'error', last_error: result.ok ? null : result.error.message, last_duration_ms: Date.now() - started },
      { onConflict: 'job_key' },
    );
    return result;
  };
  let xml: string;
  try {
    const res = await fetcher(TCMB_URL, { cache: 'no-store', headers: { accept: 'application/xml' } });
    if (!res.ok) return finish(err(appError('external_service', `TCMB ${res.status}`, { module: 'jobs/rates' })));
    xml = await res.text();
  } catch (cause) {
    return finish(err(appError('external_service', 'TCMB istegi basarisiz', { module: 'jobs/rates', cause })));
  }
  const rates = parseTcmbXml(xml);
  if (rates.length === 0) return finish(err(appError('validation', 'TCMB XML ayristirilamadi', { module: 'jobs/rates' })));
  const { error } = await db.from('exchange_rates').upsert(
    rates.map((r) => ({ currency: r.currency, rate_date: r.rateDate, rate: r.rate, source: 'tcmb', fetched_at: new Date().toISOString() })),
    { onConflict: 'currency,rate_date' },
  );
  if (error) return finish(err(appError('external_service', error.message, { module: 'jobs/rates' })));
  return finish(ok({ rateDate: rates[0]?.rateDate ?? null, upserted: rates.length }));
}
