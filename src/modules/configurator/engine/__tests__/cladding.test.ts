import { describe, it } from 'vitest';
import { cladding } from '../apps/cladding';
import { expectMatchesGolden, loadGolden } from './golden';

describe('çatı & cephe konfigüratörü · altın veri (prototip cati-cephe.html)', () => {
  for (const g of loadGolden('cati-cephe')) it(`durum ${JSON.stringify(g.variant)}`, () => expectMatchesGolden(cladding, g));
});
