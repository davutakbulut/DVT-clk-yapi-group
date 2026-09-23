'use client';

import { BarChart3, Boxes, Building2, ChevronDown, ExternalLink, FileText, Globe, Handshake, LayoutDashboard, LogOut, Menu, Ruler, Search, Settings, ShieldCheck, X, type LucideIcon } from 'lucide-react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CurrentUser } from '@/core/auth';
import { signOut } from '@/modules/auth/actions';
import { ADMIN_NAV_GROUPS, type AdminNavGroup, type AdminNavItem } from '../../nav';

interface Props {
  /** K-99: kenar çubuğu altı geliştirici imzası (site ayarı) */
  readonly credit?: string | null;
  readonly user: CurrentUser;
  readonly nav: readonly AdminNavItem[];
  /** Başlık çubuğuna ek (ör. bildirim zili) — layout verir, modül sınırı korunur. */
  readonly headerExtra?: ReactNode;
  readonly children: ReactNode;
}

const GROUP_ICONS: Record<AdminNavGroup, LucideIcon> = {
  overview: LayoutDashboard,
  content: FileText,
  catalog: Boxes,
  corporate: Building2,
  crm: Handshake,
  configurator: Ruler,
  analytics: BarChart3,
  site: Globe,
  settings: Settings,
  system: ShieldCheck,
};

const OPEN_KEY = 'clk:admin-nav-open';

/** En uzun eşleşen href kazanır: /admin/pricing/materials açıkken /admin/pricing işaretlenmez. */
function activeKey(items: readonly AdminNavItem[], pathname: string): string | null {
  let best: AdminNavItem | null = null;
  for (const item of items) {
    const match = item.href === '/admin' ? pathname === '/admin' : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (match && (!best || item.href.length > best.href.length)) best = item;
  }
  return best?.key ?? null;
}

// Türkçe büyük/küçük harf tuzağı (K-16): toLowerCase yerine yerel duyarlı karşılaştırma
const norm = (s: string) => s.toLocaleLowerCase('tr-TR');

/**
 * Panel çatısı: koyu marka kenar çubuğu (bölümlere ayrılmış, daraltılabilir, aranabilir) + yapışkan üst şerit
 * (konum kırıntısı · bildirim · siteyi gör · kullanıcı · çıkış). Tüm metin Admin.* mesajlarından; roller menüyü süzer.
 */
