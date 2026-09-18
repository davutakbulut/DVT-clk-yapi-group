import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, FormSection } from '@/modules/admin-shell';
import { archiveConfiguration, convertConfigurationToSale } from '@/modules/configurator/actions';
import { getConfigurationForAdmin } from '@/modules/configurator/server';

/** Gönderim detayı: ölçüler, güncel sürüm metrajı, sürüm geçmişi, talep/satış bağlantıları, satışa dönüştür (talebi olan), arşivle. */
export default async function ConfigurationDetailPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const [t, tc, tk, format, gate, { id }] = await Promise.all([getTranslations('Admin'), getTranslations('Configurator.print'), getTranslations('Configurator.takeoff'), getFormatter(), requireRole(['super_admin', 'admin', 'sales', 'viewer', 'editor']), params]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const canWrite = ['super_admin', 'admin', 'sales'].includes(gate.data.role);
  const result = await getConfigurationForAdmin(id);
  if (!result.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const c = result.data;
  if (!c) notFound();
  const p = c.params;
  const num = (k: string) => format.number(Number(p[k] ?? 0), { maximumFractionDigits: 2 });
  const groupLabel = (g: string) => (g.startsWith('panel_') || g === 'plates' || g === 'bolts' ? tc(`groups.${g as 'plates'}`) : tk(`groups.${g as 'column'}`));
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={`${c.ref_code} · ${c.name || t('configurations.title')}`} lead={`${t(`configurations.statuses.${c.status as 'saved'}`)} · v${c.current_version} · ${c.owner}`} action={{ href: '/admin/configurator', label: t('form.back') }} />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-6">
          <FormSection title={tc('params')}>
            <p className="text-sm">{tc('dims', { width: num('w'), length: num('l'), eave: num('e'), ridge: num('r'), bay: num('b') })}</p>
            <p className="text-sm text-muted-foreground">
              {tc('tonnage')}: {c.tonnage_kg === null ? '—' : `${format.number(c.tonnage_kg / 1000, { maximumFractionDigits: 2 })} t`}
              {c.estimated_price !== null ? ` · ${tc('price')}: ${format.number(c.estimated_price, { style: 'currency', currency: c.currency, maximumFractionDigits: 0 })}` : ''}
            </p>
          </FormSection>
          <FormSection title={t('configurations.items')}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1">{tc('element')}</th>
                  <th className="py-1">{tc('profile')}</th>
                  <th className="py-1 text-right">{tc('pieces')}</th>
                  <th className="py-1 text-right">{tc('length')}</th>
                  <th className="py-1 text-right">{tc('area')}</th>
                  <th className="py-1 text-right">{tc('weight')}</th>
                </tr>
              </thead>
              <tbody>
                {c.items.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="py-1">{groupLabel(i.element_group)}</td>
                    <td className="py-1 font-mono text-xs">{i.profile_code_snapshot ?? '—'}</td>
                    <td className="py-1 text-right tabular-nums">{i.piece_count ?? '—'}</td>
                    <td className="py-1 text-right tabular-nums">{i.total_length_m === null ? '—' : format.number(i.total_length_m, { maximumFractionDigits: 1 })}</td>
                    <td className="py-1 text-right tabular-nums">{i.total_area_m2 === null ? '—' : format.number(i.total_area_m2, { maximumFractionDigits: 1 })}</td>
                    <td className="py-1 text-right tabular-nums">{i.total_weight_kg === null ? '—' : format.number(i.total_weight_kg, { maximumFractionDigits: 0 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
          <FormSection title={t('configurations.versions')}>
            <ul className="grid gap-1 text-sm">
              {c.versions.map((v) => (
                <li key={v.id} className="flex flex-wrap gap-3">
                  <span className="font-mono">v{v.version}</span>
                  <span className="tabular-nums">{v.tonnage_kg === null ? '—' : `${format.number(v.tonnage_kg / 1000, { maximumFractionDigits: 2 })} t`}</span>
                  <span className="tabular-nums">{v.estimated_price === null ? '—' : format.number(v.estimated_price, { style: 'currency', currency: c.currency, maximumFractionDigits: 0 })}</span>
                  <span className="text-xs text-muted-foreground">{format.dateTime(new Date(v.created_at), { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </li>
              ))}
            </ul>
          </FormSection>
        </div>
        <aside className="grid content-start gap-4">
          <FormSection title={t('configurations.links')}>
            <p className="text-sm">
              {t('configurations.owner')}: {c.owner}
              {c.owner_email ? ` · ${c.owner_email}` : ''}
            </p>
            <p className="text-sm">
              {t('configurations.share')}:{' '}
              <NextLink href={`/${c.locale}/${c.locale === 'tr' ? 'konfigurator' : 'configurator'}/k/${c.public_token}`} className="underline underline-offset-4" target="_blank" rel="noopener">
                {c.ref_code}
              </NextLink>
            </p>
            {c.lead_id ? (
              <NextLink href={`/admin/leads/${c.lead_id}`} className="text-sm underline underline-offset-4">
                {t('configurations.openLead')} · {c.leadRef ?? ''}
              </NextLink>
            ) : (
              <p className="text-sm text-muted-foreground">{t('configurations.noLead')}</p>
            )}
            {c.sale_id ? (
              <NextLink href={`/admin/sales/${c.sale_id}`} className="text-sm underline underline-offset-4">
                {t('sales.openSale')} · {c.saleNo ?? ''}
              </NextLink>
            ) : canWrite && c.lead_id ? (
              <form action={convertConfigurationToSale}>
                <input type="hidden" name="id" value={c.id} />
                <Button type="submit" size="sm" variant="outline">
                  {t('configurations.convertSale')}
                </Button>
              </form>
            ) : null}
            {canWrite && c.status !== 'archived' ? (
              <form action={archiveConfiguration}>
                <input type="hidden" name="id" value={c.id} />
                <Button type="submit" size="sm" variant="ghost">
                  {t('configurations.archive')}
                </Button>
              </form>
            ) : null}
          </FormSection>
        </aside>
      </div>
    </div>
  );
}
