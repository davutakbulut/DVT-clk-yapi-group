export const ALL_ROLES = ['super_admin', 'admin', 'editor', 'sales', 'viewer', 'member'] as const;
export type AppRole = (typeof ALL_ROLES)[number];

/** Yönetim paneline girebilen roller. `member` ön yüz üye alanına girer, panele giremez. */
export const STAFF_ROLES = ['super_admin', 'admin', 'editor', 'sales', 'viewer'] as const satisfies readonly AppRole[];
export type StaffRole = (typeof STAFF_ROLES)[number];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (ALL_ROLES as readonly string[]).includes(value);
}

export function isStaffRole(role: AppRole): role is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(role);
}
