import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { PriceGuideForm } from '@/modules/pricing';
import { listPricingChoices } from '@/modules/pricing/server';
import { listImageChoices } from '@/modules/services/server';

export default async function NewPriceGuidePage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [choices, images] = await Promise.all([listPricingChoices(), listImageChoices()]);
  if (!choices.ok || !images.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={t('pricing.new')} action={{ href: '/admin/pricing', label: t('form.back') }} />
      <PriceGuideForm guide={null} images={images.data} services={choices.data.services} materials={choices.data.materials} />
    </div>
  );
}
