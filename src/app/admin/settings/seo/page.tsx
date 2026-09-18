import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { isSiteIndexable } from '@/core/config/site';
import { AdminPageHeader } from '@/modules/admin-shell';
import { listMediaChoices } from '@/modules/corporate/server';
import { orphanRoutes } from '@/modules/navigation/server';
import { getPublicSettings, SeoSettingsForm } from '@/modules/site-settings';

export default async function SeoSettingsPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [settings, images, orphans] = await Promise.all([getPublicSettings(), listMediaChoices('image'), orphanRoutes()]);
  return (
    <div className="grid max-w-3xl gap-6">
      <AdminPageHeader title={t('seoSettings.title')} lead={t('seoSettings.lead')} />
      <SeoSettingsForm settings={settings} images={images.ok ? images.data : []} indexable={isSiteIndexable()} />
      <section className="grid gap-2 rounded-md border p-4">
        <h2 className="text-sm font-medium">{t('seoSettings.orphans')}</h2>
        <p className="text-xs text-muted-foreground">{t('seoSettings.orphansLead')}</p>
        {orphans.length === 0 ? (
          <p className="text-sm">{t('seoSettings.noOrphans')}</p>
        ) : (
          <ul className="grid gap-1 font-mono text-xs">
            {orphans.map((o) => (
              <li key={o.path}>
                {o.path} <span className="text-muted-foreground">({o.tr})</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
