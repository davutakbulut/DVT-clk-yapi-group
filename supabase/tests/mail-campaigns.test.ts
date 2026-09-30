import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, cannotWrite, count, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0057 (K-108): toplu e-posta — kitle çözümü ve izin kuralları, taslak/başlat/duraklat/iptal, listeden çıkma, yetki sınırı
describe('0057 · toplu e-posta', () => {
  let db: PGlite;
  let users: TestUsers;
  type Tx = { query: <T>(q: string, p?: unknown[]) => Promise<{ rows: T[] }> };
  /** Kalıcı (geri alınmayan) çağrı: superuser oturumunda JWT claim'i verilir → auth.uid() ve rol denetimi gerçek gibi çalışır */
  const persist = async <T>(userId: string, sql: string, params: unknown[] = []) => {
    await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: userId, role: 'authenticated' })]);
    try { return (await db.query<T>(sql, params)).rows; } finally { await db.query(`select set_config('request.jwt.claims', '', false)`); }
  };
  const expectFail = async (tx: Tx, sql: string, params: unknown[], re: RegExp) => {
    await tx.query('savepoint f');
    await expect(tx.query(sql, params)).rejects.toThrow(re);
    await tx.query('rollback to savepoint f');
  };
  const AUDIENCE = { segments: ['customers_corporate', 'customers_individual', 'leads'], manual: [{ email: 'Elle@Firma.Local', name: 'Elle Eklenen' }, { email: 'bozuk-adres' }, { email: 'kurumsal@firma.local', name: 'Tekrar' }], manual_attested: true };
  const campaign = (extra: Record<string, unknown> = {}) => JSON.stringify({ name: 'Eylül duyurusu', locale: 'tr', subject: 'Yeni ürünlerimiz', body: 'Merhaba {{full_name}},\n\nYeni ürünlerimizi inceleyin.', audience: AUDIENCE, ...extra });

  beforeAll(async () => {
    db = await createTestDb();
    users = await seedUsers(db);
    await db.query(`insert into public.customers (type, company_title, contact_person, email, city, is_active, marketing_consent) values
      ('corporate', 'Kurumsal A.Ş.', 'Ayşe Yetkili', 'Kurumsal@Firma.Local', 'İzmir', true, false),
      ('corporate', 'Pasif Ltd.', null, 'pasif@firma.local', 'İzmir', false, false),
      ('corporate', 'Test Alanı A.Ş.', null, 'kimse@example.com', 'İzmir', true, false)`);
    await db.query(`insert into public.customers (type, full_name, email, city, marketing_consent) values
      ('individual', 'İzinli Birey', 'izinli@birey.local', 'Ankara', true),
      ('individual', 'İzinsiz Birey', 'izinsiz@birey.local', 'Ankara', false)`);
    await db.query(`insert into public.leads (source, full_name, company, email, city, consent_kvkk_at, consent_marketing) values
      ('quote_form', 'Talep İzinli', 'Talep Ltd.', 'talep@izinli.local', 'İzmir', now(), true),
      ('quote_form', 'Talep İzinsiz', null, 'talep@izinsiz.local', 'İzmir', now(), false),
      ('contact_form', 'Aynı Adres', null, 'kurumsal@firma.local', 'İzmir', now(), true),
      ('contact_form', 'Çıkmış Kişi', null, 'cikmis@kisi.local', 'Bursa', now(), true)`);
    await persist(users.ids.admin, `select public.add_mail_suppression('Cikmis@Kisi.local', 'bounced', 'geri döndü')`);
  }, 120_000);
  afterAll(async () => { await db.close(); });

  it('yetki: anonim/üye/satış RPC çağıramaz ve tabloları göremez; admin tabloya DOĞRUDAN yazamaz', async () => {
    await as(db, anon, async (tx) => { await expectFail(tx as Tx, 'select public.save_mail_campaign($1::jsonb)', [campaign()], /permission|denied|yetki/i); });
    for (const role of ['member', 'sales', 'editor', 'viewer'] as const) {
      await as(db, user(users.ids[role]), async (tx) => {
        await expectFail(tx as Tx, 'select public.save_mail_campaign($1::jsonb)', [campaign()], /yetki yok/);
        await expectFail(tx as Tx, 'select public.mail_audience_preview($1::jsonb)', [JSON.stringify(AUDIENCE)], /yetki yok/);
        expect(await count(tx, 'select 1 from public.mail_suppressions')).toBe(0);
      });
    }
    await expect(as(db, anon, (tx) => tx.query('select * from public.mail_campaign_recipients'))).rejects.toThrow(/permission|denied/i);
    await as(db, user(users.ids.admin), async (tx) => {
      expect(await cannotWrite(tx, `insert into public.mail_campaigns (name) values ('doğrudan')`)).toBe(true);
      expect(await cannotWrite(tx, `insert into public.mail_suppressions (email, reason) values ('x@y.local', 'manual')`)).toBe(true);
      expect(await count(tx, 'select 1 from public.mail_suppressions')).toBe(1);
    });
  });

  it('kitle: kurumsal müşteri + izinli birey + izinli talep + onaylı elle liste; tekrar, pasif, izinsiz, bozuk, test alanı ve engelli adres girmez', async () => {
    await as(db, user(users.ids.admin), async (tx) => {
      const p = (await tx.query<{ p: { total: number; suppressed: number; customer: number; lead: number; manual: number; sample: { email: string; source: string; name: string | null }[] } }>('select public.mail_audience_preview($1::jsonb) as p', [JSON.stringify(AUDIENCE)])).rows[0]!.p;
      expect(p).toMatchObject({ total: 4, suppressed: 1, customer: 2, lead: 1, manual: 1 });
      expect(p.sample.map((s) => `${s.email}:${s.source}`).sort()).toEqual(['elle@firma.local:manual', 'izinli@birey.local:customer', 'kurumsal@firma.local:customer', 'talep@izinli.local:lead']);
      expect(p.sample.find((s) => s.email === 'kurumsal@firma.local')!.name).toBe('Ayşe Yetkili'); // müşteri kaydı talepten ve elle listeden önce gelir
      // Onay kutusu işaretlenmemiş elle liste sayılmaz; il süzgeci tam eşleşme
      const noAttest = (await tx.query<{ p: { total: number; manual: number } }>('select public.mail_audience_preview($1::jsonb) as p', [JSON.stringify({ ...AUDIENCE, manual_attested: false })])).rows[0]!.p;
      expect(noAttest).toMatchObject({ total: 3, manual: 0 });
      const izmir = (await tx.query<{ p: { total: number } }>('select public.mail_audience_preview($1::jsonb) as p', [JSON.stringify({ segments: ['customers_corporate', 'customers_individual', 'leads'], city: 'İzmir' })])).rows[0]!.p;
      expect(izmir.total).toBe(2);
      expect((await tx.query<{ c: string[] }>('select public.mail_audience_cities() as c')).rows[0]!.c).toEqual(['Ankara', 'Bursa', 'İzmir']);
    });
  });

  it('taslak kaydet → başlat: alıcılar dondurulur; taslak dışı düzenlenmez/silinmez; duraklat · sürdür · iptal · yeniden dene', async () => {
    const id = (await persist<{ id: string }>(users.ids.admin, 'select public.save_mail_campaign($1::jsonb) as id', [campaign()]))[0]!.id;
    await persist(users.ids.admin, 'select public.save_mail_campaign($1::jsonb)', [campaign({ id, subject: 'Güncel konu' })]);
    expect((await db.query<{ subject: string; status: string; created_by: string }>('select subject, status, created_by from public.mail_campaigns where id = $1', [id])).rows[0]).toEqual({ subject: 'Güncel konu', status: 'draft', created_by: users.ids.admin });

    await as(db, user(users.ids.admin), async (tx) => {
      // İçeriksiz ya da alıcısız kampanya başlamaz; http bağlantı kabul edilmez
      const empty = (await tx.query<{ id: string }>('select public.save_mail_campaign($1::jsonb) as id', [JSON.stringify({ name: 'Boş', audience: { segments: [] } })])).rows[0]!.id;
      await expectFail(tx as Tx, 'select public.start_mail_campaign($1)', [empty], /konu ve metin/);
      const noOne = (await tx.query<{ id: string }>('select public.save_mail_campaign($1::jsonb) as id', [campaign({ audience: { segments: [] } })])).rows[0]!.id;
      await expectFail(tx as Tx, 'select public.start_mail_campaign($1)', [noOne], /alıcı yok/);
      await expectFail(tx as Tx, 'select public.save_mail_campaign($1::jsonb)', [campaign({ cta_url: 'http://guvensiz.local' })], /check|violates/i);
      await tx.query('select public.delete_mail_campaign($1)', [empty]);
      expect(await count(tx, 'select 1 from public.mail_campaigns where id = $1', [empty])).toBe(0);
    });

    expect((await persist<{ n: number }>(users.ids.admin, 'select public.start_mail_campaign($1) as n', [id]))[0]!.n).toBe(4);
    expect((await db.query<{ status: string; started_by: string }>('select status, started_by from public.mail_campaigns where id = $1', [id])).rows[0]).toEqual({ status: 'sending', started_by: users.ids.admin });
    await as(db, user(users.ids.admin), async (tx) => {
      await expectFail(tx as Tx, 'select public.save_mail_campaign($1::jsonb)', [campaign({ id, subject: 'Sonradan' })], /yalnız taslak düzenlenir/);
      await expectFail(tx as Tx, 'select public.delete_mail_campaign($1)', [id], /yalnız taslak silinir/);
      await expectFail(tx as Tx, 'select public.start_mail_campaign($1)', [id], /yalnız taslak başlatılır/);
      expect((await tx.query<{ s: string }>(`select public.set_mail_campaign_state($1, 'pause') as s`, [id])).rows[0]!.s).toBe('paused');
      expect((await tx.query<{ s: string }>(`select public.set_mail_campaign_state($1, 'resume') as s`, [id])).rows[0]!.s).toBe('sending');
      await expectFail(tx as Tx, `select public.set_mail_campaign_state($1, 'retry')`, [id], /başarısız alıcı yok/);
      await expectFail(tx as Tx, `select public.set_mail_campaign_state($1, 'bogus')`, [id], /uygulanamaz/);
      const stats = (await tx.query<{ total: number; pending: number; sent: number }>('select total, pending, sent from public.mail_campaign_stats(array[$1]::uuid[])', [id])).rows[0]!;
      expect(stats).toEqual({ total: 4, pending: 4, sent: 0 });
      // İşçinin yazdığı sonuçları taklit et (superuser), sonra yeniden dene ve iptal
      await tx.query('reset role');
      await tx.query(`update public.mail_campaign_recipients set status = 'failed', error = 'smtp 550' where campaign_id = $1 and email = 'elle@firma.local'`, [id]);
      await tx.query(`update public.mail_campaign_recipients set status = 'sent', sent_at = now() where campaign_id = $1 and email = 'izinli@birey.local'`, [id]);
      expect((await tx.query<{ s: string }>(`select public.set_mail_campaign_state($1, 'retry') as s`, [id])).rows[0]!.s).toBe('sending');
      expect(await count(tx, `select 1 from public.mail_campaign_recipients where campaign_id = $1 and status = 'pending'`, [id])).toBe(3);
      expect((await tx.query<{ s: string }>(`select public.set_mail_campaign_state($1, 'cancel') as s`, [id])).rows[0]!.s).toBe('cancelled');
      expect(await count(tx, `select 1 from public.mail_campaign_recipients where campaign_id = $1 and status = 'skipped' and error = 'cancelled'`, [id])).toBe(3);
      expect(await count(tx, `select 1 from public.mail_campaign_recipients where campaign_id = $1 and status = 'sent'`, [id])).toBe(1);
      await expectFail(tx as Tx, `select public.set_mail_campaign_state($1, 'resume')`, [id], /uygulanamaz/);
    });

    // Zamanlama: ileri tarih → scheduled; kopya → yeni taslak
    await as(db, user(users.ids.admin), async (tx) => {
      const copy = (await tx.query<{ id: string }>('select public.duplicate_mail_campaign($1, $2) as id', [id, 'Eylül duyurusu (kopya)'])).rows[0]!.id;
      expect((await tx.query<{ status: string; name: string }>('select status, name from public.mail_campaigns where id = $1', [copy])).rows[0]).toEqual({ status: 'draft', name: 'Eylül duyurusu (kopya)' });
      await expectFail(tx as Tx, `select public.start_mail_campaign($1, now() + interval '200 days')`, [copy], /90 gün/);
      await tx.query(`select public.start_mail_campaign($1, now() + interval '2 days')`, [copy]);
      expect((await tx.query<{ status: string; ok: boolean }>('select status, scheduled_at > now() as ok from public.mail_campaigns where id = $1', [copy])).rows[0]).toEqual({ status: 'scheduled', ok: true });
      expect((await tx.query<{ s: string }>(`select public.set_mail_campaign_state($1, 'pause') as s`, [copy])).rows[0]!.s).toBe('paused');
      expect((await tx.query<{ s: string }>(`select public.set_mail_campaign_state($1, 'resume') as s`, [copy])).rows[0]!.s).toBe('scheduled');
    });
  });

  it('listeden çık: anahtarla engel kaydı + izinler geri alınır; bilinmeyen anahtar false; kişinin kendi isteği panelden kaldırılamaz', async () => {
    const id = (await persist<{ id: string }>(users.ids.admin, 'select public.save_mail_campaign($1::jsonb) as id', [campaign({ name: 'Çıkış testi' })]))[0]!.id;
    await persist(users.ids.admin, 'select public.start_mail_campaign($1)', [id]);
    const token = async (email: string) => (await db.query<{ token: string }>('select token from public.mail_campaign_recipients where campaign_id = $1 and email = $2', [id, email])).rows[0]!.token;
    const leadToken = await token('talep@izinli.local');
    const customerToken = await token('izinli@birey.local');
    await as(db, anon, async (tx) => {
      expect((await tx.query<{ ok: boolean }>('select public.mail_unsubscribe($1) as ok', ['00000000-0000-4000-8000-000000000000'])).rows[0]!.ok).toBe(false);
      expect((await tx.query<{ ok: boolean }>('select public.mail_unsubscribe($1) as ok', [leadToken])).rows[0]!.ok).toBe(true);
      expect((await tx.query<{ ok: boolean }>('select public.mail_unsubscribe($1) as ok', [leadToken])).rows[0]!.ok).toBe(true); // ikinci tık zararsız
      expect((await tx.query<{ ok: boolean }>('select public.mail_unsubscribe($1) as ok', [customerToken])).rows[0]!.ok).toBe(true);
      await tx.query('reset role');
      expect(await count(tx, `select 1 from public.mail_suppressions where reason = 'unsubscribed' and campaign_id = $1`, [id])).toBe(2);
      expect((await tx.query<{ c: boolean }>(`select consent_marketing as c from public.leads where email = 'talep@izinli.local'`)).rows[0]!.c).toBe(false);
      expect((await tx.query<{ c: boolean }>(`select marketing_consent as c from public.customers where email = 'izinli@birey.local'`)).rows[0]!.c).toBe(false);
      expect(await count(tx, 'select 1 from public.mail_campaign_recipients where campaign_id = $1 and unsubscribed_at is not null', [id])).toBe(2);
      // Çıkan adres bir sonraki kitleye girmez
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: users.ids.admin, role: 'authenticated' })]);
      const p = (await tx.query<{ p: { total: number; suppressed: number } }>('select public.mail_audience_preview($1::jsonb) as p', [JSON.stringify(AUDIENCE)])).rows[0]!.p;
      expect(p.total).toBe(2);
    });
    // Kalıcı: kendi isteğiyle çıkan kayıt silinemez; elle/bounce kaydı silinir
    await db.query(`select set_config('request.headers', '{}', false)`);
    await db.query('select public.mail_unsubscribe($1)', [leadToken]);
    await as(db, user(users.ids.admin), async (tx) => {
      const own = (await tx.query<{ id: string }>(`select id from public.mail_suppressions where email = 'talep@izinli.local'`)).rows[0]!.id;
      await expectFail(tx as Tx, 'select public.remove_mail_suppression($1)', [own], /kişinin kendi isteği/);
      const bounced = (await tx.query<{ id: string }>(`select id from public.mail_suppressions where email = 'cikmis@kisi.local'`)).rows[0]!.id;
      await tx.query('select public.remove_mail_suppression($1)', [bounced]);
      expect(await count(tx, `select 1 from public.mail_suppressions where email = 'cikmis@kisi.local'`)).toBe(0);
      await expectFail(tx as Tx, `select public.add_mail_suppression('adres degil', 'manual')`, [], /e-posta/);
      await expectFail(tx as Tx, `select public.add_mail_suppression('a@b.local', 'unsubscribed')`, [], /neden/);
    });
  });

  it('K-104: kapı açıkken başlıksız "listeden çık" reddedilir; eşik aşılınca P0429', async () => {
    const GATE = 'test-gate-secret-0123456789abcdef';
    await db.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', false)`);
    await db.query('select public.set_rpc_gate($1)', [GATE]);
    await db.query(`select set_config('request.jwt.claims', '', false)`);
    await as(db, anon, async (tx) => { await expectFail(tx as Tx, 'select public.mail_unsubscribe($1)', ['00000000-0000-4000-8000-000000000000'], /rpc_gate/); });
    await as(db, anon, async (tx) => {
      await tx.query(`select set_config('request.headers', $1, true)`, [JSON.stringify({ 'x-clk-gate': GATE })]);
      await tx.query('reset role');
      await tx.query(`delete from app_private.throttle where key = 'unsub:global'`);
      await tx.query('set local role anon');
      for (let i = 0; i < 300; i += 1) await tx.query('select public.mail_unsubscribe($1)', ['00000000-0000-4000-8000-000000000000']);
      await expectFail(tx as Tx, 'select public.mail_unsubscribe($1)', ['00000000-0000-4000-8000-000000000000'], /rate_limited/);
    });
  });
});
