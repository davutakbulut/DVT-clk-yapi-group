import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { FieldVideoForm } from '@/modules/field-videos';
import { deleteFieldVideo } from '@/modules/field-videos/actions';
import { listFieldVideoChoices, listFieldVideosForAdmin } from '@/modules/field-videos/server';

/** Sahadan Videolar: ana sayfadaki dikey video şeridinin yönetimi (YouTube bağlantısı ya da medya kütüphanesinden video). */
export default async function FieldVideosPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [rows, choices] = await Promise.all([listFieldVideosForAdmin(), listFieldVideoChoices()]);
  if (!rows.ok || !choices.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={t('fieldVideos.title')} lead={t('fieldVideos.lead')} action={{ href: '/admin/media', label: t('nav.media') }} />
      <section className="grid gap-2">
        <h2 className="text-sm font-medium">{t('fieldVideos.new')}</h2>
        <FieldVideoForm video={null} videos={choices.data.videos} images={choices.data.images} />
      </section>
      <section className="grid gap-3">
        <h2 className="text-sm font-medium">{t('fieldVideos.count', { count: rows.data.length })}</h2>
        {rows.data.length === 0 ? <p className="text-sm text-muted-foreground">{t('fieldVideos.empty')}</p> : null}
        {rows.data.map((v) => (
          <details key={v.id} className="rounded-md border">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-2 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{v.sort_order ?? '—'}</span>
              <span className="font-medium">{v.title['tr']}</span>
              <span className="text-xs text-muted-foreground">{v.source === 'youtube' ? t('fieldVideos.sourceYoutube') : t('fieldVideos.sourceUpload')}</span>
              {!v.is_active ? <span className="text-xs text-muted-foreground">{t('fieldVideos.inactive')}</span> : null}
            </summary>
            <div className="grid gap-3 border-t p-4">
              <FieldVideoForm video={v} videos={choices.data.videos} images={choices.data.images} />
              <form action={deleteFieldVideo}>
                <input type="hidden" name="id" value={v.id} />
                <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                  {t('common.delete')}
                </Button>
              </form>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
