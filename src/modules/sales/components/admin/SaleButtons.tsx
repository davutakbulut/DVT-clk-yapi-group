import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { convertLeadToSale, createProjectFromSale } from '../../actions';
import { findSaleByLead } from '../../data/adminSalesRepository';

/** Talep detayında: satışa dönüştür (sales/admin). Var olan satış bağlantısı route katmanında listelenir. */
export async function ConvertLeadToSaleButton({ leadId, canWrite }: { readonly leadId: string; readonly canWrite: boolean }) {
  const [t, sale] = await Promise.all([getTranslations('Admin'), findSaleByLead(leadId)]);
  if (sale) {
    return (
      <NextLink href={`/admin/sales/${sale.id}`} className="text-sm underline underline-offset-4">
        {t('sales.openSale')} · {sale.sale_no}
      </NextLink>
    );
  }
  if (!canWrite) return null;
  return (
    <form action={convertLeadToSale}>
      <input type="hidden" name="leadId" value={leadId} />
      <Button type="submit" size="sm" variant="outline">
        {t('sales.convertLead')}
      </Button>
    </form>
  );
}

/** Satış detayında (admin): tamamlanan satış → taslak referans projesi. */
export async function ProjectFromSaleButton({ saleId, projectId, status }: { readonly saleId: string; readonly projectId: string | null; readonly status: string }) {
  const t = await getTranslations('Admin');
  if (projectId) {
    return (
      <NextLink href={`/admin/projects/${projectId}`} className="text-sm underline underline-offset-4">
        {t('sales.openProject')}
      </NextLink>
    );
  }
  if (status !== 'completed') return <p className="text-xs text-muted-foreground">{t('sales.projectHint')}</p>;
  return (
    <form action={createProjectFromSale}>
      <input type="hidden" name="id" value={saleId} />
      <Button type="submit" size="sm" variant="outline">
        {t('sales.toProject')}
      </Button>
    </form>
  );
}
