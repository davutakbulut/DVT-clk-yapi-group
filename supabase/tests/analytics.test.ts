import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, count, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0035: anonim toplu yazma (RPC), ziyaretçi özeti geri döndürülemez, tablolar anonime kapalı, tekrar gelen pageview güncellenir,
// gece özeti sıcaklık/scroll üretir, purge ham veriyi düşürür ama özeti korur; ayar anahtarı herkese açık, tuz gizli.
describe('0035 · izleyici altyapısı', () => {
  let db: PGlite;
  let users: TestUsers;
  const sid = '11111111-1111-4111-8111-111111111111';
  const pvid = '22222222-2222-4222-8222-222222222222';
  const batch = {
    session: { id: sid, visitor: 'v-abc', device: 'mobile', browser: 'Chrome', os: 'Android', locale: 'tr', referrer_host: 'chatgpt.com', referrer_kind: 'ai', utm: { source: 'x' }, landing_path: '/tr', ip_masked: '10.0.0.0' },
    pageviews: [{ id: pvid, path: '/tr', locale: 'tr', duration_ms: 1200, max_scroll_pct: 40, viewport_w: 390, viewport_h: 800 }],
    events: [
      { pageview_id: pvid, type: 'click', path: '/tr', x_pct: 50.5, y_pct: 12.25, selector: 'a.btn', element_text: 'Teklif' },
      { pageview_id: pvid, type: 'rage_click', path: '/tr', x_pct: 50.5, y_pct: 12.25 },
      { type: 'bogus', path: '' },
    ],
    vitals: [{ path: '/tr', metric: 'LCP', value: 1800.5, rating: 'good' }, { path: '/tr', metric: 'XXX', value: 1 }],
    forms: [{ form_key: 'lead', field_name: 'email', focus: 1, abandon: 1, time_ms: 4000 }],
  };
  beforeAll(async () => {
    db = await createTestDb();
    users = await seedUsers(db);
  });
  afterAll(() => db.close());

  it('anonim RPC ile yazar; tablolar anonime kapalı; kimlik tuzlu özet; bozuk olay/vital düşer', async () => {
    const r = await as(db, anon, async (tx) => (await tx.query<{ r: { pageviews: number; events: number } }>('select public.ingest_analytics($1::jsonb) as r', [JSON.stringify(batch)])).rows[0]!.r);
    expect(r).toEqual({ pageviews: 1, events: 2 });
    await db.query('select public.ingest_analytics($1::jsonb)', [JSON.stringify(batch)]);
    await expect(as(db, anon, (tx) => tx.query('select * from public.analytics_sessions'))).rejects.toThrow();
    const s = (await db.query<{ visitor_hash: string; referrer_kind: string; pageview_count: number; exit_path: string; ip_masked: string }>('select visitor_hash, referrer_kind, pageview_count, exit_path, ip_masked from public.analytics_sessions where id = $1', [sid])).rows[0]!;
    expect(s.visitor_hash).toMatch(/^[0-9a-f]{32}$/);
    expect(s.visitor_hash).not.toContain('v-abc');
    expect(s).toMatchObject({ referrer_kind: 'ai', pageview_count: 1, exit_path: '/tr', ip_masked: '10.0.0.0' });
    expect(await count(db as never, `select * from public.analytics_events where session_id = '${sid}'`)).toBe(2);
    expect(await count(db as never, `select * from public.web_vitals where metric = 'LCP'`)).toBe(1);
    const f = (await db.query<{ focus_count: number; abandon_count: number; total_time_ms: string }>(`select focus_count, abandon_count, total_time_ms from public.form_analytics where form_key = 'lead' and field_name = 'email'`)).rows[0]!;
    expect(f.focus_count).toBe(1);
    expect(Number(f.total_time_ms)).toBe(4000);
    // form alanı içeriği hiçbir kolonda yok
    const cols = (await db.query<{ column_name: string }>(`select column_name from information_schema.columns where table_name = 'form_analytics'`)).rows.map((c) => c.column_name);
    expect(cols).not.toContain('value');
  });

  it('aynı pageview tekrar gelince süre/scroll büyür; oturum günceller; personel okur', async () => {
    await db.query('select public.ingest_analytics($1::jsonb)', [JSON.stringify({ ...batch, pageviews: [{ ...batch.pageviews[0], duration_ms: 9000, max_scroll_pct: 100 }], events: [], vitals: [], forms: [] })]);
    const pv = (await db.query<{ duration_ms: number; max_scroll_pct: number }>('select duration_ms, max_scroll_pct from public.analytics_pageviews where id = $1', [pvid])).rows[0]!;
    expect(pv).toEqual({ duration_ms: 9000, max_scroll_pct: 100 });
    expect(await count(db as never, 'select * from public.analytics_pageviews')).toBe(1);
    expect(await as(db, user(users.ids.viewer), (tx) => count(tx, 'select * from public.analytics_sessions'))).toBe(1);
    await expect(as(db, anon, (tx) => tx.query('select public.ingest_analytics($1::jsonb)', [JSON.stringify({ session: { id: sid, visitor: 'v', device: 'tv' } })]))).rejects.toThrow(/session/);
  });

  it('gece özeti: sıcaklık ve scroll satırları; purge özeti korur, hamı siler; ayar açık, tuz gizli', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const agg = await as(db, user(users.ids.admin), async (tx) => (await tx.query<{ a: { heatmap_rows: number; scroll_rows: number } }>('select public.aggregate_analytics_day($1::date) as a', [today])).rows[0]!.a);
    expect(agg).toEqual({ heatmap_rows: 2, scroll_rows: 1 });
    await expect(as(db, user(users.ids.viewer), (tx) => tx.query('select public.aggregate_analytics_day($1::date)', [today]))).rejects.toThrow(/yetki/);
    await db.query('select public.aggregate_analytics_day($1::date)', [today]);
    const heat = (await db.query<{ kind: string; bucket_x: number; bucket_y: number; hits: number }>(`select kind, bucket_x, bucket_y, hits from public.heatmap_aggregates order by kind`)).rows;
    expect(heat).toEqual([
      { kind: 'click', bucket_x: 50, bucket_y: 12, hits: 1 },
      { kind: 'rage_click', bucket_x: 50, bucket_y: 12, hits: 1 },
    ]);
    const scroll = (await db.query<{ views: number; reached_100: number; device: string }>(`select views, reached_100, device from public.scroll_depth_aggregates`)).rows[0]!;
    expect(scroll).toEqual({ views: 1, reached_100: 1, device: 'mobile' });
    await db.query(`update public.analytics_sessions set started_at = now() - interval '100 days'`);
    const purged = (await db.query<{ n: number }>('select public.purge_old_analytics(60) as n')).rows[0]!.n;
    expect(purged).toBe(1);
    expect(await count(db as never, 'select * from public.analytics_pageviews')).toBe(0);
    expect(await count(db as never, 'select * from public.heatmap_aggregates')).toBe(2);
    const keys = await as(db, anon, async (tx) => (await tx.query<{ key: string }>('select key from public.site_settings')).rows.map((r) => r.key));
    expect(keys).toContain('analytics.config');
    expect(keys).not.toContain('analytics.salt');
  });
});
