import { appError, err, ok, type Result } from '@/core/errors/result';
import { getCurrentUser, type CurrentUser } from './currentUser';
import { STAFF_ROLES, type AppRole } from './roles';

/**
 * KAPI katmanı (K-14) — servis/Server Action girişinde AÇIK yetki kontrolü. RLS gerçek sınır olsa da MSSQL geçişinde
 * kaybolacağı için buradaki kontrol eksiksiz yazılır: rol listesi verilmezse tüm personel geçer.
 */
export async function requireRole(roles: readonly AppRole[] = STAFF_ROLES): Promise<Result<CurrentUser>> {
  const user = await getCurrentUser();
  if (!user) return err(appError('unauthorized', 'Oturum yok', { module: 'core/auth' }));
  if (!roles.includes(user.role)) return err(appError('forbidden', `Rol yetersiz: ${user.role}`, { module: 'core/auth' }));
  return ok(user);
}
