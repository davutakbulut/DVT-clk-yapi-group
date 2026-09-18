import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { convertLeadToCustomer } from '../../actions';

/** Talep detayında: müşteri bağlıysa bağlantı, değilse tek tık dönüşüm (JS'siz form). */
export async function ConvertLeadButton({ leadId, customerId, canWrite }: { readonly leadId: string; readonly customerId: string | null; readonly canWrite: boolean }) {
  const t = await getTranslations('Admin');
  if (customerId) {
    return (
      <NextLink href={`/admin/customers/${customerId}`} className="text-sm underline underline-offset-4">
        {t('customers.openCustomer')}
      </NextLink>
    );
  }
  if (!canWrite) return null;
  return (
    <form action={convertLeadToCustomer}>
      <input type="hidden" name="leadId" value={leadId} />
      <Button type="submit" size="sm" variant="outline">
        {t('customers.convertLead')}
      </Button>
    </form>
  );
}
