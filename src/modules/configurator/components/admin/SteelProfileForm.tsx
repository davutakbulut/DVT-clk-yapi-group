'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError } from '@/modules/admin-shell';
import { saveSteelProfile } from '../../actions';
import type { AdminSteelProfile } from '../../data/adminProfilesRepository';
import { computeSectionProps, FAMILY_KEYS, FAMILY_KIND, type FamilyKey } from '../../engine/catalog';

const DIM_FIELDS: Record<string, readonly ('h' | 'b' | 'tw' | 'tf' | 'r' | 't')[]> = { I: ['h', 'b', 'tw', 'tf', 'r'], U: ['h', 'b', 'tw', 'tf', 'r'], C: ['h', 'b', 't'], L: ['h', 'b', 't', 'r'], RHS: ['h', 'b', 't'], CHS: ['h', 't'], FL: ['b', 't'] };

/** Profil formu (K-110): kod · etiket · aile · ölçüler (mm) · kg/m (boşsa ölçülerden) · aktif. Ölçüler kesit çizimini ve kesit değerlerini üretir. */
export function SteelProfileForm({ profile }: { readonly profile: AdminSteelProfile | null }) {
  const t = useTranslations('Admin');
  const format = useFormatter();
  const te = useTranslations('Engine');
  const [state, action, pending] = useActionState(saveSteelProfile, IDLE);
  const p = profile;
  const idp = `sp-${p?.id ?? 'new'}`;
  const [family, setFamily] = useState<FamilyKey>((p?.family as FamilyKey) ?? 'IPE');
  const [dims, setDims] = useState<Record<string, string>>(Object.fromEntries(Object.entries(p?.dimensions ?? {}).map(([k, v]) => [k, String(v)])));
  const kind = FAMILY_KIND[(FAMILY_KEYS as readonly string[]).includes(family) ? family : 'IPE'];
  const computed = (() => {
    try {
      const d = Object.fromEntries(Object.entries(dims).map(([k, v]) => [k, Number(String(v).replace(',', '.'))]));
      if (!(d['h'] ?? d['t']) || !(d['b'] ?? d['h'])) return null;
      return computeSectionProps({ code: 'x', label: '', family, kind, dims: { h: d['h'] ?? d['t'] ?? 0, b: d['b'] ?? d['h'] ?? 0, tw: d['tw'], tf: d['tf'], r: d['r'] ?? 0, t: d['t'] } }).G;
    } catch { return null; }
  })();
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {field('code', t('steelProfiles.code'), { defaultValue: p?.code ?? '', required: true, placeholder: 'HEB360' })}
        {field('label', t('steelProfiles.label'), { defaultValue: p?.label ?? '', required: true, placeholder: 'HEB 360' })}
        <div className="grid gap-1">
          <Label htmlFor={`${idp}-family`}>{t('steelProfiles.family')}</Label>
          <select id={`${idp}-family`} name="family" value={family} onChange={(e) => setFamily(e.target.value as FamilyKey)} className="h-9 rounded-md border bg-background px-2 text-sm">
            {FAMILY_KEYS.map((f) => <option key={f} value={f}>{te(`families.${f}.label`)}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={p?.is_active ?? true} /> {t('steelProfiles.active')}</label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {DIM_FIELDS[kind]!.map((k) => (
          <div key={k} className="grid gap-1">
            <Label htmlFor={`${idp}-${k}`}>{t(`steelProfiles.dims.${k}`)}</Label>
            <Input id={`${idp}-${k}`} name={k} value={dims[k] ?? ''} onChange={(e) => setDims({ ...dims, [k]: e.target.value })} inputMode="decimal" required={k === 'h' || k === 'b' || k === 't'} aria-invalid={state.fieldErrors?.[k] ? 'true' : undefined} />
          </div>
        ))}
        {field('kgPerM', t('steelProfiles.kgPerM'), { defaultValue: p ? String(p.kg_per_m) : '', inputMode: 'decimal', placeholder: computed ? computed.toFixed(2) : '' })}
      </div>
      <p className="text-xs text-muted-foreground">{computed ? t('steelProfiles.computedHint', { kg: format.number(computed, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }) : t('steelProfiles.dimsHint')}</p>
      <div><Button type="submit" size="sm" disabled={pending}>{p ? t('common.save') : t('common.add')}</Button></div>
    </form>
  );
}
