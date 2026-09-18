import type { AppRole } from '@/core/auth';

// Modül kayıt listesi (CONTRIBUTING › Yeni Modül Ekleme): her faz kendi satırını ekler. Etiketler Admin.nav.<key>.
export interface AdminNavItem {
  readonly key: 'dashboard' | 'home' | 'services' | 'projects' | 'projectCategories' | 'blog' | 'blogTaxonomy' | 'comments' | 'menus' | 'settings' | 'whatsapp' | 'errors' | 'media' | 'users';
  readonly href: string;
  readonly roles?: readonly AppRole[];
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { key: 'dashboard', href: '/admin' },
  { key: 'home', href: '/admin/pages/home', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'services', href: '/admin/services', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'projects', href: '/admin/projects', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'projectCategories', href: '/admin/project-categories', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'blog', href: '/admin/blog', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'blogTaxonomy', href: '/admin/blog/taxonomy', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'comments', href: '/admin/blog/comments', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'menus', href: '/admin/menus', roles: ['super_admin', 'admin'] },
  { key: 'settings', href: '/admin/settings', roles: ['super_admin', 'admin'] },
  { key: 'whatsapp', href: '/admin/settings/whatsapp', roles: ['super_admin', 'admin'] },
  { key: 'errors', href: '/admin/pages/errors', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'media', href: '/admin/media', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'users', href: '/admin/users', roles: ['super_admin', 'admin'] },
];
