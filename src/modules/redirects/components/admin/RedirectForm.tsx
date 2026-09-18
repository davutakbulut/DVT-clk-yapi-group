'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError } from '@/modules/admin-shell';
import { saveRedirect } from '../../actions';
import type { AdminRedirect } from '../../data/adminRedirectsRepository';

const CODES = [301, 302, 307, 308, 410] as const;

/** Elle yönlendirme: kaynak yol (dil öneki dahil), hedef (göreli yol ya da https), kod (410 hedefsiz), aktif, not. */
export function RedirectForm({ redirect }: { readonly redirect: AdminRedirect | null }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveRedirect, IDLE);
  const r = redirect;
  const k = r?.id ?? 'new';
  return (
    <form action={action} className="grid gap-3 rounded-md border p-3">
      <input type="hidden" name="id" value={r?.id ?? ''} />
      <ActionMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_120px_auto]">
        <div className="grid gap-1">
          <Label htmlFor={`r-${k}-source`}>{t('redirects.source')}</Label>
          <Input id={`r-${k}-source`} name="sourcePath" defaultValue={r?.source_path ?? ''} placeholder="/tr/eski-sayfa" required aria-invalid={state.fieldErrors?.['sourcePath'] ? 'true' : undefined} />
          <FieldError state={state} name="sourcePath" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`r-${k}-target`}>{t('redirects.target')}</Label>
          <Input id={`r-${k}-target`} name="targetPath" defaultValue={r?.target_path ?? ''} placeholder="/tr/yeni-sayfa" aria-invalid={state.fieldErrors?.['targetPath'] ? 'true' : undefined} />
          <FieldError state={state} name="targetPath" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`r-${k}-code`}>{t('redirects.code')}</Label>
          <select id={`r-${k}-code`} name="statusCode" defaultValue={String(r?.status_code ?? 308)} className="h-9 rounded-md border bg-background px-2 text-sm">
            {CODES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={r?.is_active ?? true} /> {t('common.active')}
        </label>
        <div className="grid gap-1 sm:col-span-2 lg:col-span-3">
          <Label htmlFor={`r-${k}-note`}>{t('redirects.note')}</Label>
          <Input id={`r-${k}-note`} name="note" defaultValue={r?.note ?? ''} />
        </div>
        <div className="self-end">
          <Button type="submit" size="sm" disabled={pending}>
            {r ? t('common.save') : t('common.add')}
          </Button>
        </div>
      </div>
    </form>
  );
}
