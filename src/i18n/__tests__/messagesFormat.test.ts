import { IntlMessageFormat } from 'intl-messageformat';
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import tr from '../../../messages/tr.json';

type Tree = { [key: string]: string | Tree };
const flatten = (o: Tree, prefix = ''): [string, string][] => Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[prefix + k, v] as [string, string]] : flatten(v, `${prefix}${k}.`)));

// Düz metindeki süslü parantez ICU'da değişken sayılır: "{{url}}" → MALFORMED_ARGUMENT (panelde WhatsApp formunda yaşandı).
// Kaçış: '{{url}}'. Bu test her mesajı ayrıştırır; bozuk biçim derlemeye girmeden yakalanır.
describe('mesaj dosyaları', () => {
  for (const [locale, messages] of [['tr', tr], ['en', en]] as const) {
    it(`${locale}: her mesaj geçerli ICU biçiminde`, () => {
      const broken = flatten(messages as Tree).filter(([, value]) => {
        try {
          new IntlMessageFormat(value, locale);
          return false;
        } catch {
          return true;
        }
      });
      expect(broken.map(([key]) => key)).toEqual([]);
    });
  }
  it('TR ve EN aynı anahtar kümesine sahip', () => {
    const keys = (o: Tree) => flatten(o).map(([k]) => k).sort();
    const trKeys = new Set(keys(tr as Tree));
    const enKeys = new Set(keys(en as Tree));
    expect([...trKeys].filter((k) => !enKeys.has(k))).toEqual([]);
    expect([...enKeys].filter((k) => !trKeys.has(k))).toEqual([]);
  });
});
