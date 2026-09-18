import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(css|tsx|ts)$/.test(name) && !path.includes('__tests__')) out.push(path);
  }
  return out;
}

// Tanımsız CSS değişkeni sessizce "geçersiz değer" olur (iç boşluk 0'a düşer, font boyutu miras kalır) ve derleme hata vermez.
// `--space-5`, `--space-10`, `--fs-h4` böyle kaçmıştı. Yedek değeri olan kullanım (var(--x, y)) sayılmaz.
describe('CSS tokenları', () => {
  it('yedeksiz kullanılan her var(--x) bir yerde tanımlı', () => {
    const files = walk('src');
    const text = files.map((f) => readFileSync(f, 'utf8'));
    const defined = new Set<string>();
    for (const t of text) {
      for (const m of t.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) defined.add(m[1]!);
      for (const m of t.matchAll(/setProperty\('(--[a-zA-Z0-9-]+)'/g)) defined.add(m[1]!);
      for (const m of t.matchAll(/'(--[a-zA-Z0-9-]+)':/g)) defined.add(m[1]!);
      for (const m of t.matchAll(/variable: '(--[a-zA-Z0-9-]+)'/g)) defined.add(m[1]!);
    }
    const missing = new Set<string>();
    for (const t of text) for (const m of t.matchAll(/var\((--[a-zA-Z0-9-]+)(\s*,)?/g)) if (!m[2] && !defined.has(m[1]!) && !m[1]!.startsWith('--tw-')) missing.add(m[1]!);
    expect([...missing].sort()).toEqual([]);
  });
});
