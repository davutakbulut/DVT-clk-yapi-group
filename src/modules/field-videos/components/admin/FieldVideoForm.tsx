'use client';

import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError } from '@/modules/admin-shell';
import { saveFieldVideo } from '../../actions';
import type { AdminFieldVideo, MediaChoice } from '../../data/adminFieldVideosRepository';

interface Props {
  readonly video: AdminFieldVideo | null;
  readonly videos: readonly MediaChoice[];
  readonly images: readonly MediaChoice[];
}

/** Saha videosu formu: başlık/açıklama TR-EN · kaynak (YouTube bağlantısı | yüklenmiş video) · kapak · sıra · yayında. */
export function FieldVideoForm({ video, videos, images }: Props) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveFieldVideo, IDLE);
  const v = video;
  const [source, setSource] = useState<'youtube' | 'upload'>(v?.source ?? 'youtube');
  const idp = `fv-${v?.id ?? 'new'}`;
  const field = (name: string, label: string, props: React.ComponentProps<typeof Input>, hint?: string) => (
    <div className="grid gap-1">
      <Label htmlFor={`${idp}-${name}`}>{label}</Label>
      <Input id={`${idp}-${name}`} name={name} aria-invalid={state.fieldErrors?.[name] ? 'true' : undefined} {...props} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <FieldError state={state} name={name} />
    </div>
  );
  const select = (name: string, label: string, options: readonly MediaChoice[], value: string | null, hint: string) => (
    <div className="grid gap-1">
      <Label htmlFor={`${idp}-${name}`}>{label}</Label>
      <select id={`${idp}-${name}`} name={name} defaultValue={value ?? ''} className="h-9 rounded-md border bg-background px-2 text-sm" aria-invalid={state.fieldErrors?.[name] ? 'true' : undefined}>
        <option value="">{t('common.none')}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.path}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <FieldError state={state} name={name} />
    </div>
  );
  return (
    <form action={action} className="grid gap-4 rounded-md border p-4">
      <input type="hidden" name="id" value={v?.id ?? ''} />
      <ActionMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        {field('titleTr', t('fieldVideos.titleTr'), { defaultValue: v?.title['tr'] ?? '', required: true })}
        {field('titleEn', t('fieldVideos.titleEn'), { defaultValue: v?.title['en'] ?? '' })}
        {field('captionTr', t('fieldVideos.captionTr'), { defaultValue: v?.caption['tr'] ?? '' })}
        {field('captionEn', t('fieldVideos.captionEn'), { defaultValue: v?.caption['en'] ?? '' })}
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">{t('fieldVideos.source')}</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="source" value="youtube" checked={source === 'youtube'} onChange={() => setSource('youtube')} /> {t('fieldVideos.sourceYoutube')}
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="source" value="upload" checked={source === 'upload'} onChange={() => setSource('upload')} /> {t('fieldVideos.sourceUpload')}
          </label>
        </div>
      </fieldset>
      {source === 'youtube' ? (
        field('youtubeUrl', t('fieldVideos.youtubeUrl'), { defaultValue: v?.youtube_id ? `https://youtu.be/${v.youtube_id}` : '', placeholder: 'https://youtu.be/…', inputMode: 'url' }, t('fieldVideos.youtubeHint'))
      ) : (
        <div className="grid gap-2">
          {select('videoId', t('fieldVideos.video'), videos, v?.video_id ?? null, t('fieldVideos.videoHint'))}
          <NextLink href="/admin/media" className="text-sm underline underline-offset-4">
            {t('fieldVideos.uploadLink')}
          </NextLink>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        {select('posterId', t('fieldVideos.poster'), images, v?.poster_id ?? null, t('fieldVideos.posterHint'))}
        {field('sortOrder', t('fieldVideos.sortOrder'), { defaultValue: v?.sort_order != null ? String(v.sort_order) : '', inputMode: 'numeric' })}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={v?.is_active ?? true} /> {t('fieldVideos.active')}
      </label>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {v ? t('common.save') : t('common.add')}
        </Button>
      </div>
    </form>
  );
}
