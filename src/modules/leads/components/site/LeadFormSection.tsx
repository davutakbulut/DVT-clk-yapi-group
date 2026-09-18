import { getCachedServiceList } from '@/modules/services';
import { getCachedQuoteFormOptions } from '../../data/leadsRepository';
import { LeadForm } from './LeadForm';

/** Sunucu sarmalayıcı: hizmet listesi ve form seçenekleri (önbellekli) → istemci formu. */
export async function LeadFormSection({ locale, variant }: { readonly locale: string; readonly variant: 'contact_form' | 'quote_form' }) {
  const [services, options] = await Promise.all([variant === 'quote_form' ? getCachedServiceList(locale) : Promise.resolve(null), getCachedQuoteFormOptions()]);
  return <LeadForm variant={variant} services={services?.ok ? services.data.map((s) => ({ id: s.id, title: s.title })) : []} options={options} />;
}
