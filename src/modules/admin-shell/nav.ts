import type { AppRole } from '@/core/auth';

// Modül kayıt listesi (CONTRIBUTING › Yeni Modül Ekleme): her faz kendi satırını ekler. Etiketler Admin.nav.<key>.
/** Kenar çubuğu bölümleri — iş akışına göre: önce günlük işler (içerik, talepler), sonda ayar ve sistem. */
export const ADMIN_NAV_GROUPS = ['overview', 'content', 'catalog', 'corporate', 'crm', 'configurator', 'analytics', 'site', 'settings', 'system'] as const;
export type AdminNavGroup = (typeof ADMIN_NAV_GROUPS)[number];

export interface AdminNavItem {
  readonly key: 'dashboard' | 'home' | 'services' | 'projects' | 'projectCategories' | 'blog' | 'blogTaxonomy' | 'comments' | 'leads' | 'mailTemplates' | 'formSettings' | 'team' | 'references' | 'certificates' | 'careers' | 'applications' | 'faq' | 'products' | 'productCategories' | 'solutions' | 'pricing' | 'materialPrices' | 'steelProfiles' | 'configurations' | 'configuratorRules' | 'testimonials' | 'notifications' | 'customers' | 'sales' | 'invoices' | 'reports' | 'analytics' | 'analyticsSettings' | 'heatmap' | 'funnels' | 'formAnalytics' | 'journeys' | 'errorLogs' | 'brokenLinks' | 'vitals' | 'translations' | 'redirects' | 'audit' | 'modules' | 'legalPages' | 'seoSettings' | 'cookieSettings' | 'maintenance' | 'menus' | 'settings' | 'whatsapp' | 'errors' | 'media' | 'users';
  readonly href: string;
  /** Kenar çubuğu bölümü (ADMIN_NAV_GROUPS sırasıyla gösterilir). */
  readonly group: AdminNavGroup;
  readonly roles?: readonly AppRole[];
}

export const ADMIN_NAV: readonly AdminNavItem[] = [
  { key: 'dashboard', href: '/admin', group: 'overview' },
  { key: 'notifications', href: '/admin/notifications', group: 'overview' },
  { key: 'home', href: '/admin/pages/home', group: 'content', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'services', href: '/admin/services', group: 'content', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'solutions', href: '/admin/solutions', group: 'content', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'projects', href: '/admin/projects', group: 'content', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'projectCategories', href: '/admin/project-categories', group: 'content', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'blog', href: '/admin/blog', group: 'content', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'blogTaxonomy', href: '/admin/blog/taxonomy', group: 'content', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'comments', href: '/admin/blog/comments', group: 'content', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'testimonials', href: '/admin/testimonials', group: 'content', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'faq', href: '/admin/faq', group: 'content', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'media', href: '/admin/media', group: 'content', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'products', href: '/admin/products', group: 'catalog', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'productCategories', href: '/admin/product-categories', group: 'catalog', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'pricing', href: '/admin/pricing', group: 'catalog', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'materialPrices', href: '/admin/pricing/materials', group: 'catalog', roles: ['super_admin', 'admin'] },
  { key: 'team', href: '/admin/team', group: 'corporate', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'references', href: '/admin/references', group: 'corporate', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'certificates', href: '/admin/certificates', group: 'corporate', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'careers', href: '/admin/careers', group: 'corporate', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'applications', href: '/admin/careers/applications', group: 'corporate', roles: ['super_admin', 'admin'] },
  { key: 'leads', href: '/admin/leads', group: 'crm' },
  { key: 'customers', href: '/admin/customers', group: 'crm', roles: ['super_admin', 'admin', 'sales', 'viewer'] },
  { key: 'sales', href: '/admin/sales', group: 'crm', roles: ['super_admin', 'admin', 'sales', 'viewer'] },
  { key: 'invoices', href: '/admin/invoices', group: 'crm', roles: ['super_admin', 'admin', 'sales', 'viewer'] },
  { key: 'reports', href: '/admin/reports', group: 'crm', roles: ['super_admin', 'admin', 'sales', 'viewer'] },
  { key: 'configurations', href: '/admin/configurator', group: 'configurator', roles: ['super_admin', 'admin', 'sales', 'viewer', 'editor'] },
  { key: 'configuratorRules', href: '/admin/configurator/rules', group: 'configurator', roles: ['super_admin', 'admin'] },
  { key: 'steelProfiles', href: '/admin/configurator/profiles', group: 'configurator', roles: ['super_admin', 'admin'] },
  { key: 'analytics', href: '/admin/analytics', group: 'analytics' },
  { key: 'heatmap', href: '/admin/analytics/heatmap', group: 'analytics' },
  { key: 'journeys', href: '/admin/analytics/journeys', group: 'analytics' },
  { key: 'funnels', href: '/admin/analytics/funnels', group: 'analytics' },
  { key: 'formAnalytics', href: '/admin/analytics/forms', group: 'analytics' },
  { key: 'vitals', href: '/admin/analytics/vitals', group: 'analytics' },
  { key: 'menus', href: '/admin/menus', group: 'site', roles: ['super_admin', 'admin'] },
  { key: 'legalPages', href: '/admin/pages', group: 'site', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'errors', href: '/admin/pages/errors', group: 'site', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'translations', href: '/admin/translations', group: 'site', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'redirects', href: '/admin/redirects', group: 'site', roles: ['super_admin', 'admin', 'editor'] },
  { key: 'seoSettings', href: '/admin/settings/seo', group: 'site', roles: ['super_admin', 'admin'] },
  { key: 'settings', href: '/admin/settings', group: 'settings', roles: ['super_admin', 'admin'] },
  { key: 'whatsapp', href: '/admin/settings/whatsapp', group: 'settings', roles: ['super_admin', 'admin'] },
  { key: 'formSettings', href: '/admin/settings/form', group: 'settings', roles: ['super_admin', 'admin'] },
  { key: 'mailTemplates', href: '/admin/mail-templates', group: 'settings', roles: ['super_admin', 'admin'] },
  { key: 'cookieSettings', href: '/admin/settings/cookies', group: 'settings', roles: ['super_admin', 'admin'] },
  { key: 'analyticsSettings', href: '/admin/settings/analytics', group: 'settings', roles: ['super_admin', 'admin'] },
  { key: 'modules', href: '/admin/settings/modules', group: 'settings', roles: ['super_admin', 'admin'] },
  { key: 'maintenance', href: '/admin/settings/maintenance', group: 'settings', roles: ['super_admin', 'admin'] },
  { key: 'users', href: '/admin/users', group: 'system', roles: ['super_admin', 'admin'] },
  { key: 'audit', href: '/admin/audit', group: 'system', roles: ['super_admin', 'admin'] },
  { key: 'errorLogs', href: '/admin/errors', group: 'system', roles: ['super_admin', 'admin'] },
  { key: 'brokenLinks', href: '/admin/errors/links', group: 'system', roles: ['super_admin', 'admin', 'editor'] },
];
