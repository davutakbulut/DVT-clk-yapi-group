import { describe, expect, it } from 'vitest';
import { isReservedTestAddress } from '../reservedAddress';

describe('isReservedTestAddress', () => {
  it('teste ayrılmış alan adları gönderilmez', () => {
    for (const a of ['e2e-talep@example.com', 'x@mail.example.org', 'A@EXAMPLE.NET', 'u@site.test', 'u@foo.invalid', 'u@a.localhost']) expect(isReservedTestAddress(a), a).toBe(true);
  });
  it('gerçek adresler gönderilir (benzer adlar dahil)', () => {
    for (const a of ['info@clkyapigroup.com', 'ali@gmail.com', 'x@myexample.com', 'x@example.com.tr', 'x@contest.com']) expect(isReservedTestAddress(a), a).toBe(false);
  });
});
