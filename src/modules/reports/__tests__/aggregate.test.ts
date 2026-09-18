import { describe, expect, it } from 'vitest';
import { aging, byCustomer, byMonth, byService, calendar, costBreakdown, funnel, invoiceStatus, periodSummary, toCsv, type SaleFact } from '../domain/aggregate';

const sale = (o: Partial<SaleFact> & { id: string }): SaleFact => ({ saleDate: '2026-03-10', status: 'confirmed', customerId: 'c1', customerName: 'A', exchangeRate: 1, grandTotalTry: 1200, netTry: 1000, totalCostTry: 700, leadId: null, ...o });

describe('aggregate', () => {
  it('aylık ciro/kârlılık: taslak ve iptal hariç; maliyet eksikse kâr null (K-33)', () => {
    const rows = byMonth([sale({ id: '1' }), sale({ id: '2', saleDate: '2026-03-20', grandTotalTry: 600, netTry: 500, totalCostTry: 400 }), sale({ id: '3', saleDate: '2026-04-01', status: 'draft' }), sale({ id: '4', saleDate: '2026-04-02', totalCostTry: null })]);
    expect(rows).toEqual([
      { month: '2026-03', revenue: 1800, count: 2, cost: 1100, profit: 400, marginPct: 26.67 },
      { month: '2026-04', revenue: 1200, count: 1, cost: null, profit: null, marginPct: null },
    ]);
    const p = periodSummary([sale({ id: '1' })], '2026-03-01', '2026-03-31', [sale({ id: '0', saleDate: '2026-02-05', grandTotalTry: 1000 })]);
    expect(p).toEqual({ revenue: 1200, count: 1, previousRevenue: 1000, changePct: 20 });
  });

  it('hizmet ve müşteri bazlı sıralı; diğer etiketi; huni oranları', () => {
    const sales = [sale({ id: '1' }), sale({ id: '2', customerId: 'c2', customerName: 'B', grandTotalTry: 5000, netTry: 4000, totalCostTry: 1000, leadId: 'l1' })];
    expect(byService([{ saleId: '1', serviceName: 'Çatı', lineTotalTry: 1000, lineCostTry: 700 }, { saleId: '2', serviceName: null, lineTotalTry: 4000, lineCostTry: null }], sales, 'Diğer')).toEqual([
      { key: 'other', label: 'Diğer', revenue: 4000, count: 1, profit: null },
      { key: 'Çatı', label: 'Çatı', revenue: 1000, count: 1, profit: 300 },
    ]);
    expect(byCustomer(sales)[0]).toEqual({ key: 'c2', label: 'B', revenue: 5000, count: 1, profit: 3000 });
    expect(funnel([{ status: 'new', createdAt: '' }, { status: 'quoted', createdAt: '' }, { status: 'won', createdAt: '' }, { status: 'lost', createdAt: '' }], sales)).toEqual({ leads: 4, quoted: 2, won: 1, sales: 1, quotedRate: 50, wonRate: 25 });
  });

  it('fatura durumu, yaşlandırma, takvim, maliyet dağılımı, CSV', () => {
    expect(invoiceStatus([{ status: 'sent', collectableTry: 100, paidTry: 40 }, { status: 'sent', collectableTry: 50, paidTry: 0 }])).toEqual([{ status: 'sent', count: 2, collectable: 150, paid: 40 }]);
    const a = aging([{ dueDate: '2026-09-10', status: 'pending', amount: 100, paid: 0 }, { dueDate: '2026-07-01', status: 'partially_paid', amount: 200, paid: 50 }, { dueDate: '2026-01-01', status: 'paid', amount: 999, paid: 999 }, { dueDate: '2026-12-01', status: 'pending', amount: 300, paid: 0 }], '2026-09-18');
    expect(a).toEqual([
      { bucket: '0-30', count: 1, amount: 100 },
      { bucket: '31-60', count: 0, amount: 0 },
      { bucket: '61-90', count: 1, amount: 150 },
      { bucket: '90+', count: 0, amount: 0 },
    ]);
    expect(calendar([{ dueDate: '2026-12-01', status: 'pending', amount: 300, paid: 0 }, { dueDate: '2026-12-15', status: 'pending', amount: 100, paid: 20 }], '2026-09-18')).toEqual([{ month: '2026-12', count: 2, amount: 380 }]);
    expect(costBreakdown([{ saleId: '1', category: 'shipping', amountTry: 100 }], [{ saleId: '1', serviceName: null, lineTotalTry: 0, lineCostTry: 300 }])).toEqual([
      { category: 'item', amount: 300, sharePct: 75 },
      { category: 'shipping', amount: 100, sharePct: 25 },
    ]);
    expect(toCsv(['a', 'b'], [['x"y', 1.5], [null, 0]])).toBe('\uFEFF"a";"b"\r\n"x""y";"1.5"\r\n;"0"\r\n');
  });
});
