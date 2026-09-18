import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { as, cannotWrite, count, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0034: proforma numarası, fatura CHECK'leri (tevkifat K-31), tahsilat → hakediş/fatura durumu, RLS (staff okur, admin yazar),
// hatırlatma şablonu, panel sayacı (vadesi geçen hakediş).
describe('0034 · fatura & tahsilat', () => {
  let db: PGlite;
  let users: TestUsers;
  let saleId: string;
  let customerId: string;
  beforeAll(async () => {
    db = await createTestDb();
    users = await seedUsers(db);
    const leadId = (await db.query<{ r: { id: string } }>(`select public.submit_lead($1::jsonb) as r`, [JSON.stringify({ full_name: 'Ali Veli', company: 'Veli İnşaat', email: 'ali@example.com', consent_kvkk: true })])).rows[0]!.r.id;
    saleId = (await db.query<{ id: string }>('select public.create_sale_from_lead($1) as id', [leadId])).rows[0]!.id;
    customerId = (await db.query<{ customer_id: string }>('select customer_id from public.sales where id = $1', [saleId])).rows[0]!.customer_id;
    await db.query(`update public.sales set subtotal = 3000000, discount_pct = 2, discount_amount = 60000, vat_amount = 588000, grand_total = 3528000, grand_total_try = 3528000, status = 'confirmed' where id = $1`, [saleId]);
  });
  afterAll(() => db.close());

  it('proforma PRF-YYYY-NNNN alır; e-Fatura numarasız kalır; tevkifat 4/10 CHECK ile tutarlı; yanlış tutar reddedilir', async () => {
    const pf = (await db.query<{ invoice_no: string }>(`insert into public.invoices (sale_id, customer_id, type, base_amount, vat_rate, vat_amount, total_amount, collectable_amount) values ($1, $2, 'proforma', 1000, 0.2, 200, 1200, 1200) returning invoice_no`, [saleId, customerId])).rows[0]!;
    expect(pf.invoice_no).toMatch(/^PRF-\d{4}-\d{4}$/);
    const ef = (await db.query<{ invoice_no: string | null; collectable_amount: string }>(`insert into public.invoices (sale_id, customer_id, type, base_amount, vat_rate, vat_amount, total_amount, withholding_ratio, withholding_amount, collectable_amount) values ($1, $2, 'e_invoice', 2940000, 0.2, 588000, 3528000, 0.4, 235200, 3292800) returning invoice_no, collectable_amount`, [saleId, customerId])).rows[0]!;
    expect(ef.invoice_no).toBeNull();
    expect(Number(ef.collectable_amount)).toBe(3_292_800);
    await expect(db.query(`insert into public.invoices (sale_id, customer_id, type, base_amount, vat_rate, vat_amount, total_amount, withholding_ratio, withholding_amount, collectable_amount) values ($1, $2, 'e_invoice', 1000, 0.2, 200, 1200, 0.4, 100, 1100)`, [saleId, customerId])).rejects.toThrow(/check/i);
    // e-Fatura "kesildi" durumu numara + tarih ister
    await expect(db.query(`update public.invoices set status = 'issued' where type = 'e_invoice'`)).rejects.toThrow(/check/i);
  });

  it('hakediş + tahsilat: kısmi → partially_paid, tam → paid; fatura durumu türetilir; vadesi geçen sayaçta', async () => {
    await db.query(`insert into public.payment_schedules (sale_id, seq, description, ratio_pct, amount, due_date) values ($1, 1, 'Peşinat', 30, 1000, current_date - 10), ($1, 2, 'Teslim', 70, 2000, current_date + 30)`, [saleId]);
    const counts0 = await as(db, user(users.ids.admin), async (tx) => (await tx.query<{ c: Record<string, number> }>('select public.admin_dashboard_counts() as c')).rows[0]!.c);
    expect(counts0['overdue_schedules']).toBe(1);
    const sched = (await db.query<{ id: string }>(`select id from public.payment_schedules where sale_id = $1 and seq = 1`, [saleId])).rows[0]!.id;
    const inv = (await db.query<{ id: string }>(`update public.invoices set invoice_no = 'EF-1', issue_date = current_date, status = 'sent' where type = 'e_invoice' returning id`)).rows[0]!.id;
    await db.query(`insert into public.payments (sale_id, invoice_id, schedule_id, paid_on, amount, currency, exchange_rate, amount_try, method) values ($1, $2, $3, current_date, 400, 'TRY', 1, 400, 'bank_transfer')`, [saleId, inv, sched]);
    // Admin yetkisiyle kalıcı çalıştırma: as() geri alır → önce admin olarak etkilediğini, sonra doğrudan kalıcı sonucu doğrula
    const adminAffected = await as(db, user(users.ids.admin), async (tx) => {
      await tx.query('select public.recalc_sale_payments($1)', [saleId]);
      return (await tx.query<{ status: string }>('select status from public.payment_schedules where id = $1', [sched])).rows[0]!.status;
    });
    expect(adminAffected).toBe('partially_paid');
    await db.query('select public.recalc_sale_payments($1)', [saleId]);
    let st = (await db.query<{ status: string }>('select status from public.payment_schedules where id = $1', [sched])).rows[0]!.status;
    expect(st).toBe('partially_paid');
    expect((await db.query<{ status: string }>('select status from public.invoices where id = $1', [inv])).rows[0]!.status).toBe('partially_paid');
    await db.query(`insert into public.payments (sale_id, invoice_id, schedule_id, paid_on, amount, currency, exchange_rate, amount_try, method) values ($1, $2, $3, current_date, 600, 'TRY', 1, 600, 'cash')`, [saleId, inv, sched]);
    await db.query('select public.recalc_sale_payments($1)', [saleId]);
    st = (await db.query<{ status: string }>('select status from public.payment_schedules where id = $1', [sched])).rows[0]!.status;
    expect(st).toBe('paid');
    const counts1 = await as(db, user(users.ids.admin), async (tx) => (await tx.query<{ c: Record<string, number> }>('select public.admin_dashboard_counts() as c')).rows[0]!.c);
    expect(counts1['overdue_schedules']).toBe(0);
  });

  it('RLS: sales/viewer okur ama fatura/tahsilat yazamaz; recalc sales için etkisiz; şablon tohumlu', async () => {
    expect(await as(db, user(users.ids.sales), (tx) => count(tx, 'select * from public.invoices'))).toBe(2);
    expect(await as(db, user(users.ids.viewer), (tx) => count(tx, 'select * from public.payments'))).toBe(2);
    expect(await as(db, user(users.ids.sales), (tx) => cannotWrite(tx, `insert into public.payments (sale_id, paid_on, amount, amount_try, method) values ($1, current_date, 1, 1, 'cash')`, [saleId]))).toBe(true);
    expect(await as(db, user(users.ids.sales), (tx) => cannotWrite(tx, `update public.invoices set notes = 'x' where sale_id = $1`, [saleId]))).toBe(true);
    await db.query(`update public.payment_schedules set status = 'pending' where sale_id = $1`, [saleId]);
    await as(db, user(users.ids.sales), (tx) => tx.query('select public.recalc_sale_payments($1)', [saleId]));
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.payment_schedules where sale_id = $1 and status = 'pending'`, [saleId])).rows[0]!.n).toBe(2);
    expect(await count(db as never, `select * from public.email_templates where key = 'payment.reminder'`)).toBe(1);
  });
});
