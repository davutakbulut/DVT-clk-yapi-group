'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError } from '@/modules/admin-shell';
import { saveSteelProfile } from '../../actions';
import type { AdminSteelProfile } from '../../data/adminProfilesRepository';

const USAGES = ['', 'column', 'beam', 'rafter', 'purlin', 'girt', 'bracing', 'wind_column', 'other'] as const;

/** Profil formu: kod · aile · kg/m · kullanım · aktif. Kod `configurator_rules.profile_map` ile eşleşince metrajda kullanılır. */
export function SteelProfileForm({ profile }: { readonly profile: AdminSteelProfile | null }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveSteelProfile, IDLE);
  const p = profile;
  const idp = `sp-${p?.id ?? 'new'}`;
  const field = (name: string, label: string, props: React.ComponentProps<typeof Input>) => (
    <div className="grid gap-1">
      <Label htmlFor={`${idp}-${name}`}>{label}</Label>
      <Input id={`${idp}-${name}`} name={name} aria-invalid={state.fieldErrors?.[name] ? 'true' : undefined} {...props} />
      <FieldError state={state} name={name} />
    </div>
  );
  return (
    <form action={action} className="grid gap-3 rounded-md border p-4">
      <input type="hidden" name="id" value={p?.id ?? ''} />
      <ActionMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {field('code', t('steelProfiles.code'), { defaultValue: p?.code ?? '', required: true, placeholder: 'HEB360' })}
        {field('family', t('steelProfiles.family'), { defaultValue: p?.family ?? '', required: true, placeholder: 'HEB' })}
        {field('kgPerM', t('steelProfiles.kgPerM'), { defaultValue: p ? String(p.kg_per_m) : '', required: true, inputMode: 'decimal' })}
        <div className="grid gap-1">
          <Label htmlFor={`${idp}-usage`}>{t('steelProfiles.usage')}</Label>
          <select id={`${idp}-usage`} name="usage" defaultValue={p?.usage ?? ''} className="h-9 rounded-md border bg-background px-2 text-sm">
            {USAGES.map((u) => (
              <option key={u} value={u}>
                {u === '' ? t('common.none') : t(`steelProfiles.usages.${u}`)}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={p?.is_active ?? true} /> {t('steelProfiles.active')}
        </label>
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {p ? t('common.save') : t('common.add')}
        </Button>
      </div>
    </form>
  );
}
