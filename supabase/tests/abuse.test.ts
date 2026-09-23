import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0052 (K-104): RPC kapısı, veritabanı içi eşik, sarmalayıcılar, boyut kısıtları, anon fonksiyon izin listesi
describe('0052 · kötüye kullanım sertleştirmesi', () => {
  let db: PGlite;
  let users: TestUsers;
  const GATE = 'test-gate-secret-0123456789abcdef';
  const svc = { role: 'service_role' } as const;
  const withGate = (tx: { query: (q: string, p?: unknown[]) => Promise<unknown> }, secret: string | null) =>
    tx.query(`select set_config('request.headers', $1, true)`, [secret ? JSON.stringify({ 'x-clk-gate': secret }) : '{}']);
  const lead = (i: number, email = `abuse${i}@example.com`) => JSON.stringify({ full_name: `Sel ${i}`, email, consent_kvkk: true, message: 'deneme' });
  /** Beklenen hata: savepoint içinde → işlem bozulmaz (aborted transaction) */
  const expectFail = async (tx: { query: (q: string, p?: unknown[]) => Promise<unknown> }, sql: string, params: unknown[], re: RegExp) => {
    await tx.query('savepoint f');
    await expect(tx.query(sql, params)).rejects.toThrow(re);
    await tx.query('rollback to savepoint f');
  };
  beforeAll(async () => { db = await createTestDb(); users = await seedUsers(db); }, 120_000);
  afterAll(async () => { await db.close(); });

  it('kapı yapılandırılmamışken açık; set_rpc_gate yalnız service_role; sonra başlıksız çağrı reddedilir, doğru başlıkla geçer', async () => {
    await as(db, anon, async (tx) => { expect((await tx.query<{ ok: boolean }>('select public.rpc_gate_ok() as ok')).rows[0]!.ok).toBe(true); });
    await as(db, user(users.ids.admin), async (tx) => { await expectFail(tx, 'select public.set_rpc_gate($1)', [GATE], /permission|yetki/); });
    await db.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', false)`);
    await db.query('select public.set_rpc_gate($1)', [GATE]);
    await db.query(`select set_config('request.jwt.claims', '', false)`);
    await as(db, anon, async (tx) => {
      expect((await tx.query<{ ok: boolean }>('select public.rpc_gate_ok() as ok')).rows[0]!.ok).toBe(false);
      await expectFail(tx, 'select public.submit_lead($1::jsonb)', [lead(1)], /rpc_gate/);
      await expectFail(tx, `select * from public.search_site('tr', 'kutu', 10)`, [], /rpc_gate/);
    });
    await as(db, anon, async (tx) => {
      await withGate(tx, 'yanlis-sir');
      await expectFail(tx, 'select public.submit_lead($1::jsonb)', [lead(1)], /rpc_gate/);
    });
    await as(db, anon, async (tx) => {
      await withGate(tx, GATE);
      const r = (await tx.query<{ r: { ref_no: string } }>('select public.submit_lead($1::jsonb) as r', [lead(1)])).rows[0]!.r;
      expect(r.ref_no).toMatch(/^TLP-/);
      expect((await tx.query(`select * from public.search_site('tr', 'kutu', 10)`)).rows).toBeDefined();
    });
    // service_role başlıksız da geçer (arka plan işleri)
    await as(db, svc, async (tx) => { expect((await tx.query<{ ok: boolean }>('select public.rpc_gate_ok() as ok')).rows[0]!.ok).toBe(true); });
  });

  it('_impl fonksiyonları anon/authenticated tarafından çağrılamaz; anon çalıştırabildiği fonksiyonlar izin listesiyle sınırlı', async () => {
    const rows = (await db.query<{ name: string }>(`
      select p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1`)).rows.map((r) => r.name);
    expect(rows.filter((n) => n.endsWith('_impl'))).toEqual([]);
    const ALLOWED = ['get_blog_post_by_slug', 'get_configuration_by_token', 'get_price_guide_by_slug', 'get_product_by_slug', 'get_project_by_slug', 'get_service_by_slug', 'get_solution_by_slug',
      'ingest_analytics', 'record_redirect_hit', 'report_error', 'resolve_old_slug', 'rpc_gate_ok', 'save_configuration', 'search_site', 'set_configuration_sharing', 'submit_job_application', 'submit_lead', 'submit_testimonial'];
    // Supabase varsayılanı: public'teki her fonksiyon anon'a açıktır; rol denetimi gövdede yapılanlar (reply_lead vb.) buraya girmez → yalnız KAPISIZ yazma fonksiyonu olmadığını doğrula
    const writers = rows.filter((n) => /^(submit_|save_|ingest_|report_|record_|set_configuration)/.test(n));
    expect(writers.every((n) => ALLOWED.includes(n))).toBe(true);
    expect(ALLOWED.filter((n) => !rows.includes(n))).toEqual([]);
  });

  it('eşik: aynı e-postayla 4. talep ve global 61. talep reddedilir; hata kodu P0429', async () => {
    await as(db, anon, async (tx) => {
      await withGate(tx, GATE);
      for (let i = 1; i <= 3; i++) await tx.query('select public.submit_lead($1::jsonb)', [lead(i, 'ayni@example.com')]);
      await expectFail(tx, 'select public.submit_lead($1::jsonb)', [lead(4, 'ayni@example.com')], /rate_limited/);
    });
    await as(db, anon, async (tx) => {
      await withGate(tx, GATE);
      for (let i = 1; i <= 60; i++) await tx.query('select public.submit_lead($1::jsonb)', [lead(i)]);
      await expectFail(tx, 'select public.submit_lead($1::jsonb)', [lead(61)], /rate_limited/);
    });
  });

  it('boyut: 40 KB gövde reddedilir; report_error 4 KB üstü context düşürülür; search_site kısa/uzun sorguda boş döner', async () => {
    await as(db, anon, async (tx) => {
      await withGate(tx, GATE);
      const big = JSON.stringify({ full_name: 'X', email: 'big@example.com', consent_kvkk: true, message: 'a'.repeat(40_000) });
      await expectFail(tx, 'select public.submit_lead($1::jsonb)', [big], /çok büyük/);
      const ctx = JSON.stringify({ source: 'client', module: 'm', level: 'error', message: 'boyut testi', context: { blob: 'b'.repeat(5000) } });
      await tx.query('select public.report_error($1::jsonb)', [ctx]);
      await tx.query('reset role');
      const row = (await tx.query<{ context: Record<string, unknown> }>(`select context from public.error_logs where message = 'boyut testi'`)).rows[0]!;
      expect(JSON.stringify(row.context).length).toBeLessThan(1000);
      await tx.query('set local role anon');
      expect((await tx.query(`select * from public.search_site('tr', 'k', 10)`)).rows).toEqual([]);
      expect((await tx.query(`select * from public.search_site('tr', $1, 10)`, ['x'.repeat(61)])).rows).toEqual([]);
    });
  });

  it('doğrudan tablo yazmaları: yorum INSERT kapısız reddedilir; profiles.saved_basket 16 KB üstü reddedilir', async () => {
    const post = (await db.query<{ id: string }>(`insert into public.blog_posts (slug, title, body, status, published_locales, allow_comments, published_at) values ('{"tr":"kapi-test"}', '{"tr":"Kapı"}', '{"tr":"…"}', 'published', '{tr}', true, now()) returning id`)).rows[0]!.id;
    await as(db, anon, async (tx) => {
      await expectFail(tx, `insert into public.post_comments (post_id, author_name, body, locale) values ($1, 'A', 'Merhaba dünya', 'tr')`, [post], /row-level security/);
    });
    await as(db, anon, async (tx) => {
      await withGate(tx, GATE);
      await tx.query(`insert into public.post_comments (post_id, author_name, body, locale) values ($1, 'A', 'Merhaba dünya', 'tr')`, [post]);
      await expectFail(tx, `insert into public.post_comments (post_id, author_name, body, locale) values ($1, $2, 'Merhaba dünya', 'tr')`, [post, 'n'.repeat(81)], /post_comments_author_len/);
    });
    await as(db, user(users.ids.member), async (tx) => {
      await expectFail(tx, `update public.profiles set saved_basket = $1::jsonb where id = $2`, [JSON.stringify(Array.from({ length: 400 }, (_, i) => ({ productId: `p${i}`, name: 'x'.repeat(40) }))), users.ids.member], /profiles_sizes/);
      await tx.query(`update public.profiles set saved_basket = '[{"productId":"p1"}]'::jsonb where id = $1`, [users.ids.member]);
      await tx.query('reset role');
      // yalnız sepet değişti → denetim satırı yazılmaz
      expect((await tx.query<{ n: number }>(`select count(*)::int as n from public.audit_logs where table_name = 'profiles' and row_id::text = $1 and action = 'update'`, [users.ids.member])).rows[0]!.n).toBe(0);
    });
  });

  it('customer_lead_message: üye başına saatte 5', async () => {
    const m = users.ids.member;
    await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: m, role: 'authenticated' })]);
    await db.query(`select set_config('request.headers', $1, false)`, [JSON.stringify({ 'x-clk-gate': GATE })]);
    const id = (await db.query<{ r: { id: string } }>('select public.submit_lead($1::jsonb) as r', [lead(9, 'member@test.local')])).rows[0]!.r.id;
    await db.query(`select set_config('request.jwt.claims', '', false)`); await db.query(`select set_config('request.headers', '', false)`);
    await as(db, user(m), async (tx) => {
      await withGate(tx, GATE);
      for (let i = 0; i < 5; i++) await tx.query('select public.customer_lead_message($1, $2, $3)', [id, 'reply', `mesaj ${i} gönderiyorum`]);
      await expectFail(tx, 'select public.customer_lead_message($1, $2, $3)', [id, 'reply', 'altıncı mesaj'], /rate_limited/);
    });
  });

  it('bakım: eski hata/bildirim/eşik satırları silinir', async () => {
    await db.query(`insert into public.error_logs (fingerprint, module, source, level, message, last_seen_at, first_seen_at) values ('old', 'm', 'client', 'error', 'eski', now() - interval '100 days', now() - interval '100 days')`);
    await db.query(`insert into app_private.throttle values ('k', now() - interval '2 days', 1)`);
    await db.query('select app_private.run_maintenance()');
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.error_logs where fingerprint = 'old'`)).rows[0]!.n).toBe(0);
    expect((await db.query<{ n: number }>(`select count(*)::int as n from app_private.throttle where key = 'k'`)).rows[0]!.n).toBe(0);
  });
});
