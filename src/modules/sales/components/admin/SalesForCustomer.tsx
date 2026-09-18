import NextLink from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';
import { listSales } from '../../data/adminSalesRepository';

/** Müşteri kartında satışlar (05-SALES-FINANCE): no · tarih · durum · toplam; marj yalnız admin. */
export async function SalesForCustomer({ customerId, isAdmin, canWrite }: { readonly customerId: string; readonly isAdmin: boolean; readonly canWrite: boolean }) {
  const [t, format, rows] = await Promise.all([getTranslations('Admin'), getFormatter(), listSales(isAdmin, { customerId })]);
  const items = rows.ok ? rows.data : [];
  return (
    <div className="grid gap-2 text-sm">
      {items.length === 0 ? <p className="text-muted-foreground">{t('common.empty')}</p> : null}
      <ul className="grid gap-1">
        {items.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-2">
            <NextLink href={`/admin/sales/${s.id}`} className="font-mono underline underline-offset-4">
              {s.sale_no}
            </NextLink>
            <span className="text-xs text-muted-foreground">
              {s.sale_date} · {t(`sales.statuses.${s.status as 'draft'}`)} · {format.number(s.grand_total, { style: 'currency', currency: s.currency, maximumFractionDigits: 0 })}
            </span>
          </li>
        ))}
      </ul>
      {canWrite ? (
        <NextLink href={`/admin/sales/new?customer=${customerId}`} className="text-xs underline underline-offset-4">
          {t('sales.newForCustomer')}
        </NextLink>
      ) : null}
    </div>
  );
}
