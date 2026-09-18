import { z } from 'zod';

// Hata kodları messages/*.json › Auth.errors anahtarlarıdır; metin burada değil (Kural 1 istisnası: mikro-metin).
export const emailSchema = z.string().trim().email('emailInvalid').max(254);
export const passwordSchema = z.string().min(8, 'passwordShort').max(128);

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, 'validation'), next: z.string().optional() });
export const registerSchema = z.object({ fullName: z.string().trim().min(2, 'validation').max(120), email: emailSchema, password: passwordSchema });
export const forgotSchema = z.object({ email: emailSchema });
export const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'passwordMismatch', path: ['confirm'] });
export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'validation').max(120),
  phone: z.string().trim().max(32).optional().or(z.literal('')),
  preferredLocale: z.enum(['tr', 'en']),
});

export type AuthErrorKey =
  | 'invalidCredentials' | 'emailNotConfirmed' | 'validation' | 'passwordMismatch' | 'passwordShort' | 'emailInvalid'
  | 'rateLimited' | 'notConfigured' | 'unexpected' | 'sessionExpired';

/** Form durumu: alan hataları anahtar olarak döner, bileşen t('Auth.errors.<key>') ile çevirir. */
export interface AuthFormState {
  readonly ok: boolean;
  readonly error?: AuthErrorKey;
  readonly fieldErrors?: Readonly<Record<string, AuthErrorKey>>;
  readonly done?: boolean;
}

export const INITIAL_STATE: AuthFormState = { ok: false };

export function fieldErrorsFrom(error: z.ZodError): Record<string, AuthErrorKey> {
  const out: Record<string, AuthErrorKey> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in out)) out[key] = (issue.message as AuthErrorKey) || 'validation';
  }
  return out;
}

/** Supabase auth hatasını kullanıcıya gösterilebilir anahtara indirger; ayrıntı log'a gider, ekrana değil. */
export function mapAuthError(message: string, status?: number): AuthErrorKey {
  const m = message.toLocaleLowerCase('en');
  if (status === 429 || m.includes('rate limit')) return 'rateLimited';
  if (m.includes('email not confirmed')) return 'emailNotConfirmed';
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) return 'invalidCredentials';
  if (m.includes('session') && (m.includes('missing') || m.includes('expired'))) return 'sessionExpired';
  if (m.includes('token') && (m.includes('expired') || m.includes('invalid'))) return 'sessionExpired';
  return 'unexpected';
}
