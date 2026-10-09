import { describe, it } from 'vitest';
import { fence } from '../apps/fence';
import { expectMatchesGolden, loadGolden } from './golden';

describe('çit & korkuluk konfigüratörü · altın veri (prototip cit-korkuluk.html)', () => {
  for (const g of loadGolden('cit-korkuluk')) it(`durum ${JSON.stringify(g.variant)}`, () => expectMatchesGolden(fence, g));
});
