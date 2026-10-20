'use server';

import { z } from 'zod';
import { ALL_ROLES, requireRole } from '@/core/auth';
import { inviteByEmail } from '@/core/auth/authFlow';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { getPathname } from '@/i18n/navigation';
import { DONE, failed, type ActionState } from '@/lib/formState';

/** Rol/aktiflik: yalnız super_admin (tetikleyici guard_profile_privileges de zorlar; burada anlaşılır hata). */
export async function updateProfileRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(['super_admin']);
  if (!gate.ok) return failed('forbidden');
  const parsed = z.object({ id: z.string().uuid(), role: z.enum(ALL_ROLES), isActive: z.coerce.boolean() }).safeParse({ ...Object.fromEntries(formData), isActive: formData.get('isActive') === 'on' });
  if (!parsed.success) return failed('validation');
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const { error } = await client.data.from('profiles').update({ role: parsed.data.role, is_active: parsed.data.isActive }).eq('id', parsed.data.id);
  if (error) {
    logger.warn('Rol güncellenemedi', { module: 'users', code: error.code, message: error.message });
    if (error.code === '23514') return failed('lastSuperAdmin');
    return failed(error.code === '42501' ? 'forbidden' : 'unexpected');
  }
  return DONE;
}

/**
 * Davet: kullanıcı 'member' profiliyle şifresiz açılır, e-postasına 7 gün geçerli bağlantı gider (K-116); bağlantı oturum
 * açar ve şifre belirleme sayfasına götürür. Rolü super_admin buradan atar.
 */
export async function inviteUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(['super_admin', 'admin']);
  if (!gate.ok) return failed('forbidden');
  const parsed = z.object({ email: z.string().trim().email(), fullName: z.string().trim().max(120).optional().or(z.literal('')) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return failed('validation', { email: 'validation' });
  // personel dili TR (davet metni ve açılış sayfası)
  const res = await inviteByEmail({
    email: parsed.data.email,
    fullName: parsed.data.fullName ?? '',
    locale: 'tr',
    setPasswordPath: getPathname({ locale: 'tr', href: '/reset-password' }),
    accountPath: getPathname({ locale: 'tr', href: '/account' }),
  });
  if (!res.ok) {
    logger.warn('Davet gönderilemedi', { module: 'users', message: res.error.message });
    return failed('unexpected');
  }
  return DONE;
}
