import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, count, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0037: aynı hata tek satır (sayılar/uuid maskeli parmak izi), tekrarında sayaç + yeniden açılma, etkilenen kullanıcı sayımı,
// anonim yazar ama okuyamaz, admin çözer; vitals p75 özeti; şablon + heartbeat satırı.
describe('0037 · hata takip', () => {
  let db: PGlite;
  let users: TestUsers;
  beforeAll(async () => {
    db = await createTestDb();
    users = await seedUsers(db);
  });
  afterAll(() => db.close());

  const report = (p: Record<string, unknown>) => as(db, anon, async (tx) => (await tx.query<{ r: { id: string; new: boolean; reopened?: boolean } }>('select public.report_error($1::jsonb) as r', [JSON.stringify(p)])).rows[0]!.r);

  it('parmak izi: "Kayıt 42 bulunamadı" ve "Kayıt 77 bulunamadı" aynı satır; farklı modül ayrı; anonim tabloyu okuyamaz', async () => {
    const a = await report({ source: 'client', module: 'products', message: 'Kayıt 42 bulunamadı', path: '/tr/urunler/x', visitor: 'v1' });
    expect(a.new).toBe(true);
    // as() geri alır → kalıcı yazım doğrudan
    await db.query('select public.report_error($1::jsonb)', [JSON.stringify({ source: 'client', module: 'products', message: 'Kayıt 42 bulunamadı', path: '/tr/urunler/x', visitor: 'v1' })]);
    const b = (await db.query<{ r: { new: boolean } }>('select public.report_error($1::jsonb) as r', [JSON.stringify({ source: 'client', module: 'products', message: 'Kayıt 77 bulunamadı', path: '/tr/urunler/y', visitor: 'v2' })])).rows[0]!.r;
    expect(b.new).toBe(false);
    await db.query('select public.report_error($1::jsonb)', [JSON.stringify({ source: 'client', module: 'blog', message: 'Kayıt 42 bulunamadı' })]);
    expect(await count(db as never, 'select * from public.error_logs')).toBe(2);
    const row = (await db.query<{ occurrences: number; affected_users: number; path: string }>(`select occurrences, affected_users, path from public.error_logs where module = 'products'`)).rows[0]!;
    expect(row).toEqual({ occurrences: 2, affected_users: 2, path: '/tr/urunler/y' });
    await expect(as(db, anon, (tx) => tx.query('select * from public.error_logs'))).rejects.toThrow();
  });

  it('admin çözer; tekrar görülünce yeniden açılır; viewer çözemez', async () => {
    const id = (await db.query<{ id: string }>(`select id from public.error_logs where module = 'products'`)).rows[0]!.id;
    const affected = await as(db, user(users.ids.admin), async (tx) => (await tx.query(`update public.error_logs set resolved_at = now(), resolved_by = $2 where id = $1`, [id, users.ids.admin])).affectedRows);
    expect(affected).toBe(1);
    await db.query(`update public.error_logs set resolved_at = now(), resolved_by = $2 where id = $1`, [id, users.ids.admin]);
    const r = (await db.query<{ r: { reopened: boolean } }>('select public.report_error($1::jsonb) as r', [JSON.stringify({ source: 'client', module: 'products', message: 'Kayıt 9 bulunamadı' })])).rows[0]!.r;
    expect(r.reopened).toBe(true);
    expect((await db.query<{ resolved_at: string | null }>('select resolved_at from public.error_logs where id = $1', [id])).rows[0]!.resolved_at).toBeNull();
    const viewerWrite = await as(db, user(users.ids.viewer), async (tx) => {
      try {
        return (await tx.query(`update public.error_logs set resolved_at = now() where id = $1`, [id])).affectedRows ?? 0;
      } catch {
        return 0;
      }
    });
    expect(viewerWrite).toBe(0);
  });

  it('vitals p75 özeti; 404 raporu; şablon + heartbeat', async () => {
    await db.query(`insert into public.analytics_sessions (id, visitor_hash, device) values ('33333333-3333-4333-8333-333333333333', 'h', 'desktop')`);
    for (const v of [1000, 2000, 3000, 4000]) await db.query(`insert into public.web_vitals (session_id, path, device, metric, value, rating) values ('33333333-3333-4333-8333-333333333333', '/tr', 'desktop', 'LCP', $1, $2)`, [v, v <= 2500 ? 'good' : v <= 4000 ? 'needs_improvement' : 'poor']);
    const rows = await as(db, user(users.ids.viewer), async (tx) => (await tx.query<{ path: string; metric: string; samples: string; p75: string; good: string }>('select * from public.web_vitals_summary(current_date - 1, current_date)')).rows);
    expect(rows.length).toBe(1);
    expect(Number(rows[0]!.p75)).toBe(3250);
    expect(Number(rows[0]!.good)).toBe(2);
    await db.query('select public.report_error($1::jsonb)', [JSON.stringify({ source: 'client', module: 'router', code: '404', message: 'Sayfa bulunamadı', path: '/tr/eski-link', status_code: 404, context: { referrer: 'https://example.org' } })]);
    expect(await count(db as never, `select * from public.error_logs where code = '404' and status_code = 404`)).toBe(1);
    expect(await count(db as never, `select * from public.email_templates where key = 'system.stale_cron'`)).toBe(1);
    expect(await count(db as never, `select * from public.cron_heartbeats where job_key = 'heartbeat_monitor'`)).toBe(1);
  });
});
