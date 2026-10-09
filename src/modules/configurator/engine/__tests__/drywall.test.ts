import { describe, it } from 'vitest';
import { drywall } from '../apps/drywall';
import { expectMatchesGolden, loadGolden } from './golden';

describe('alçıpan bölme duvar konfigüratörü · altın veri (prototip alcipan-duvar.html)', () => {
  for (const g of loadGolden('alcipan-duvar')) it(`durum ${JSON.stringify(g.variant)}`, () => expectMatchesGolden(drywall, g));
});
