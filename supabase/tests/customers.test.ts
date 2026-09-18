import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, cannotWrite, count, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0029: talep → müşteri (sales, tekrar çağrı aynı müşteri), anonimleştirme (yalnız admin; ünvan/VKN kalır, talep de maskelenir),
// müşteri tablosu anonime/üyeye kapalı, viewer okur ama yazamaz, panel sayacı.
describe('0029 · müşteri (CRM)', () => {
  let db: PGlite;
  let users: TestUsers;
  let leadId: string;
  beforeAll(async () => {
    db = await createTestDb();
    users = await seedUsers(db);
    leadId = (await db.query<{ r: { id: string } }>(`select public.submit_lead($1::jsonb) as r`, [JSON.stringify({ source: 'quote_form', full_name: 'Ali Veli', company: 'Veli İnşaat', email: 'ali@example.com', phone: '+905551112233', city: 'İzmir', consent_kvkk: true, locale: 'tr' })])).rows[0]!.r.id;
  });
  afterAll(() => db.close());

  it('tohumda müşteri yok; anonim ve üye tabloyu görmez; viewer okur ama yazamaz', async () => {
    expect(await count(db as never, 'select * from public.customers')).toBe(0);
    await expect(as(db, anon, (tx) => tx.query('select * from public.customers'))).rejects.toThrow(/permission|denied/i);
    expect(await as(db, user(users.ids.member), (tx) => count(tx, 'select * from public.customers'))).toBe(0);
    expect(await as(db, user(users.ids.viewer), (tx) => cannotWrite(tx, `insert into public.customers (company_title) values ('X')`))).toBe(true);
  });

  it('sales talebi müşteriye dönüştürür: alanlar dolar, talep bağlanır; ikinci çağrı aynı id', async () => {
    const id = await as(db, user(users.ids.sales), async (tx) => {
      const first = (await tx.query<{ id: string }>('select public.create_customer_from_lead($1) as id', [leadId])).rows[0]!.id;
      const again = (await tx.query<{ id: string }>('select public.create_customer_from_lead($1) as id', [leadId])).rows[0]!.id;
      expect(again).toBe(first);
      const c = (await tx.query<{ type: string; company_title: string; email: string; contact_person: string; source: string }>('select type, company_title, email, contact_person, source from public.customers where id = $1', [first])).rows[0]!;
      expect(c).toEqual({ type: 'corporate', company_title: 'Veli İnşaat', email: 'ali@example.com', contact_person: 'Ali Veli', source: 'lead' });
      const linked = (await tx.query<{ customer_id: string }>('select customer_id from public.leads where id = $1', [leadId])).rows[0]!.customer_id;
      expect(linked).toBe(first);
      return first;
    });
    expect(id).toMatch(/[0-9a-f-]{36}/);
    // as() geri aldı → kalıcı için doğrudan
    await db.query('select public.create_customer_from_lead($1)', [leadId]);
    expect(await count(db as never, 'select * from public.customers')).toBe(1);
  });

  it('anonimleştirme: sales/viewer yapamaz; admin yapar → kişisel alanlar boş, ünvan kalır, talep maskelenir; ikinci kez hata', async () => {
    await db.query(`update public.customers set tax_id = '1234567890', tax_office = 'Konak'`);
    const customerId = (await db.query<{ id: string }>('select id from public.customers limit 1')).rows[0]!.id;
    await expect(as(db, user(users.ids.sales), (tx) => tx.query('select public.anonymize_customer($1)', [customerId]))).rejects.toThrow(/yetki/);
    await expect(as(db, user(users.ids.viewer), (tx) => tx.query('select public.anonymize_customer($1)', [customerId]))).rejects.toThrow(/yetki/);
    await as(db, user(users.ids.admin), async (tx) => {
      await tx.query('select public.anonymize_customer($1)', [customerId]);
      const c = (await tx.query<{ full_name: string | null; company_title: string; tax_id: string; email: string | null; is_active: boolean; anonymized_at: string | null }>('select full_name, company_title, tax_id, email, is_active, anonymized_at from public.customers where id = $1', [customerId])).rows[0]!;
      expect(c.full_name).toBeNull();
      expect(c.company_title).toBe('Veli İnşaat');
      expect(c.tax_id).toBe('1234567890');
      expect(c.email).toBeNull();
      expect(c.is_active).toBe(false);
      expect(c.anonymized_at).not.toBeNull();
      const l = (await tx.query<{ full_name: string; email: string | null; anonymized_at: string | null }>('select full_name, email, anonymized_at from public.leads where id = $1', [leadId])).rows[0]!;
      expect(l).toMatchObject({ full_name: 'Anonim', email: null });
      expect(l.anonymized_at).not.toBeNull();
      await expect(tx.query('select public.anonymize_customer($1)', [customerId])).rejects.toThrow(/customer/);
    });
  });

  it('panel sayacı customers alanını verir', async () => {
    const counts = await as(db, user(users.ids.admin), async (tx) => (await tx.query<{ c: Record<string, number> }>('select public.admin_dashboard_counts() as c')).rows[0]!.c);
    expect(counts['customers']).toBe(1);
  });
});
