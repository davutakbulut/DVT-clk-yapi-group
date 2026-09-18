import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { readSupabasePublicEnv } from '@/core/db/publicEnv';
import { MediaCard, UploadForm } from '@/modules/media';
import { listMedia } from '@/modules/media/server';

export default async function AdminMediaPage({ searchParams }: { readonly searchParams: Promise<{ folder?: string }> }) {
  const [t, gate, { folder }] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [media, env] = [await listMedia(folder ?? null), readSupabasePublicEnv()];
  if (!media.ok || !env.ok) return <p role="alert">{t('errors.unexpected')}</p>;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('media.title')}</h1>
        <p className="text-muted-foreground">{t('media.lead')}</p>
      </div>
      <UploadForm folders={media.data.folders} />
      <nav aria-label={t('media.filter')} className="flex flex-wrap gap-2 text-sm">
        <NextLink href="/admin/media" className={`rounded-md border px-3 py-1 ${!folder ? 'bg-muted font-medium' : ''}`}>
          {t('media.all')}
        </NextLink>
        {media.data.folders.map((f) => (
          <NextLink key={f} href={`/admin/media?folder=${encodeURIComponent(f)}`} className={`rounded-md border px-3 py-1 ${folder === f ? 'bg-muted font-medium' : ''}`}>
            {f}
          </NextLink>
        ))}
      </nav>
      <p className="text-sm text-muted-foreground">{t('media.count', { count: media.data.items.length })}</p>
      {media.data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {media.data.items.map((item) => (
            <MediaCard key={item.id} item={item} supabaseUrl={env.data.url} />
          ))}
        </ul>
      )}
    </div>
  );
}
