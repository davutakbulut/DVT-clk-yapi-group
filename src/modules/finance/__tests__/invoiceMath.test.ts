import { describe, expect, it } from 'vitest';
import { agingBucket, computeInvoice, formatScheduleLines, parseScheduleLines } from '../domain/invoiceMath';

describe('invoiceMath', () => {
  it('05-SALES-FINANCE örneği: matrah 2.939.020 · KDV %20 · tevkifat 4/10', () => {
    const a = computeInvoice({ baseAmount: 2_939_020, vatRate: 0.2, withholdingRatio: 0.4 });
    expect(a).toEqual({ baseAmount: 2_939_020, vatAmount: 587_804, totalAmount: 3_526_824, withholdingAmount: 235_121.6, collectableAmount: 3_291_702.4 });
    expect(computeInvoice({ baseAmount: 1000, vatRate: 0.2, withholdingRatio: null })).toEqual({ baseAmount: 1000, vatAmount: 200, totalAmount: 1200, withholdingAmount: 0, collectableAmount: 1200 });
    // yarım yukarı: 0.005 → 0.01
    expect(computeInvoice({ baseAmount: 0.025, vatRate: 0.2, withholdingRatio: 1 }).vatAmount).toBe(0.01);
  });

  it('ödeme planı: oran → tutar (tahsil edilecek üzerinden), açık tutar öncelikli, vadesiz satır düşer', () => {
    const rows = parseScheduleLines('Peşinat | 30 | | 2026-10-01\nMontaj | %40 | 1.316.681 | 2026-11-15\nTeslim | 30 | | yok', 3_291_702.4);
    expect(rows).toEqual([
      { description: 'Peşinat', ratioPct: 30, amount: 987_510.72, dueDate: '2026-10-01' },
      { description: 'Montaj', ratioPct: 40, amount: 1_316_681, dueDate: '2026-11-15' },
    ]);
    expect(formatScheduleLines(rows)).toBe('Peşinat | 30 | 987510.72 | 2026-10-01\nMontaj | 40 | 1316681 | 2026-11-15');
  });

  it('yaşlandırma kovaları', () => {
    const today = new Date('2026-09-18T12:00:00Z');
    expect(agingBucket('2026-09-20', today)).toBe('current');
    expect(agingBucket('2026-09-01', today)).toBe('0-30');
    expect(agingBucket('2026-08-01', today)).toBe('31-60');
    expect(agingBucket('2026-06-25', today)).toBe('61-90');
    expect(agingBucket('2026-01-01', today)).toBe('90+');
  });
});