export function AdminShell({ user, nav, headerExtra, children, credit = null }: Props) {
  const t = useTranslations('Admin');
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [query, setQuery] = useState('');
  const items = useMemo(() => nav.filter((item) => !item.roles || item.roles.includes(user.role)), [nav, user.role]);
  const current = activeKey(items, pathname);
  const currentItem = items.find((i) => i.key === current) ?? null;
  // Açık bölümler: varsayılan yalnız bulunulan bölüm + Genel; kullanıcının seçimi bu tarayıcıda hatırlanır
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(() => new Set(['overview', currentItem?.group ?? 'overview']));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(OPEN_KEY);
      if (raw) setOpenGroups(new Set([...(JSON.parse(raw) as string[]), currentItem?.group ?? 'overview']));
    } catch {
      // depolama yok
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnız ilk yüklemede okunur
  }, []);
  // Sayfa değişince: bulunulan bölüm açılır, mobil çekmece kapanır
  useEffect(() => {
    setDrawer(false);
    if (currentItem) setOpenGroups((prev) => (prev.has(currentItem.group) ? prev : new Set([...prev, currentItem.group])));
  }, [pathname, currentItem]);

  const toggle = (group: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify([...next]));
      } catch {
        // depolama yok
      }
      return next;
    });

  const q = norm(query.trim());
  const grouped = ADMIN_NAV_GROUPS.map((group) => ({
    group,
    items: items.filter((i) => i.group === group && (!q || norm(t(`nav.${i.key}`)).includes(q) || norm(t(`navGroups.${group}`)).includes(q))),
  })).filter((g) => g.items.length > 0);

  const initials = (user.fullName || user.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toLocaleUpperCase('tr-TR'))
    .join('');

  const sidebar = (
    <div className="admin-sidebar-inner">
      <NextLink href="/admin" className="admin-brand">
        <span className="admin-brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="text-sm font-semibold tracking-wide">{t('title')}</span>
      </NextLink>
      <label className="admin-nav-search">
        <Search size={14} aria-hidden="true" />
        <span className="sr-only">{t('navFilter')}</span>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('navFilter')} />
      </label>
      <nav aria-label={t('title')} className="admin-nav">
        {grouped.length === 0 ? <p className="px-3 py-2 text-xs text-sidebar-foreground/60">{t('navFilterEmpty')}</p> : null}
        {grouped.map(({ group, items: groupItems }) => {
          const Icon = GROUP_ICONS[group];
          const isOpen = Boolean(q) || openGroups.has(group);
          const hasCurrent = groupItems.some((i) => i.key === current);
          return (
            <section key={group} className="admin-nav-group" data-open={isOpen ? '' : undefined}>
              <button type="button" className="admin-nav-group-head" aria-expanded={isOpen} aria-controls={`nav-${group}`} onClick={() => toggle(group)} data-current={hasCurrent ? '' : undefined}>
                <Icon size={16} aria-hidden="true" />
                <span className="flex-1 text-left">{t(`navGroups.${group}`)}</span>
                <span className="admin-nav-count">{groupItems.length}</span>
                <ChevronDown size={14} aria-hidden="true" className="admin-nav-chevron" />
              </button>
              <ul id={`nav-${group}`} hidden={!isOpen}>
                {groupItems.map((item) => (
                  <li key={item.key}>
                    <NextLink href={item.href} aria-current={item.key === current ? 'page' : undefined} className="admin-nav-link">
                      {t(`nav.${item.key}`)}
                    </NextLink>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </nav>
      {credit ? <p className="admin-credit">{credit}</p> : null}
    </div>
  );

  return (
    <div className="admin-shell">
      <a href="#admin-content" className="skip-link">
        {t('skip')}
      </a>
      <aside className="admin-sidebar hidden lg:block">{sidebar}</aside>
      {drawer ? (
        <div className="admin-drawer lg:hidden" id="admin-mobile-nav">
          <button type="button" className="admin-drawer-backdrop" aria-label={t('closeNav')} onClick={() => setDrawer(false)} />
          <aside className="admin-sidebar admin-sidebar-drawer">{sidebar}</aside>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col">
        <header className="admin-header">
          <button type="button" className="admin-icon-btn lg:hidden" aria-expanded={drawer} aria-controls="admin-mobile-nav" aria-label={drawer ? t('closeNav') : t('openNav')} onClick={() => setDrawer((v) => !v)}>
            {drawer ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
          <p className="admin-crumb" aria-label={t('title')}>
            {currentItem ? (
              <>
                <span className="admin-crumb-group">{t(`navGroups.${currentItem.group}`)}</span>
                <span aria-hidden="true" className="admin-crumb-sep">
                  /
                </span>
                <span className="admin-crumb-page">{t(`nav.${currentItem.key}`)}</span>
              </>
            ) : (
              <span className="admin-crumb-page">{t('title')}</span>
            )}
          </p>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {headerExtra}
            <NextLink href="/tr" target="_blank" rel="noopener" className="admin-header-link">
              <ExternalLink size={14} aria-hidden="true" />
              <span className="hidden sm:inline">{t('viewSite')}</span>
              <span className="sr-only sm:hidden">{t('viewSite')}</span>
            </NextLink>
            <span className="admin-user" title={`${t('signedInAs')}: ${user.email}`}>
              <span className="admin-avatar" aria-hidden="true">
                {initials}
              </span>
              <span className="hidden min-w-0 leading-tight md:grid">
                <span className="truncate text-sm font-medium">{user.fullName || user.email}</span>
                <span className="truncate text-xs text-muted-foreground">{t(`roles.${user.role}`)}</span>
              </span>
            </span>
            <form action={signOut}>
              <button type="submit" className="admin-header-link" aria-label={t('logout')}>
                <LogOut size={14} aria-hidden="true" />
                <span className="hidden sm:inline">{t('logout')}</span>
              </button>
            </form>
          </div>
        </header>
        <main id="admin-content" tabIndex={-1} className="flex-1 p-4 outline-none lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
