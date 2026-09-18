'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { saveMenuItem } from '../../actions';
import type { AdminMenuItem } from '../../data/adminMenuRepository';

interface Props {
  readonly menuId: string;
  readonly item?: AdminMenuItem;
  readonly parents: readonly { id: string; label: string }[];
  readonly knownPaths: readonly string[];
  readonly showSlot: boolean;
}

export function MenuItemForm({ menuId, item, parents, knownPaths, showSlot }: Props) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveMenuItem, IDLE);
  const id = item?.id ?? 'new';
  const f = (name: string) => `mi-${id}-${name}`;
  const err = (name: string) => (state.fieldErrors?.[name] ? <span className="text-xs text-destructive">{t('errors.validation')}</span> : null);

  return (
    <form action={action} className="grid gap-3 rounded-md border bg-card p-4 text-sm">
      <input type="hidden" name="menuId" value={menuId} />
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      {state.error && state.error !== 'validation' ? <p role="alert" className="text-sm text-destructive">{t(`errors.${state.error}`)}</p> : null}
      {state.done ? <p role="status" className="text-sm text-green-700">{t('common.saved')}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor={f('labelTr')}>{t('menus.labelTr')}</Label>
          <Input id={f('labelTr')} name="labelTr" defaultValue={item?.label['tr'] ?? ''} required maxLength={80} />
          {err('labelTr')}
        </div>
        <div className="grid gap-1">
          <Label htmlFor={f('labelEn')}>{t('menus.labelEn')}</Label>
          <Input id={f('labelEn')} name="labelEn" defaultValue={item?.label['en'] ?? ''} maxLength={80} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={f('linkType')}>{t('menus.linkType')}</Label>
          <select id={f('linkType')} name="linkType" defaultValue={item?.link_type ?? 'internal'} className="h-9 rounded-md border bg-background px-2">
            <option value="internal">{t('menus.internal')}</option>
            <option value="external">{t('menus.external')}</option>
            <option value="anchor">{t('menus.anchor')}</option>
            <option value="none">{t('menus.noneType')}</option>
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={f('parentId')}>{t('menus.parent')}</Label>
          <select id={f('parentId')} name="parentId" defaultValue={item?.parent_id ?? ''} className="h-9 rounded-md border bg-background px-2">
            <option value="">{t('menus.root')}</option>
            {parents.filter((p) => p.id !== item?.id).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor={f('internalPath')}>{t('menus.path')}</Label>
          <Input id={f('internalPath')} name="internalPath" list="known-paths" defaultValue={item?.internal_path ?? ''} placeholder="/services" />
          <datalist id="known-paths">
            {knownPaths.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          {err('internalPath')}
        </div>
        <div className="grid gap-1">
          <Label htmlFor={f('externalUrl')}>{t('menus.url')}</Label>
          <Input id={f('externalUrl')} name="externalUrl" type="url" defaultValue={item?.external_url ?? ''} placeholder="https://" />
          {err('externalUrl')}
        </div>
        <div className="grid gap-1">
          <Label htmlFor={f('anchor')}>{t('menus.anchor')}</Label>
          <Input id={f('anchor')} name="anchor" defaultValue={item?.anchor ?? ''} placeholder="iletisim" />
          {err('anchor')}
        </div>
        {showSlot ? (
          <div className="grid gap-1">
            <Label htmlFor={f('headerSlot')}>{t('menus.slot')}</Label>
            <select id={f('headerSlot')} name="headerSlot" defaultValue={item?.header_slot ?? ''} className="h-9 rounded-md border bg-background px-2">
              <option value="">{t('common.none')}</option>
              <option value="left">{t('menus.left')}</option>
              <option value="right">{t('menus.right')}</option>
            </select>
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="localeTr" defaultChecked={item ? item.locales.includes('tr') : true} /> {t('common.tr')}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="localeEn" defaultChecked={item ? item.locales.includes('en') : true} /> {t('common.en')}
        </label>
        {showSlot ? (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isCta" defaultChecked={item?.is_cta ?? false} /> {t('menus.cta')}
          </label>
        ) : null}
        <label className="flex items-center gap-2">
          <input type="checkbox" name="openInNewTab" defaultChecked={item?.open_in_new_tab ?? false} /> {t('menus.newTab')}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={item?.is_active ?? true} /> {t('common.active')}
        </label>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {item ? t('common.save') : t('common.add')}
        </Button>
      </div>
    </form>
  );
}
