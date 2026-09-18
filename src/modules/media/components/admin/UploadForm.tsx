'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { uploadMedia } from '../../actions';

export function UploadForm({ folders }: { readonly folders: readonly string[] }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(uploadMedia, IDLE);

  return (
    <form action={action} className="grid gap-3 rounded-md border bg-card p-4" encType="multipart/form-data">
      <h2 className="font-semibold">{t('media.upload')}</h2>
      {state.error ? <p role="alert" className="text-sm text-destructive">{t(`errors.${state.error}`)}</p> : null}
      {state.done ? <p role="status" className="text-sm text-green-700">{t('media.uploaded')}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="up-file">{t('media.file')}</Label>
          <Input id="up-file" name="file" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="up-folder">{t('media.folder')}</Label>
          <select id="up-folder" name="folder" className="h-9 rounded-md border bg-background px-2" defaultValue={folders[0] ?? 'uploads'}>
            {[...folders, ...(folders.includes('uploads') ? [] : ['uploads'])].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="up-newFolder">{t('media.newFolder')}</Label>
          <Input id="up-newFolder" name="newFolder" maxLength={60} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="up-altTr">{t('media.altTr')}</Label>
          <Input id="up-altTr" name="altTr" maxLength={200} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="up-altEn">{t('media.altEn')}</Label>
          <Input id="up-altEn" name="altEn" maxLength={200} />
        </div>
      </div>
      <div>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? t('common.loading') : t('media.upload')}
        </Button>
      </div>
    </form>
  );
}
