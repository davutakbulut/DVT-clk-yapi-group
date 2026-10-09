import { describe, it } from 'vitest';
import { mezzanine } from '../apps/mezzanine';
import { expectMatchesGolden, loadGolden } from './golden';

describe('ara kat konfigüratörü · altın veri (prototip ara-kat.html)', () => {
  for (const g of loadGolden('ara-kat')) it(`durum ${JSON.stringify(g.variant)}`, () => expectMatchesGolden(mezzanine, g));
});
