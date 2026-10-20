// Yerel betiklerin (scripts/mysql/lib.mjs) ürettiği şifre özeti ve jeton özeti uygulamanınkiyle uyumlu olmalı (K-116).
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

describe('betik ↔ uygulama şifre özeti', () => {
  it('betikte üretilen özeti uygulama doğrular; jeton özeti aynı', async () => {
    // @ts-expect-error — .mjs betik modülü, tip bildirimi yok
    const lib = (await import('../../../../../scripts/mysql/lib.mjs')) as { hashPassword(p: string): Promise<string>; tokenHash(t: string): string };
    const { verifyPassword, tokenHash } = await import('../authStore');
    const hash = await lib.hashPassword('Örnek-şifre-123');
    expect(await verifyPassword('Örnek-şifre-123', hash)).toBe(true);
    expect(await verifyPassword('yanlış', hash)).toBe(false);
    expect(lib.tokenHash('abc')).toBe(tokenHash('abc'));
  });
});
