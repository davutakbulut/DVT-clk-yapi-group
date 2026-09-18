import { describe, expect, it } from 'vitest';
import { formatExpenseLines, formatItemLines, parseExpenseLines, parseItemLines } from '../domain/saleLines';
import { computeSaleTotals, lineTotals, marginBand } from '../domain/saleMath';

describe('saleMath', () => {
  it('05-SALES-FINANCE örneği: kalemler + giderler + iskonto %2 + KDV %20; kâr ve marj', () => {
    const t = computeSaleTotals({
      lines: [
        { quantity: 45, unitPrice: 52_000, unitCost: 1_820_000 / 45 },
        { quantity: 380, unitPrice: 1_450, unitCost: 410_000 / 380 },
        { quantity: 6, unitPrice: 18_000, unitCost: 95_000 / 6 },
      ],
      expenses: [85_000, 22_000],
      discountPct: 2,
      isInvoiced: true,
      vatRate: 0.2,
      exchangeRate: 1,
      withCost: true,
    });
    expect(t.subtotal).toBe(2_999_000);
    expect(t.discountAmount).toBe(59_980);
    expect(t.vatAmount).toBe(587_804);
    expect(t.grandTotal).toBe(3_526_824);
    expect(t.grandTotalTry).toBe(3_526_824);
    // Birim maliyetler 2 ondalığa yuvarlanır → toplam maliyet dokümandaki 2.432.000'e çok yakın
    expect(Math.abs((t.totalCost ?? 0) - 2_432_000)).toBeLessThan(5);
    expect(marginBand(t.marginPct)).toBe('yellow');
  });

  it('kuruş yuvarlama ve döviz: 3 ondalık miktar, 6 ondalık kur; sales rolü maliyetsiz', () => {
    expect(lineTotals({ quantity: 1.333, unitPrice: 3, unitCost: null })).toEqual({ lineTotal: 4, lineCost: null, lineProfit: null });
    expect(lineTotals({ quantity: 0.005, unitPrice: 1, unitCost: 1 })).toEqual({ lineTotal: 0.01, lineCost: 0.01, lineProfit: 0 });
    const t = computeSaleTotals({ lines: [{ quantity: 10, unitPrice: 100, unitCost: 70 }], expenses: [50], discountPct: 0, isInvoiced: false, vatRate: 0.2, exchangeRate: 40.123456, withCost: false });
    expect(t).toEqual({ subtotal: 1000, discountAmount: 0, vatAmount: 0, grandTotal: 1000, grandTotalTry: 40_123.46, totalCost: null, grossProfit: null, marginPct: null });
    expect(computeSaleTotals({ lines: [], expenses: [], discountPct: 0, isInvoiced: true, vatRate: 0.2, exchangeRate: 1, withCost: true }).marginPct).toBeNull();
    expect(marginBand(9.99)).toBe('red');
    expect(marginBand(20)).toBe('yellow');
    expect(marginBand(20.01)).toBe('green');
  });
});

describe('saleLines', () => {
  it('kalem satırları: TR/EN sayı biçimi, maliyet yalnız admin, bozuk satır düşer', () => {
    const items = parseItemLines('Çelik Konstr. | 45 | ton | 52.000,00 | 40.444,44\nKutu Profil | 380 | m² | 1450\nBozuk | x | adet | 5', true);
    expect(items).toEqual([
      { description: 'Çelik Konstr.', quantity: 45, unit: 'ton', unitPrice: 52_000, unitCost: 40_444.44 },
      { description: 'Kutu Profil', quantity: 380, unit: 'm²', unitPrice: 1450, unitCost: null },
    ]);
    expect(parseItemLines('A | 1 | adet | 10 | 7', false)[0]!.unitCost).toBeNull();
    expect(formatItemLines(items, true).split('\n')[0]).toBe('Çelik Konstr. | 45 | ton | 52000 | 40444.44');
    expect(formatItemLines(items, false).split('\n')[1]).toBe('Kutu Profil | 380 | m² | 1450');
  });

  it('gider satırları: kategori doğrulanır, tarih isteğe bağlı', () => {
    const exp = parseExpenseLines('shipping | Nakliye | 85.000 | 2026-10-01\nTravel | | 22000\nyok | x | 5');
    expect(exp).toEqual([
      { category: 'shipping', description: 'Nakliye', amount: 85_000, expenseDate: '2026-10-01' },
      { category: 'travel', description: null, amount: 22_000, expenseDate: null },
    ]);
    expect(formatExpenseLines(exp)).toBe('shipping | Nakliye | 85000 | 2026-10-01\ntravel |  | 22000');
  });
});
