'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { publicStorageUrl } from '@/core/storage';
import { IDLE } from '@/lib/formState';
import { deleteMedia, updateMediaAlt } from '../../actions';
import type { MediaRow } from '../../data/mediaRepository';

interface Props {
  readonly item: MediaRow;
  /** Sunucudan istemciye fonksiyon geçmez (RSC serileştirme); URL tabanı string gelir, URL burada kurulur. */
  readonly supabaseUrl: string;
}

export function MediaCard({ item, supabaseUrl }: Props) {
  const t = useTranslations('Admin');
  const publicUrl = (path: string) => publicStorageUrl(supabaseUrl, { bucket: item.storage_bucket, path });
  const [state, action, pending] = useActionState(updateMediaAlt, IDLE);
  const isImage = item.mime_type.startsWith('image/');
  const thumb = publicUrl(item.variants['w480'] ?? item.storage_path);
  const kb = Math.round(item.size_bytes / 1024);

  return (
    <li className="grid gap-2 rounded-md border bg-card p-2 text-xs">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- Storage WebP; next/image kotasını harcamaz (K-49)
        <img src={thumb} alt={item.alt['tr'] ?? ''} width={item.width ?? undefined} height={item.height ?? undefined} loading="lazy" className="aspect-[4/3] w-full rounded object-cover" />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center rounded bg-muted font-mono">{item.mime_type}</div>
      )}
      <a href={publicUrl(item.storage_path)} target="_blank" rel="noopener noreferrer" className="truncate font-mono underline-offset-2 hover:underline">
        {item.storage_path}
      </a>
      <span className="text-muted-foreground">
        {item.width && item.height ? `${item.width}×${item.height} · ` : ''}
        {kb} KB{Object.keys(item.variants).length ? ` · ${Object.keys(item.variants).join(', ')}` : ''}
      </span>
      <form action={action} className="grid gap-1">
        <input type="hidden" name="id" value={item.id} />
        <Input name="altTr" defaultValue={item.alt['tr'] ?? ''} placeholder={t('media.altTr')} aria-label={t('media.altTr')} className="h-8 text-xs" />
        <Input name="altEn" defaultValue={item.alt['en'] ?? ''} placeholder={t('media.altEn')} aria-label={t('media.altEn')} className="h-8 text-xs" />
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            {t('common.save')}
          </Button>
          {state.done ? <span role="status" className="text-green-700">{t('common.saved')}</span> : null}
          {state.error ? <span role="alert" className="text-destructive">{t(`errors.${state.error}`)}</span> : null}
        </div>
      </form>
      <form action={deleteMedia}>
        <input type="hidden" name="id" value={item.id} />
        <Button type="submit" size="sm" variant="destructive" aria-label={`${t('media.deleteFile')}: ${item.file_name}`}>
          {t('common.delete')}
        </Button>
      </form>
    </li>
  );
}
