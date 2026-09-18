import { describe, expect, it } from 'vitest';
import { fieldErrorsFrom, mapAuthError, registerSchema, resetSchema } from '../domain/schemas';

describe('auth › şemalar ve hata eşlemesi', () => {
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

  it('Supabase mesajları ekrana sızmaz, anahtara iner', () => {
    expect(mapAuthError('Invalid login credentials', 400)).toBe('invalidCredentials');
    expect(mapAuthError('Email not confirmed')).toBe('emailNotConfirmed');
    expect(mapAuthError('Request rate limit reached', 429)).toBe('rateLimited');
    expect(mapAuthError('Auth session missing!')).toBe('sessionExpired');
    expect(mapAuthError('database error saving new user')).toBe('unexpected');
  });
});
