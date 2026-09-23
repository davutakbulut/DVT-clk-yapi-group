'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { SocialIcon } from '@/lib/social/SocialIcon';
import { socialPlatformOf } from '@/lib/social/socialPlatform';
import { saveSocialLinks } from '../../actions';

interface Row {
  readonly key: number;
  readonly platform: string;
  readonly url: string;
}

const SUGGESTED = ['Instagram', 'LinkedIn', 'YouTube', 'Facebook', 'X', 'TikTok'];

/** Sosyal medya bağlantıları: satır ekle/kaldır, URL'den tanınan ikon anında görünür (footer'daki yuvarlak düğmelerle aynı simge). */
export function SocialLinksForm({ initial }: { readonly initial: readonly { readonly platform: string; readonly url: string }[] }) {
  const t = useTranslations('Admin.social');
  const tc = useTranslations('Admin.common');
  const [state, action, pending] = useActionState(saveSocialLinks, IDLE);
  const [rows, setRows] = useState<Row[]>(() => initial.map((l, i) => ({ key: i, ...l })));
  const [seq, setSeq] = useState(initial.length);
  const update = (key: number, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const add = (platform = '') => {
    setRows((r) => [...r, { key: seq, platform, url: '' }]);
    setSeq((n) => n + 1);
  };
  const remove = (key: number) => setRows((r) => r.filter((x) => x.key !== key));
  const missing = SUGGESTED.filter((p) => !rows.some((r) => r.platform.toLocaleLowerCase('en-US') === p.toLocaleLowerCase('en-US')));

  return (
    <form action={action} className="grid gap-4">
      {state.error ? <p role="alert" className="text-sm text-destructive">{t(state.error === 'validation' ? 'errors.validation' : 'errors.unexpected')}</p> : null}
      {state.done ? <p role="status" className="text-sm text-green-700">{tc('saved')}</p> : null}
      <ul className="grid gap-3">
        {rows.length === 0 ? <li className="text-sm text-muted-foreground">{t('empty')}</li> : null}
        {rows.map((row, i) => {
          const platform = socialPlatformOf(row.url);
          return (
            <li key={row.key} className="grid items-end gap-2 rounded-md border p-3 sm:grid-cols-[44px_1fr_2fr_auto]">
              <span className="grid h-11 w-11 place-items-center rounded-full border bg-muted" aria-hidden="true" data-platform={platform}>
                <SocialIcon platform={platform} />
              </span>
              <div className="grid gap-1">
                <Label htmlFor={`so-name-${row.key}`}>{t('name')}</Label>
                <Input id={`so-name-${row.key}`} name={`platform_${i}`} value={row.platform} onChange={(e) => update(row.key, { platform: e.target.value })} required maxLength={40} placeholder="Instagram" aria-invalid={state.fieldErrors?.[`platform_${i}`] ? 'true' : undefined} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor={`so-url-${row.key}`}>{t('url')}</Label>
                <Input id={`so-url-${row.key}`} name={`url_${i}`} type="url" inputMode="url" value={row.url} onChange={(e) => update(row.key, { url: e.target.value })} required placeholder="https://instagram.com/…" aria-invalid={state.fieldErrors?.[`url_${i}`] ? 'true' : undefined} />
                {row.url && platform === 'link' ? <span className="text-xs text-muted-foreground">{t('genericIcon')}</span> : null}
              </div>
              <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => remove(row.key)} aria-label={`${t('remove')}: ${row.platform || row.url || i + 1}`}>
                {t('remove')}
              </Button>
            </li>
          );
        })}
      </ul>
      <input type="hidden" name="count" value={rows.length} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => add()}>
          {t('add')}
        </Button>
        {missing.map((p) => (
          <Button key={p} type="button" variant="outline" size="sm" onClick={() => add(p)}>
            + {p}
          </Button>
        ))}
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {tc('save')}
        </Button>
      </div>
    </form>
  );
}
