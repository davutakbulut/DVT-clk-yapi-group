import { describe, expect, it } from 'vitest';
import { fieldErrorsFrom, registerSchema, resetSchema } from '../domain/schemas';

describe('auth › şemalar', () => {
  it('kayıt: kısa şifre ve bozuk e-posta alan anahtarına düşer', () => {
    const r = registerSchema.safeParse({ fullName: 'A', email: 'yok', password: '123' });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsFrom(r.error)).toEqual({ fullName: 'validation', email: 'emailInvalid', password: 'passwordShort' });
  });

  it('şifre yenileme: eşleşmeyen tekrar confirm alanına yazılır', () => {
    const r = resetSchema.safeParse({ password: 'sekizkarakter', confirm: 'farkli' });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrorsFrom(r.error)).toEqual({ confirm: 'passwordMismatch' });
  });
});
