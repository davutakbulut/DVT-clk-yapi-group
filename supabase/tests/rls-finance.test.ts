import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, cannotWrite, count, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

let db: PGlite;
let users: TestUsers;
let saleId: string;

// docs/modules/05-SALES-FINANCE.md'deki örnek satışın birebir rakamları
beforeAll(async () => {
  db = await createTestDb();
  users = await seedUsers(db);
  await db.exec(`insert into public.customers (company_title, tax_id) values ('Test Müşteri A.Ş.', '1234567890')`);
  const sale = await db.query<{ id: string }>(`
    insert into public.sales (customer_id, subtotal, discount_pct, discount_amount, vat_rate, vat_amount, grand_total, grand_total_try,
                              total_cost, gross_profit, margin_pct)
    select id, 2999000, 2, 59980, 0.20, 587804, 3526824, 3526824, 2432000, 507020, 17.25 from public.customers
    returning id`);
  saleId = sale.rows[0]!.id;
  await db.query(`insert into public.sale_items (sale_id, description, quantity, unit, unit_price, line_total, unit_cost, line_cost, line_profit)
                  values ($1, 'Çelik Konstrüksiyon', 45, 'ton', 52000, 2340000, 40444.44, 1820000, 520000)`, [saleId]);
  await db.query(`insert into public.sale_expenses (sale_id, category, amount) values ($1, 'shipping', 85000)`, [saleId]);
}, 120_000);
afterAll(async () => { await db.close(); });

describe('K-33 · maliyet ve kâr `sales` rolüne VERİTABANI seviyesinde kapalı', () => {
  it('sales temel tabloları HİÇ göremez (API üzerinden de çekilemez)', async () => {
    await as(db, user(users.ids.sales), async (tx) => {
      expect(await count(tx, 'select 1 from public.sales')).toBe(0);
      expect(await count(tx, 'select 1 from public.sale_items')).toBe(0);
      expect(await count(tx, 'select 1 from public.sale_expenses')).toBe(0);
    });
  });

  it('sales görünümden satışı ve FİYATI görür', async () => {
    await as(db, user(users.ids.sales), async (tx) => {
      const { rows } = await tx.query<{ grand_total: string }>('select grand_total from public.sales_without_cost');
      expect(rows).toHaveLength(1);
      expect(Number(rows[0]!.grand_total)).toBe(3526824);
      expect(await count(tx, 'select unit_price from public.sale_items_without_cost')).toBe(1);
    });
  });

  it('görünümlerde maliyet/kâr KOLONU yoktur', async () => {
    const { rows } = await db.query<{ column_name: string }>(`select column_name from information_schema.columns
      where table_schema = 'public' and table_name in ('sales_without_cost','sale_items_without_cost')`);
    const columns = rows.map((r) => r.column_name);
    for (const hidden of ['total_cost', 'gross_profit', 'margin_pct', 'unit_cost', 'line_cost', 'line_profit']) expect(columns).not.toContain(hidden);
  });

  it('sales görünüm üzerinden satış OLUŞTURUR ve günceller; numara otomatik atanır', async () => {
    await as(db, user(users.ids.sales), async (tx) => {
      const { rows } = await tx.query<{ sale_no: string }>(`
        insert into public.sales_without_cost (customer_id, subtotal, vat_amount, grand_total, grand_total_try)
        select id, 1000, 200, 1200, 1200 from public.customers returning sale_no`);
      expect(rows[0]!.sale_no).toMatch(/^SAT-\d{4}-\d{4}$/);
      expect(await cannotWrite(tx, `update public.sales_without_cost set notes = 'güncellendi' where sale_no = '${rows[0]!.sale_no}'`)).toBe(false);
    });
  });

  it('sales satış SİLEMEZ, maliyet YAZAMAZ', async () => {
    await as(db, user(users.ids.sales), async (tx) => {
      expect(await cannotWrite(tx, `delete from public.sales where id = '${saleId}'`)).toBe(true);
      expect(await cannotWrite(tx, `update public.sales set total_cost = 1 where id = '${saleId}'`)).toBe(true);
    });
    // Savunma derinliği: birisi ileride temel tabloyu TAMAMEN açsa bile tetikleyici maliyet yazımını reddeder
    await db.exec(`grant update on public.sales to authenticated; create policy tmp_open on public.sales for all to authenticated using (true) with check (true);`);
    try {
      await expect(as(db, user(users.ids.sales), (tx) => tx.query(`update public.sales set total_cost = 1, gross_profit = 2939019 where id = $1`, [saleId]))).rejects.toThrow(/yalnız yönetici/);
    } finally {
      await db.exec(`drop policy tmp_open on public.sales; revoke update on public.sales from authenticated; grant select, insert, update, delete on public.sales to authenticated;`);
    }
  });

  it('viewer görünümden OKUR ama YAZAMAZ', async () => {
    await as(db, user(users.ids.viewer), async (tx) => {
      expect(await count(tx, 'select 1 from public.sales_without_cost')).toBe(1);
      expect(await count(tx, 'select 1 from public.sales')).toBe(0);
      expect(await cannotWrite(tx, `update public.sales_without_cost set notes = 'x'`)).toBe(true);
      expect(await cannotWrite(tx, `insert into public.sales_without_cost (customer_id, subtotal, vat_amount, grand_total, grand_total_try) select id, 1, 0.2, 1.2, 1.2 from public.customers`)).toBe(true);
    });
  });

  it.each(['editor', 'member'] as const)('%s satışın HİÇBİR yüzünü göremez', async (role) => {
    await as(db, user(users.ids[role]), async (tx) => {
      for (const relation of ['sales', 'sales_without_cost', 'sale_items', 'sale_items_without_cost', 'sale_expenses', 'customers', 'invoices', 'payments'])
        expect(await count(tx, `select 1 from public.${relation}`), relation).toBe(0);
    });
  });

  it('anonim finans nesnelerine erişemez', async () => {
    await as(db, anon, async (tx) => {
      for (const relation of ['sales', 'sales_without_cost', 'sale_items_without_cost', 'customers', 'invoices'])
        expect(await cannotWrite(tx, `select 1 from public.${relation}`), relation).toBe(true);
    });
  });

  it('admin her şeyi görür: maliyet, kâr, marj', async () => {
    await as(db, user(users.ids.admin), async (tx) => {
      const { rows } = await tx.query<{ gross_profit: string; margin_pct: string }>('select gross_profit, margin_pct from public.sales');
      expect(Number(rows[0]!.gross_profit)).toBe(507020);
      expect(Number(rows[0]!.margin_pct)).toBe(17.25);
      expect(await count(tx, 'select 1 from public.sale_expenses')).toBe(1);
    });
  });

  it('finans değişiklikleri denetim kaydına düşer; izi admin okur ama KİMSE silemez', async () => {
    await as(db, user(users.ids.admin), async (tx) => {
      await tx.query(`update public.sales set notes = 'denetim' where id = $1`, [saleId]);
      const { rows } = await tx.query<{ actor_id: string }>(`select actor_id from public.audit_logs where table_name = 'sales' and action = 'UPDATE'`);
      expect(rows.at(-1)!.actor_id).toBe(users.ids.admin);
      expect(await cannotWrite(tx, 'delete from public.audit_logs')).toBe(true);
    });
    expect(await as(db, user(users.ids.super_admin), (tx) => cannotWrite(tx, 'delete from public.audit_logs'))).toBe(true);
    expect(await as(db, user(users.ids.editor), (tx) => count(tx, 'select 1 from public.audit_logs'))).toBe(0);
  });
});

