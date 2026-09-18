import { cache } from 'react';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { isAppRole, isStaffRole, type AppRole } from './roles';

export interface CurrentUser {
  readonly id: string;
  readonly email: string;
  readonly role: AppRole;
  readonly isStaff: boolean;
  readonly fullName: string;
  readonly mustChangePassword: boolean;
  readonly preferredLocale: string;
}

/**
 * Oturumdaki kullanıcı + profili. İstek başına bir kez (React cache). Asla fırlatmaz: hata → null (anonim).
 * getSession() değil getUser(): çerezdeki JWT'ye güvenmez, auth sunucusuna doğrulatır. Bu KAPI katmanıdır (K-14);
 * gerçek sınır yine RLS. Pasif hesap anonim sayılır.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const client = await createServerClient();
  if (!client.ok) return null;
  try {
    const { data } = await client.data.auth.getUser();
    const user = data.user;
    if (!user) return null;
    const { data: profile, error } = await client.data
      .from('profiles')
      .select('role, full_name, is_active, must_change_password, preferred_locale')
      .eq('id', user.id)
      .maybeSingle();
    if (error || !profile || !isAppRole(profile.role) || !profile.is_active) return null;
    return {
      id: user.id,
      email: user.email ?? '',
      role: profile.role,
      isStaff: isStaffRole(profile.role),
      fullName: profile.full_name ?? '',
      mustChangePassword: profile.must_change_password,
      preferredLocale: profile.preferred_locale,
    };
  } catch (cause) {
    logger.warn('Oturum okunamadı, anonim devam ediliyor', { module: 'core/auth', cause });
    return null;
  }
});
