import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getCurrentUser } from '@/core/auth';
import { createServerClient } from '@/core/db/createServerClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ADMIN_NAV } from '@/modules/admin-shell';
import { listSchedules } from '@/modules/finance/server';

interface Counts {
  readonly media: number;
  readonly staff: number;
  readonly members: number;
  readonly leads_open: number;
  readonly leads_today: number;
  readonly customers: number;
  readonly overdue_schedules: number;
  readonly pending_reviews: number;
  readonly errors_24h: number;
  readonly notifications: number;
}

// Dashboard (02-ADMIN-PANEL): sayaçlar tek RPC ile, çağıranın RLS'iyle. Talep/satış kartları ilgili fazlarda dolar.
export default async function AdminDashboard() {
  const [t, user, client] = await Promise.all([getTranslations('Admin'), getCurrentUser(), createServerClient()]);
  let counts: Counts | null = null;
  let recentErrors: { id: string; module: string; message: string; last_seen_at: string }[] = [];
  if (client.ok) {
    const { data } = await client.data.rpc('admin_dashboard_counts');
    if (data && typeof data === 'object') counts = data as unknown as Counts;
    const { data: errors } = await client.data.from('error_logs').select('id, module, message, last_seen_at').order('last_seen_at', { ascending: false }).limit(5);
    recentErrors = errors ?? [];
  }
  const overdue = user && ['super_admin', 'admin', 'sales', 'viewer'].includes(user.role) ? await listSchedules('overdue', 5) : null;
  const cards: { key: keyof Counts; label: string }[] = [
    { key: 'leads_today', label: t('dashboard.leadsToday') },
    { key: 'leads_open', label: t('dashboard.leadsOpen') },
    { key: 'customers', label: t('dashboard.customers') },
    { key: 'overdue_schedules', label: t('dashboard.overdue') },
    { key: 'pending_reviews', label: t('dashboard.pendingReviews') },
    { key: 'media', label: t('dashboard.media') },
    { key: 'staff', label: t('dashboard.staff') },
    { key: 'members', label: t('dashboard.members') },
    { key: 'errors_24h', label: t('dashboard.errors24h') },
    { key: 'notifications', label: t('dashboard.notifications') },
  ];
  const links = ADMIN_NAV.filter((i) => i.key !== 'dashboard' && (!i.roles || (user && i.roles.includes(user.role))));

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.welcome', { name: user?.fullName || user?.email || '' })}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold tabular-nums">{counts ? counts[card.key] : '—'}</CardContent>
          </Card>
        ))}
      </div>
      {overdue?.ok && overdue.data.length > 0 ? (
        <Card className="border-red-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">⚠ {t('dashboard.overdue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1 text-sm">
              {overdue.data.map((s) => (
                <li key={s.id}>
                  <NextLink href={`/admin/sales/${s.sale_id}/finance`} className="underline underline-offset-4">
                    {s.saleNo}
                  </NextLink>{' '}
                  · {s.customerName} · {s.description} · {s.due_date}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.quickLinks')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {links.map((item) => (
              <NextLink key={item.key} href={item.href} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                {t(`nav.${item.key}`)}
              </NextLink>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <NextLink href="/admin/errors" className="underline-offset-4 hover:underline">
                {t('dashboard.recentErrors')}
              </NextLink>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentErrors.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('dashboard.noErrors')}</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {recentErrors.map((e) => (
                  <li key={e.id} className="grid gap-0.5">
                    <span className="font-mono text-xs text-muted-foreground">
                      {e.module} · {new Date(e.last_seen_at).toLocaleString('tr-TR')}
                    </span>
                    <span className="truncate">{e.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      <p className="text-sm text-muted-foreground">{t('dashboard.phaseNote')}</p>
    </div>
  );
}
