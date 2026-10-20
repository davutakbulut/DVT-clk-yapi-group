// evaluate_funnel (sıralı huni) MariaDB karşılığı (K-116). MYSQL_TEST_URL yoksa atlanır.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const enabled = !!process.env['MYSQL_URL'] && process.env['MYSQL_URL'] === process.env['MYSQL_TEST_URL'];
const TAG = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

describe.skipIf(!enabled)('evaluate_funnel', async () => {
  const { withTransaction, withConnection } = await import('../pool');
  const { RPCS } = await import('../rpc');
  const admin = { kind: 'user' as const, userId: randomUUID(), role: 'admin' };
  const funnelId = randomUUID();
  const sessions = [randomUUID(), randomUUID(), randomUUID()];
  const sql = async (q: string, p: unknown[] = []) => {
    const r = await withConnection({ kind: 'service' }, async (c) => (await c.query(q, p))[0]);
    if (!r.ok) throw r.error.cause;
    return r.data;
  };
  const call = async (actor: Parameters<typeof withTransaction>[0], args: Record<string, unknown>) => {
    const r = await withTransaction(actor, (c) => RPCS['evaluate_funnel']!(c, actor, args));
    if (!r.ok) throw r.error.cause;
    return r.data;
  };

  beforeAll(async () => {
    await sql('INSERT INTO funnels (id, name) VALUES (?, ?)', [funnelId, JSON.stringify({ tr: TAG })]);
    await sql("INSERT INTO funnel_steps (funnel_id, seq, name, match_type, match_value) VALUES (?, 1, 'Giriş', 'path', ?), (?, 2, 'Ürünler', 'path_prefix', ?), (?, 3, 'Talep', 'event', ?)", [
      funnelId, `/${TAG}`, funnelId, `/${TAG}/urun`, funnelId, `${TAG}-form`,
    ]);
    for (const s of sessions) await sql("INSERT INTO analytics_sessions (id, visitor_hash, device) VALUES (?, ?, 'desktop')", [s, TAG]);
    const pv = (s: string, path: string, at: string) => sql('INSERT INTO analytics_pageviews (session_id, path, viewed_at) VALUES (?, ?, ?)', [s, path, at]);
    // 1. oturum: tüm adımlar sırayla · 2. oturum: ürünü girişten ÖNCE gördü (sayılmaz) · 3. oturum: yalnız giriş
    await pv(sessions[0]!, `/${TAG}`, '2026-10-01 10:00:00');
    await pv(sessions[0]!, `/${TAG}/urun/a`, '2026-10-01 10:05:00');
    await sql("INSERT INTO analytics_events (session_id, type, path, device, occurred_at, payload) VALUES (?, 'conversion', ?, 'desktop', '2026-10-01 10:09:00', ?)", [sessions[0], `/${TAG}`, JSON.stringify({ form: `${TAG}-form` })]);
    await pv(sessions[1]!, `/${TAG}/urun/b`, '2026-10-02 09:00:00');
    await pv(sessions[1]!, `/${TAG}`, '2026-10-02 09:30:00');
    await pv(sessions[2]!, `/${TAG}`, '2026-10-03 12:00:00');
    await pv(sessions[2]!, `/${TAG}`, '2026-11-05 12:00:00'); // aralık dışı
  });

  afterAll(async () => {
    await sql('DELETE FROM analytics_events WHERE session_id IN (?)', [sessions]);
    await sql('DELETE FROM analytics_pageviews WHERE session_id IN (?)', [sessions]);
    await sql('DELETE FROM analytics_sessions WHERE id IN (?)', [sessions]);
    await sql('DELETE FROM funnel_steps WHERE funnel_id = ?', [funnelId]);
    await sql('DELETE FROM funnels WHERE id = ?', [funnelId]);
  });

  it('sıralı ulaşım, oran ve tarih aralığı', async () => {
    expect(await call(admin, { p_funnel_id: funnelId, p_from: '2026-10-01', p_to: '2026-10-31' })).toEqual({
      entered: 3,
      steps: [
        { seq: 1, name: 'Giriş', sessions: 3, rate_pct: 100 },
        { seq: 2, name: 'Ürünler', sessions: 1, rate_pct: 33.3 },
        { seq: 3, name: 'Talep', sessions: 1, rate_pct: 33.3 },
      ],
    });
  });

  it('anonim çalıştıramaz; personel olmayan üye boş görür', async () => {
    await expect(call({ kind: 'anon' }, { p_funnel_id: funnelId, p_from: '2026-10-01', p_to: '2026-10-31' })).rejects.toMatchObject({ code: '42501' });
    expect(await call({ kind: 'user', userId: randomUUID(), role: 'member' }, { p_funnel_id: funnelId, p_from: '2026-10-01', p_to: '2026-10-31' })).toEqual({ entered: 0, steps: [] });
  });
});
