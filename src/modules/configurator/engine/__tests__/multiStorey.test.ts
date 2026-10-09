import { describe, it } from 'vitest';
import { multiStorey } from '../apps/multiStorey';
import { expectMatchesGolden, loadGolden } from './golden';

describe('çok katlı konfigüratörü · altın veri (prototip cok-katli.html)', () => {
  for (const g of loadGolden('cok-katli')) it(`durum ${JSON.stringify(g.variant)}`, () => expectMatchesGolden(multiStorey, g));
});
