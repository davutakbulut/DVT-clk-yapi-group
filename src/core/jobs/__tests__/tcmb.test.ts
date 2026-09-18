import { describe, expect, it } from 'vitest';
import { parseTcmbXml } from '../tcmb';

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<Tarih_Date Tarih="18.09.2026" Date="09/18/2026" Bulten_No="2026/180">
  <Currency CrossOrder="0" Kod="USD" CurrencyCode="USD"><Unit>1</Unit><ForexBuying>40.1000</ForexBuying><ForexSelling>40.1723</ForexSelling></Currency>
  <Currency CrossOrder="9" Kod="EUR" CurrencyCode="EUR"><Unit>1</Unit><ForexBuying>47.0</ForexBuying><ForexSelling>47.0850</ForexSelling></Currency>
  <Currency CrossOrder="10" Kod="GBP" CurrencyCode="GBP"><Unit>1</Unit><ForexSelling>55.2</ForexSelling></Currency>
</Tarih_Date>`;

describe('parseTcmbXml', () => {
  it('USD/EUR döviz satış kuru ve bülten tarihi; diğer para birimleri atlanır', () => {
    expect(parseTcmbXml(XML)).toEqual([
      { currency: 'USD', rateDate: '2026-09-18', rate: 40.1723 },
      { currency: 'EUR', rateDate: '2026-09-18', rate: 47.085 },
    ]);
  });
  it('tarih yoksa ya da kur bozuksa güvenli', () => {
    expect(parseTcmbXml('<x/>')).toEqual([]);
    expect(parseTcmbXml(XML.replace('40.1723', 'abc'))).toEqual([{ currency: 'EUR', rateDate: '2026-09-18', rate: 47.085 }]);
  });
});
