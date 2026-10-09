import { describe, it } from 'vitest';
import { hall } from '../apps/hall';
import { expectMatchesGolden, loadGolden } from './golden';

describe('hol konfigüratörü · altın veri (prototip hol.html)', () => {
  for (const g of loadGolden('hol')) it(`durum ${JSON.stringify(g.variant)}`, () => expectMatchesGolden(hall, g));
});
