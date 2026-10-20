// Koddaki her .rpc('ad') çağrısının MariaDB'de bir işleyicisi olmalı (K-116): eksik işleyici canlıda 404 PGRST202 verirdi.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '__tests__' || name === 'types' ? [] : files(p); // types: üretilmiş veritabanı tipleri çağrı değil
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

describe('RPC kapsamı', () => {
  it('çağrılan her RPC tanımlı', async () => {
    const { RPCS } = await import('../rpc');
    const called = new Set<string>();
    for (const f of files(join(process.cwd(), 'src'))) for (const m of readFileSync(f, 'utf8').matchAll(/\.rpc\(\s*['"]([a-z_]+)['"]/g)) called.add(m[1]!);
    expect([...called].filter((n) => !Object.hasOwn(RPCS, n)).sort()).toEqual([]);
    expect(called.size).toBeGreaterThan(40);
  });
});
