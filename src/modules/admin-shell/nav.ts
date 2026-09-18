import type { AppRole } from '@/core/auth';

// Modül kayıt listesi (CONTRIBUTING › Yeni Modül Ekleme): her faz kendi satırını ekler. Etiketler Admin.nav.<key>.
export interface AdminNavItem {
  readonly key: 'dashboard' | 'home' | 'services' | 'projects' | 'projectCategories' | 'blog' | 'blogTaxonomy' | 'comments' | 'leads' | 'mailTemplates' | 'formSettings' | 'team' | 'references' | 'certificates' | 'careers' | 'applications' | 'faq' | 'products' | 'productCategories' | 'solutions' | 'pricing' | 'materialPrices' | 'testimonials' | 'notifications' | 'customers' | 'sales' | 'invoices' | 'reports' | 'translations' | 'redirects' | 'audit' | 'modules' | 'legalPages' | 'seoSettings' | 'cookieSettings' | 'maintenance' | 'menus' | 'settings' | 'whatsapp' | 'errors' | 'media' | 'users';
  readonly href: string;
  readonly roles?: readonly AppRole[];
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { key: 'dashboard', href: '/admin' },
  { key: 'home', href: '/admin/pages/home', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'services', href: '/admin/services', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'projects', href: '/admin/projects', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'projectCategories', href: '/admin/project-categories', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'products', href: '/admin/products', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'solutions', href: '/admin/solutions', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'pricing', href: '/admin/pricing', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'materialPrices', href: '/admin/pricing/materials', roles: ['super_admin', 'admin'] },
  { key: 'testimonials', href: '/admin/testimonials', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'notifications', href: '/admin/notifications' },
  { key: 'customers', href: '/admin/customers', roles: ['super_admin', 'admin', 'sales', 'viewer'] },
  { key: 'sales', href: '/admin/sales', roles: ['super_admin', 'admin', 'sales', 'viewer'] },
  { key: 'invoices', href: '/admin/invoices', roles: ['super_admin', 'admin', 'sales', 'viewer'] },
  { key: 'reports', href: '/admin/reports', roles: ['super_admin', 'admin', 'sales', 'viewer'] },
  { key: 'translations', href: '/admin/translations', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'redirects', href: '/admin/redirects', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'modules', href: '/admin/settings/modules', roles: ['super_admin', 'admin'] },
  { key: 'audit', href: '/admin/audit', roles: ['super_admin', 'admin'] },
  { key: 'productCategories', href: '/admin/product-categories', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'blog', href: '/admin/blog', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'blogTaxonomy', href: '/admin/blog/taxonomy', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'comments', href: '/admin/blog/comments', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'leads', href: '/admin/leads' },
  { key: 'team', href: '/admin/team', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'references', href: '/admin/references', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'certificates', href: '/admin/certificates', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'careers', href: '/admin/careers', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'applications', href: '/admin/careers/applications', roles: ['super_admin', 'admin'] },
  { key: 'faq', href: '/admin/faq', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'mailTemplates', href: '/admin/mail-templates', roles: ['super_admin', 'admin'] },
  { key: 'formSettings', href: '/admin/settings/form', roles: ['super_admin', 'admin'] },
  { key: 'menus', href: '/admin/menus', roles: ['super_admin', 'admin'] },
  { key: 'settings', href: '/admin/settings', roles: ['super_admin', 'admin'] },
  { key: 'whatsapp', href: '/admin/settings/whatsapp', roles: ['super_admin', 'admin'] },
  { key: 'seoSettings', href: '/admin/settings/seo', roles: ['super_admin', 'admin'] },
  { key: 'cookieSettings', href: '/admin/settings/cookies', roles: ['super_admin', 'admin'] },
  { key: 'maintenance', href: '/admin/settings/maintenance', roles: ['super_admin', 'admin'] },
  { key: 'legalPages', href: '/admin/pages', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'errors', href: '/admin/pages/errors', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'media', href: '/admin/media', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'users', href: '/admin/users', roles: ['super_admin', 'admin'] },
];