describe('K-31 · tevkifat — dokümandaki örnek fatura', () => {
  const invoice = (overrides: Record<string, number | null> = {}) => {
    const v = { base_amount: 2939020, vat_amount: 587804, total_amount: 3526824, withholding_ratio: 0.4, withholding_amount: 235121.6, collectable_amount: 3291702.4, ...overrides };
    return db.query(`insert into public.invoices (sale_id, customer_id, type, base_amount, vat_amount, total_amount, withholding_ratio, withholding_amount, collectable_amount)
                     select $1, customer_id, 'proforma', $2, $3, $4, $5, $6, $7 from public.sales where id = $1`,
      [saleId, v.base_amount, v.vat_amount, v.total_amount, v.withholding_ratio, v.withholding_amount, v.collectable_amount]);
  };

  it('4/10 tevkifat: 587.804 × 0,4 = 235.121,60 → tahsil edilecek 3.291.702,40', async () => {
    await expect(invoice()).resolves.toBeDefined();
  });

  it('tevkifatsız fatura (varsayılan kapalı)', async () => {
    await expect(invoice({ withholding_ratio: null, withholding_amount: 0, collectable_amount: 3526824 })).resolves.toBeDefined();
  });

  it.each([
    ['yanlış tevkifat tutarı', { withholding_amount: 235121.61 }],
    ['tevkifat düşülmemiş tahsilat', { collectable_amount: 3526824 }],
    ['yanlış KDV', { vat_amount: 587000, total_amount: 3526020 }],
    ['geçersiz oran 6/10', { withholding_ratio: 0.6, withholding_amount: 352682.4, collectable_amount: 3174141.6 }],
  ])('reddeder: %s', async (_label, overrides) => {
    await expect(invoice(overrides)).rejects.toThrow(/check constraint|violates/);
  });
});

describe('belge numaraları', () => {
  it('yıl başına sayaç: TLP-YYYY-0001, 0002… ve yıl değişince sıfırlanır', async () => {
    const next = async (prefix: string, at: string) => (await db.query<{ n: string }>(`select app_private.next_document_no($1, $2::date) as n`, [prefix, at])).rows[0]!.n;
    expect(await next('TST', '2026-03-01')).toBe('TST-2026-0001');
    expect(await next('TST', '2026-11-30')).toBe('TST-2026-0002');
    expect(await next('TST', '2027-01-02')).toBe('TST-2027-0001');
  });
});
