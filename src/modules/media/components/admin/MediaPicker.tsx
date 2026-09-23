'use client';

import { useTranslations } from 'next-intl';
import { useId, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { publicStorageUrl } from '@/core/storage';
import { uploadMediaInline, type InlineUploadResult } from '../../actions';

type UploadErrorKey = Extract<InlineUploadResult, { ok: false }>['error'];

export interface PickerOption {
  readonly id: string;
  readonly path: string;
  readonly mime: string;
}
export type PickerKind = 'image' | 'video' | 'document';

interface Props {
  readonly name: string;
  readonly label: string;
  readonly options: readonly PickerOption[];
  readonly value?: string | null;
  readonly allowEmpty?: boolean;
  /** Yeni dosyanın gideceği klasör (Storage: media/<folder>/…); ilgili içerik türüne göre çağıran verir. */
  readonly folder: string;
  readonly kind?: PickerKind;
}

const ACCEPT: Record<PickerKind, string> = { image: 'image/jpeg,image/png,image/webp', video: 'video/mp4,video/webm', document: 'application/pdf' };
const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? '';

/**
 * Medya seçici (K-85): kütüphaneden seç YA DA doğrudan bu alandan yükle. Yükleme aynı boru hattından geçer (WebP varyantları,
 * kararlı id, RLS ile kullanıcı oturumu); dosya media/<folder>/ altına gider, kayıt media_library'ye yazılır, form gizli alanda
 * media_library.id taşır (üst kayıt FK ile bağlanır). Önizleme: görselde küçük resim, diğerlerinde dosya adı.
 */
export function MediaPicker({ name, label, options, value, allowEmpty = true, folder, kind = 'image' }: Props) {
  const t = useTranslations('Admin.media');
  const tc = useTranslations('Admin.common');
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<readonly PickerOption[]>(options);
  const [selected, setSelected] = useState<string>(value ?? '');
  const [error, setError] = useState<UploadErrorKey | null>(null);
  const [pending, start] = useTransition();
  const current = items.find((o) => o.id === selected) ?? null;

  const upload = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.set('file', file);
    fd.set('folder', folder);
    start(async () => {
      const r = await uploadMediaInline(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setItems((prev) => (prev.some((o) => o.id === r.id) ? prev : [{ id: r.id, path: r.path, mime: r.mime }, ...prev]));
      setSelected(r.id);
      if (fileRef.current) fileRef.current.value = '';
    });
  };

  return (
    <div className="grid gap-2 rounded-md border p-3">
      <input type="hidden" name={name} value={selected} />
      <Label htmlFor={`${id}-select`}>{label}</Label>
      <div className="flex flex-wrap items-start gap-3">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded border bg-muted text-[10px] text-muted-foreground" aria-hidden="true">
          {current && current.mime.startsWith('image/') && SUPABASE_URL ? (
            // eslint-disable-next-line @next/next/no-img-element -- panel önizlemesi, Storage adresi
            <img src={publicStorageUrl(SUPABASE_URL, { bucket: 'media', path: current.path })} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-1 text-center break-all">{current ? current.path.split('/').pop() : '—'}</span>
          )}
        </div>
        <div className="grid min-w-0 flex-1 gap-2">
          <select id={`${id}-select`} value={selected} onChange={(e) => setSelected(e.target.value)} className="h-9 w-full min-w-0 rounded-md border bg-background px-2 text-sm">
            {allowEmpty ? <option value="">{tc('none')}</option> : null}
            {items.map((o) => (
              <option key={o.id} value={o.id}>
                {o.path}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-2">
            <Input ref={fileRef} id={`${id}-file`} type="file" accept={ACCEPT[kind]} aria-label={`${label} — ${t('pickUpload')}`} className="h-9 min-w-0 flex-1 text-xs" onChange={() => setError(null)} />
            <Button type="button" size="sm" variant="secondary" onClick={upload} disabled={pending} aria-busy={pending}>
              {pending ? t('uploading') : t('pickUpload')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('pickHint', { folder })}</p>
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {t(`uploadErrors.${error}`)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
