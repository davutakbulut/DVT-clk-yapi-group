import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, StatusBadge } from '@/modules/admin-shell';
import { PriceGuideForm } from '@/modules/pricing';
import { getPriceGuideForAdmin, listPricingChoices } from '@/modules/pricing/server';
import { listImageChoices } from '@/modules/services/server';

export default async function EditPriceGuidePage({ params }: { readonly params: Promise<{ id: string }> }) {
  const [t, gate, { id }] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor']), params]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [guide, choices, images] = await Promise.all([getPriceGuideForAdmin(id), listPricingChoices(), listImageChoices()]);
  if (!guide.ok || !choices.ok || !images.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  if (!guide.data) notFound();
  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={guide.data.title['tr'] || t('form.untitled')} action={{ href: '/admin/pricing', label: t('form.back') }} />
      <StatusBadge status={guide.data.status} locales={guide.data.published_locales} />
      <PriceGuideForm guide={guide.data} images={images.data} services={choices.data.services} materials={choices.data.materials} />
    </div>
  );
}
