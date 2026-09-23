import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, count, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0051 (K-103): üye mesajı/revizyon/iptal, talep devralma, firma bilgisi, hesap silme
describe('0051 · hesabım', () => {
  let db: PGlite;
  let users: TestUsers;
  // Kalıcı tohum: as() her çağrıyı geri alır → talepler doğrudan (superuser) submit_lead ile, auth.uid() GUC üzerinden verilir
  const submit = async (userId: string | null, p: Record<string, unknown>) => {
    await db.query(`select set_config('request.jwt.claims', $1, false)`, [userId ? JSON.stringify({ sub: userId, role: 'authenticated' }) : '']);
    const r = (await db.query<{ r: { id: string; ref_no: string } }>('select public.submit_lead($1::jsonb) as r', [JSON.stringify(p)])).rows[0]!.r;
    await db.query(`select set_config('request.jwt.claims', '', false)`);
    return r;
  };
  beforeAll(async () => {
    db = await createTestDb();
    users = await seedUsers(db);
    await db.query(`insert into public.site_settings (key, value) values ('contact.email', '"satis@test.local"') on conflict (key) do update set value = excluded.value`);
  }, 120_000);
  afterAll(async () => { await db.close(); });

  it('customer_lead_message: yalnız kendi talebi; inbound satır + satışa bildirim + şirkete e-posta; iptal isteği → lost', async () => {
    const member = user(users.ids.member);
    const lead = await submit(users.ids.member, { full_name: 'Üye Bir', email: 'member@test.local', consent_kvkk: true, message: 'Merhaba' });
    expect((await db.query<{ user_id: string }>('select user_id from public.leads where id = $1', [lead.id])).rows[0]!.user_id).toBe(users.ids.member);
    // Her hata kendi işleminde (aborted transaction)
    await as(db, user(users.otherMember), async (tx) => { await expect(tx.query('select public.customer_lead_message($1, $2, $3)', [lead.id, 'reply', 'Bu talep benim değil'])).rejects.toThrow(/customer_lead_message: lead/); });
    await as(db, member, async (tx) => { await expect(tx.query('select public.customer_lead_message($1, $2, $3)', [lead.id, 'bogus', 'xxx'])).rejects.toThrow(/kind/); });
    await as(db, member, async (tx) => { await expect(tx.query('select public.customer_lead_message($1, $2, $3)', [lead.id, 'reply', 'a'])).rejects.toThrow(/body/); });
    await as(db, member, async (tx) => {
      await tx.query('select public.customer_lead_message($1, $2, $3)', [lead.id, 'revision_request', 'Kalınlık 3 mm olsun lütfen']);
      const rows = (await tx.query<{ direction: string; kind: string; subject: string }>('select direction, kind, subject from public.lead_replies where lead_id = $1', [lead.id])).rows;
      expect(rows).toEqual([{ direction: 'inbound', kind: 'revision_request', subject: 'Revizyon isteği' }]);
      await tx.query('reset role');
      expect(await count(tx, `select 1 from public.notifications where type = 'lead.customer_message' and target_role = 'sales' and payload->>'lead_id' = $1`, [lead.id])).toBe(1);
      expect(await count(tx, `select 1 from public.email_queue where to_email = 'satis@test.local' and related_id = $1 and payload->>'message' like '[revision_request]%'`, [lead.id])).toBe(1);
    });
    await as(db, member, async (tx) => {
      await tx.query('select public.customer_lead_message($1, $2, $3)', [lead.id, 'cancel_request', 'Vazgeçtim, iptal edin']);
      await tx.query('reset role');
      expect((await tx.query<{ status: string; lost_reason: string }>('select status, lost_reason from public.leads where id = $1', [lead.id])).rows[0]).toEqual({ status: 'lost', lost_reason: 'customer_cancel' });
    });
  });

  it('claim_my_leads: doğrulanmış e-postayla eşleşen anonim talepler üyeye bağlanır', async () => {
    const lead = await submit(null, { full_name: 'Anonim', email: 'Member@Test.local', consent_kvkk: true });
    expect(await as(db, user(users.ids.member), async (tx) => (await tx.query<{ n: number }>('select public.claim_my_leads() as n')).rows[0]!.n)).toBe(0); // doğrulanmamış
    await db.query('update auth.users set email_confirmed_at = now() where id = $1', [users.ids.member]);
    expect((await db.query<{ user_id: string | null }>('select user_id from public.leads where id = $1', [lead.id])).rows[0]!.user_id).toBeNull(); // 0039 tetikleyicisi yalnız konfigürasyonları devralır
    await as(db, user(users.ids.member), async (tx) => {
      expect((await tx.query<{ n: number }>('select public.claim_my_leads() as n')).rows[0]!.n).toBe(1);
      expect(await count(tx, 'select 1 from public.leads where id = $1', [lead.id])).toBe(1); // artık RLS ile görünür
    });
  });

  it('upsert_my_customer / get_my_customer: kendi customers satırı; notlar dışarı çıkmaz', async () => {
    await as(db, user(users.ids.member), async (tx) => {
      const id = (await tx.query<{ id: string }>(`select public.upsert_my_customer('{"type":"corporate","company_title":"Üye A.Ş.","tax_office":"Kadıköy","tax_id":"1234567890","city":"İstanbul"}'::jsonb) as id`)).rows[0]!.id;
      const again = (await tx.query<{ id: string }>(`select public.upsert_my_customer('{"type":"corporate","company_title":"Üye Anonim Şirketi","city":"İstanbul"}'::jsonb) as id`)).rows[0]!.id;
      expect(again).toBe(id);
      const c = (await tx.query<{ c: Record<string, unknown> }>('select public.get_my_customer() as c')).rows[0]!.c;
      expect(c).toMatchObject({ company_title: 'Üye Anonim Şirketi', tax_office: null, email: 'member@test.local', profile_id: users.ids.member });
      expect('notes' in c).toBe(false);
    });
    expect(await as(db, user(users.otherMember), async (tx) => (await tx.query<{ c: unknown }>('select public.get_my_customer() as c')).rows[0]!.c)).toBeNull();
  });

  it('delete_my_account: üye silinir (profil + konfigürasyon gider, talep kalır user_id null); personel silemez', async () => {
    const member = user(users.otherMember);
    const lead = await submit(users.otherMember, { full_name: 'Silinecek', email: 'member2@test.local', consent_kvkk: true });
    await as(db, member, async (tx) => {
      await tx.query(`insert into public.configurations (ref_code, name, params, user_id) values ('KFG-DEL-2', 'Silinecek', '{}'::jsonb, $1)`, [users.otherMember]);
      await tx.query('select public.delete_my_account()');
      await tx.query('reset role');
      expect(await count(tx, 'select 1 from auth.users where id = $1', [users.otherMember])).toBe(0);
      expect(await count(tx, 'select 1 from public.profiles where id = $1', [users.otherMember])).toBe(0);
      expect(await count(tx, `select 1 from public.configurations where ref_code = 'KFG-DEL-2'`)).toBe(0);
      expect((await tx.query<{ user_id: string | null }>('select user_id from public.leads where id = $1', [lead.id])).rows[0]).toEqual({ user_id: null });
    });
    await as(db, user(users.ids.admin), async (tx) => {
      await expect(tx.query('select public.delete_my_account()')).rejects.toThrow(/staff/);
    });
  });
});
