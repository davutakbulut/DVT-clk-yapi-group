'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection } from '@/modules/admin-shell';
import { saveMultiStoreyRules } from '../../actions';
import type { MultiStoreyGroup, MultiStoreyRules } from '../../domain/multiStorey';

const GROUPS: readonly MultiStoreyGroup[] = ['column', 'main_beam', 'secondary_beam'];

/** Çok katlı konfigüratör kuralları: limitler (JSON) · en büyük aks aralığı · radye kuralı · profiller (datalist: aktif profiller). */
export function MultiStoreyRulesForm({ rules, profileCodes }: { readonly rules: MultiStoreyRules; readonly profileCodes: readonly string[] }) {
  const t = useTranslations('Admin.configuratorRules.multiStorey');
  const tc = useTranslations('Admin.common');
  const tr = useTranslations('Admin.configuratorRules');
  const [state, action, pending] = useActionState(saveMultiStoreyRules, IDLE);
  const num = (name: string, label: string, value: number, hint?: string) => (
    <div className="grid gap-1">
      <Label htmlFor={`r-${name}`}>{label}</Label>
      <Input id={`r-${name}`} name={name} defaultValue={String(value)} inputMode="decimal" aria-invalid={state.fieldErrors?.[name] ? 'true' : undefined} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <FieldError state={state} name={name} />
    </div>
  );
  return (
    <form action={action} className="grid gap-6">
      <ActionMessage state={state} />
      <FormSection title={t('title')}>
        <p className="text-xs text-muted-foreground">{t('lead')}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {num('msMaxColumnSpacingM', t('maxColumnSpacing'), rules.maxColumnSpacingM, t('maxColumnSpacingHint'))}
          {num('msRaftBaseM', t('raftBase'), rules.raftBaseM)}
          {num('msRaftFreeFloors', t('raftFreeFloors'), rules.raftFreeFloors, t('raftFreeFloorsHint'))}
          {num('msRaftExtraPerFloorM', t('raftExtraPerFloor'), rules.raftExtraPerFloorM)}
          {num('msRaftOverhangM', t('raftOverhang'), rules.raftOverhangM)}
        </div>
        <div className="grid gap-1">
          <Label htmlFor="r-msLimits">{tr('limits')}</Label>
          <textarea id="r-msLimits" name="msLimits" rows={4} defaultValue={JSON.stringify(rules.limits, null, 1)} className="rounded-md border bg-background px-2 py-1 font-mono text-xs" aria-invalid={state.fieldErrors?.['msLimits'] ? 'true' : undefined} />
          <p className="text-xs text-muted-foreground">{t('limitsHint')}</p>
          <FieldError state={state} name="msLimits" />
        </div>
        <datalist id="ms-profile-codes">
          {profileCodes.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="grid gap-3 sm:grid-cols-3">
          {GROUPS.map((g) => (
            <div key={g} className="grid gap-1">
              <Label htmlFor={`r-msProfile_${g}`}>{t(`groups.${g}`)}</Label>
              <Input id={`r-msProfile_${g}`} name={`msProfile_${g}`} list="ms-profile-codes" defaultValue={rules.profiles[g]} className={profileCodes.includes(rules.profiles[g]) ? '' : 'border-amber-500'} />
              {!profileCodes.includes(rules.profiles[g]) ? <p className="text-xs text-amber-700">{tr('missingProfile')}</p> : null}
              <FieldError state={state} name={`msProfile_${g}`} />
            </div>
          ))}
        </div>
      </FormSection>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {tc('save')}
        </Button>
      </div>
    </form>
  );
}
