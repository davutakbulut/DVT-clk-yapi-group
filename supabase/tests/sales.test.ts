import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, cannotWrite, count, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0030: kur tablosu (staff okur, admin yazar); talep → satış (sales rolü, kalemler, müşteri açılır, tekrar → aynı);
// K-33: sales görünümden yazar ama maliyet yazamaz, temel tabloyu göremez; viewer yazamaz; admin maliyet yazar; CHECK'ler.
describe('0030 · satış & maliyet', () => {
  let db: PGlite;
  let users: TestUsers;
  let leadId: string;
  beforeAll(async () => {
    db = await createTestDb();
    users = await seedUsers(db);
    leadId = (await db.query<{ r: { id: string } }>(`select public.submit_lead($1::jsonb) as r`, [JSON.stringify({ source: 'quote_basket', full_name: 'Ayşe K', company: 'K Yapı', email: 'ayse@example.com', consent_kvkk: true, locale: 'tr' })])).rows[0]!.r.id;
    await db.query(`insert into public.lead_items (lead_id, product_name_snapshot, variant_label_snapshot, quantity, unit, sort_order) values ($1, 'Kutu Profil', '40×40', 12, 'adet', 1)`, [leadId]);
  });
  afterAll(() => db.close());
  /** Hata metnini işlem İÇİNDE yakalar (PGlite: geri alınan işlemin ilk ifadesi dışarıya "boş sonuç" olarak dönebiliyor). */
  const errorAs = (actor: Parameters<typeof as>[1], sql: string, params: unknown[]) =>
    as(db, actor, async (tx) => {
      try {
        await tx.query(sql, params);
        return null;
      } catch (e) {
        return String(e);
      }
    });

  it('kur: anonim/üye göremez, sales okur ama yazamaz, admin yazar; aynı gün tekil', async () => {
    await expect(as(db, anon, (tx) => tx.query('select * from public.exchange_rates'))).rejects.toThrow();
    expect(await as(db, user(users.ids.member), (tx) => count(tx, 'select * from public.exchange_rates'))).toBe(0);
    expect(await as(db, user(users.ids.sales), (tx) => cannotWrite(tx, `insert into public.exchange_rates (currency, rate_date, rate) values ('USD', current_date, 40.5)`))).toBe(true);
    await db.query(`insert into public.exchange_rates (currency, rate_date, rate) values ('USD', current_date, 40.5)`);
    expect(await as(db, user(users.ids.sales), (tx) => count(tx, 'select * from public.exchange_rates'))).toBe(1);
    await expect(db.query(`insert into public.exchange_rates (currency, rate_date, rate) values ('USD', current_date, 41)`)).rejects.toThrow(/unique|duplicate/);
  });

  it('sales talebi satışa dönüştürür: müşteri açılır, kalem kopyalanır, talep won; tekrar → aynı satış; viewer yapamaz', async () => {
    expect(await errorAs(user(users.ids.viewer), 'select public.create_sale_from_lead($1)', [leadId])).toMatch(/yetki/);
    const saleId = await as(db, user(users.ids.sales), async (tx) => {
      const id = (await tx.query<{ id: string }>('select public.create_sale_from_lead($1) as id', [leadId])).rows[0]!.id;
      const again = (await tx.query<{ id: string }>('select public.create_sale_from_lead($1) as id', [leadId])).rows[0]!.id;
      expect(again).toBe(id);
      const s = (await tx.query<{ sale_no: string; status: string; customer_id: string; lead_id: string }>('select sale_no, status, customer_id, lead_id from public.sales_without_cost where id = $1', [id])).rows[0]!;
      expect(s.sale_no).toMatch(/^SAT-\d{4}-\d{4}$/);
      expect(s.status).toBe('draft');
      expect(s.lead_id).toBe(leadId);
      const items = (await tx.query<{ description: string; quantity: string; unit: string }>('select description, quantity, unit from public.sale_items_without_cost where sale_id = $1', [id])).rows;
      expect(items).toEqual([{ description: 'Kutu Profil · 40×40', quantity: '12.000', unit: 'adet' }]);
      const lead = (await tx.query<{ status: string; customer_id: string }>('select status, customer_id from public.leads where id = $1', [leadId])).rows[0]!;
      expect(lead.status).toBe('won');
      expect(lead.customer_id).toBe(s.customer_id);
      return id;
    });
    expect(saleId).toMatch(/[0-9a-f-]{36}/);
    // K-33: temel tablo sales rolüne kapalı (RLS: hata değil, boş sonuç)
    expect(await as(db, user(users.ids.sales), (tx) => count(tx, 'select * from public.sales'))).toBe(0);
  });

  it('K-33: sales görünümden başlık/kalem yazar, maliyet yazamaz; viewer yazamaz; admin maliyet + kâr yazar (CHECK tutarlı)', async () => {
    const saleId = (await db.query<{ id: string }>('select public.create_sale_from_lead($1) as id', [leadId])).rows[0]!.id;
    await as(db, user(users.ids.sales), async (tx) => {
      const ok = await tx.query(`update public.sales_without_cost set subtotal = 1000, discount_pct = 0, discount_amount = 0, vat_amount = 200, grand_total = 1200, grand_total_try = 1200, status = 'confirmed' where id = $1`, [saleId]);
      expect(ok.affectedRows).toBe(1);
      const ins = await tx.query(`insert into public.sale_items_without_cost (sale_id, description, quantity, unit, unit_price, line_total) values ($1, 'Vinç kiralama', 2, 'gün', 500, 1000)`, [saleId]);
      expect(ins.affectedRows).toBe(1);
    });
    expect(await errorAs(user(users.ids.sales), `insert into public.sale_items (sale_id, description, quantity, unit, unit_price, line_total, unit_cost) values ($1, 'x', 1, 'adet', 1, 1, 1)`, [saleId])).not.toBeNull();
    expect(await as(db, user(users.ids.viewer), (tx) => cannotWrite(tx, `update public.sales_without_cost set notes = 'x' where id = $1`, [saleId]))).toBe(true);
    await as(db, user(users.ids.admin), async (tx) => {
      await tx.query(`update public.sales set subtotal = 1000, discount_pct = 0, discount_amount = 0, vat_amount = 200, grand_total = 1200, grand_total_try = 1200, total_cost = 700, gross_profit = 300, margin_pct = 30 where id = $1`, [saleId]);
      expect(await cannotWrite(tx, `update public.sales set gross_profit = 999 where id = $1`, [saleId])).toBe(true); // CHECK: gross_profit = subtotal − discount − cost
      await tx.query(`insert into public.sale_expenses (sale_id, category, amount) values ($1, 'shipping', 100)`, [saleId]);
      expect(await count(tx, 'select * from public.sale_expenses where sale_id = $1', [saleId])).toBe(1);
    });
    // sales rolü gider tablosunu hiç görmez
    expect(await as(db, user(users.ids.sales), (tx) => count(tx, 'select * from public.sale_expenses'))).toBe(0);
  });
});
