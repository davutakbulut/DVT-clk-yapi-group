import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0036: huni sıralı değerlendirilir (adım i, i-1'den SONRA); path / path_prefix / event (conversion payload.form) eşleşir;
// admin tanımlar, viewer okur, anonim çağıramaz.
describe('0036 · dönüşüm hunisi', () => {
  let db: PGlite;
  let users: TestUsers;
  let funnelId: string;
  const s = (i: number) => `0000000${i}-0000-4000-8000-00000000000${i}`;
  beforeAll(async () => {
    db = await createTestDb();
    users = await seedUsers(db);
    funnelId = (await db.query<{ id: string }>(`insert into public.funnels (name) values ('Teklif') returning id`)).rows[0]!.id;
    await db.query(`insert into public.funnel_steps (funnel_id, seq, name, match_type, match_value) values ($1, 1, 'Ana sayfa', 'path', '/tr'), ($1, 2, 'Hizmet', 'path_prefix', '/tr/hizmetler'), ($1, 3, 'Teklif formu', 'path', '/tr/teklif-al'), ($1, 4, 'Gönderildi', 'event', 'quote_form')`, [funnelId]);
    for (const i of [1, 2, 3, 4]) await db.query(`insert into public.analytics_sessions (id, visitor_hash, device) values ($1, 'h${i}', 'desktop')`, [s(i)]);
    const pv = (sid: string, path: string, t: string) => db.query(`insert into public.analytics_pageviews (session_id, path, viewed_at) values ($1, $2, $3)`, [sid, path, t]);
    // 1: tam yol, sıralı
    await pv(s(1), '/tr', '2026-09-18T10:00:00Z'); await pv(s(1), '/tr/hizmetler/celik', '2026-09-18T10:01:00Z'); await pv(s(1), '/tr/teklif-al', '2026-09-18T10:02:00Z');
    await db.query(`insert into public.analytics_events (session_id, type, path, device, payload, occurred_at) values ($1, 'conversion', '/tr/teklif-al', 'desktop', '{"form": "quote_form"}', '2026-09-18T10:03:00Z')`, [s(1)]);
    // 2: ilk iki adım
    await pv(s(2), '/tr', '2026-09-18T11:00:00Z'); await pv(s(2), '/tr/hizmetler', '2026-09-18T11:01:00Z');
    // 3: sıra bozuk (hizmet önce, ana sayfa sonra) → yalnız 1. adım
    await pv(s(3), '/tr/hizmetler', '2026-09-18T12:00:00Z'); await pv(s(3), '/tr', '2026-09-18T12:01:00Z');
    // 4: aralık dışı
    await pv(s(4), '/tr', '2026-01-01T09:00:00Z');
  });
  afterAll(() => db.close());

  it('sıralı düşüş: 3 giriş → 2 → 1 → 1; oranlar girişe göre', async () => {
    const r = await as(db, user(users.ids.viewer), async (tx) => (await tx.query<{ r: { entered: number; steps: { seq: number; sessions: number; rate_pct: number }[] } }>('select public.evaluate_funnel($1, $2::date, $3::date) as r', [funnelId, '2026-09-01', '2026-09-30'])).rows[0]!.r);
    expect(r.entered).toBe(3);
    expect(r.steps.map((x) => x.sessions)).toEqual([3, 2, 1, 1]);
    expect(r.steps.map((x) => Number(x.rate_pct))).toEqual([100, 66.7, 33.3, 33.3]);
  });

  it('anonim çağıramaz; viewer huni yazamaz', async () => {
    await expect(as(db, anon, (tx) => tx.query('select public.evaluate_funnel($1, current_date, current_date)', [funnelId]))).rejects.toThrow();
    const wrote = await as(db, user(users.ids.viewer), async (tx) => {
      try {
        return (await tx.query(`insert into public.funnels (name) values ('x')`)).affectedRows ?? 0;
      } catch {
        return 0;
      }
    });
    expect(wrote).toBe(0);
  });
});
