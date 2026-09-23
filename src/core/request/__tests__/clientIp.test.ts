import { afterEach, describe, expect, it } from 'vitest';
import { clientIp } from '../clientIp';

const h = (m: Record<string, string>) => ({ get: (k: string) => m[k.toLocaleLowerCase('en')] ?? null });
describe('clientIp (K-104)', () => {
  afterEach(() => { delete process.env['TRUSTED_PROXY_HOPS']; });
  it('sahte X-Forwarded-For baştaki değil, proxy\'nin eklediği SON adres alınır', () => {
    expect(clientIp(h({ 'x-forwarded-for': '203.0.113.9, 85.1.2.3' }))).toBe('85.1.2.3');
    expect(clientIp(h({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 85.1.2.3' }))).toBe('85.1.2.3');
    expect(clientIp(h({ 'x-forwarded-for': '85.1.2.3' }))).toBe('85.1.2.3');
  });
  it('TRUSTED_PROXY_HOPS=2 → sondan ikinci; x-real-ip yedeği; hiçbiri yoksa unknown', () => {
    process.env['TRUSTED_PROXY_HOPS'] = '2';
    expect(clientIp(h({ 'x-forwarded-for': '1.1.1.1, 85.1.2.3, 10.0.0.1' }))).toBe('85.1.2.3');
    delete process.env['TRUSTED_PROXY_HOPS'];
    expect(clientIp(h({ 'x-real-ip': '::ffff:85.1.2.3' }))).toBe('85.1.2.3');
    expect(clientIp(h({}))).toBe('unknown');
  });
  it('IPv6 /64 önekine indirgenir (aynı abone farklı adreslerle sınırı aşamaz)', () => {
    expect(clientIp(h({ 'x-forwarded-for': '2a06:41c0:1:31:abcd:1:2:3' }))).toBe('2a06:41c0:1:31::/64');
  });
});
