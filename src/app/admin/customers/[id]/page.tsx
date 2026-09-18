import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, FormSection } from '@/modules/admin-shell';
import { CustomerForm, displayName } from '@/modules/customers';
import { anonymizeCustomer, deleteCustomer } from '@/modules/customers/actions';
import { getCustomer, listMemberChoices } from '@/modules/customers/server';
import { SalesForCustomer } from '@/modules/sales';

export default async function CustomerDetailPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const [t, gate, { id }] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'sales', 'viewer']), params]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [customer, members] = await Promise.all([getCustomer(id), listMemberChoices()]);
  if (!customer.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  if (!customer.data) notFound();
  const c = customer.data;
  const canWrite = ['super_admin', 'admin', 'sales'].includes(gate.data.role);
  const isAdmin = gate.data.role === 'super_admin' || gate.data.role === 'admin';
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={displayName(c, t('customers.anonymous'))} lead={`${t(`customers.types.${c.type as 'corporate'}`)} · ${t(`customers.sources.${c.source as 'manual'}`)} · ${c.created_at.slice(0, 10)}`} action={{ href: '/admin/customers', label: t('form.back') }} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <CustomerForm customer={c} members={members.ok ? members.data : []} canEdit={canWrite} />
        <div className="grid content-start gap-6">
          <FormSection title={t('customers.leads')}>
            {c.leads.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.empty')}</p> : null}
            <ul className="grid gap-1 text-sm">
              {c.leads.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-2">
                  <NextLink href={`/admin/leads/${l.id}`} className="font-mono underline underline-offset-4">
                    {l.ref_no}
                  </NextLink>
                  <span className="text-xs text-muted-foreground">
                    {t(`leads.statuses.${l.status as 'new'}`)} · {l.created_at.slice(0, 10)}
                  </span>
                </li>
              ))}
            </ul>
          </FormSection>
          <FormSection title={t('sales.title')}>
            <SalesForCustomer customerId={c.id} isAdmin={isAdmin} canWrite={canWrite && !c.anonymized_at} />
          </FormSection>
          {isAdmin && !c.anonymized_at ? (
            <FormSection title={t('customers.danger')}>
              <form action={anonymizeCustomer} className="grid gap-2 text-sm">
                <input type="hidden" name="id" value={c.id} />
                <p className="text-xs text-muted-foreground">{t('customers.anonymizeHint')}</p>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="confirm" required /> {t('customers.anonymizeConfirm')}
                </label>
                <div>
                  <Button type="submit" size="sm" variant="outline">
                    {t('customers.anonymize')}
                  </Button>
                </div>
              </form>
              {c.leads.length === 0 ? (
                <form action={deleteCustomer}>
                  <input type="hidden" name="id" value={c.id} />
                  <Button type="submit" size="sm" variant="ghost" className="text-destructive">
                    {t('common.delete')}
                  </Button>
                </form>
              ) : null}
            </FormSection>
          ) : null}
        </div>
      </div>
    </div>
  );
}
