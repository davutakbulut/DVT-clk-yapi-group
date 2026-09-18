import { getFormatter, getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { isSiteIndexable } from '@/core/config/site';
import { AdminPageHeader } from '@/modules/admin-shell';
import { listMediaChoices } from '@/modules/corporate/server';
import { orphanRoutes } from '@/modules/navigation/server';
import { getPublicSettings, SeoSettingsForm } from '@/modules/site-settings';
import { triggerIndexNow } from '@/modules/site-settings/actions';
import { getIndexNowStatus } from '@/modules/site-settings/server';

export default async function SeoSettingsPage() {
  const [t, format, gate] = await Promise.all([getTranslations('Admin'), getFormatter(), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const indexable = isSiteIndexable();
  const [settings, images, orphans, indexNow] = await Promise.all([getPublicSettings(), listMediaChoices('image'), orphanRoutes(), getIndexNowStatus()]);
  return (
    <div className="grid max-w-3xl gap-6">
      <AdminPageHeader title={t('seoSettings.title')} lead={t('seoSettings.lead')} />
      <SeoSettingsForm settings={settings} images={images.ok ? images.data : []} indexable={indexable} />
      <section className="grid gap-2 rounded-md border p-4" aria-labelledby="indexnow-title">
        <h2 id="indexnow-title" className="text-sm font-medium">
          IndexNow
        </h2>
        <p className="text-xs text-muted-foreground">{t('seoSettings.indexNowLead')}</p>
        <p className="text-sm">
          {indexNow.configured ? t('seoSettings.indexNowConfigured') : t('seoSettings.indexNowMissing')}
          {indexNow.lastRunAt ? ` · ${t('seoSettings.indexNowLast', { when: format.dateTime(new Date(indexNow.lastRunAt), { dateStyle: 'medium', timeStyle: 'short' }), status: indexNow.lastStatus ?? '' })}` : ''}
          {indexNow.lastError ? ` · ${indexNow.lastError}` : ''}
        </p>
        <p className="text-xs text-muted-foreground">
          {t('seoSettings.feeds')}: /tr/feed.xml · /en/feed.xml · /llms.txt · /sitemap.xml
        </p>
        {indexNow.configured && indexable ? (
          <form action={triggerIndexNow}>
            <Button type="submit" size="sm" variant="outline">
              {t('seoSettings.indexNowRun')}
            </Button>
          </form>
        ) : null}
      </section>
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
