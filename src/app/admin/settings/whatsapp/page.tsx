import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { WhatsAppForm } from '@/modules/whatsapp';
import { loadWhatsAppForAdmin } from '@/modules/whatsapp/server';

export default async function AdminWhatsAppPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const row = await loadWhatsAppForAdmin();
  if (!row.ok) return <p role="alert">{t('errors.unexpected')}</p>;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('whatsapp.title')}</h1>
        <p className="text-muted-foreground">{t('whatsapp.lead')}</p>
      </div>
      <WhatsAppForm row={row.data} />
    </div>
  );
}
