'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection } from '@/modules/admin-shell';
import { saveRules } from '../../actions';
import { SIMPLE_KINDS } from '../../domain/simple/registry';
import type { ConfiguratorRules } from '../../data/rulesRepository';
import type { RuleChoices } from '../../data/adminConfigurationsRepository';
import type { ProfileKey } from '../../domain/structure';

interface Props {
  readonly rules: ConfiguratorRules;
  readonly choices: RuleChoices;
}

const PROFILE_KEYS: readonly ProfileKey[] = ['column', 'rafter', 'secondary', 'wind_column', 'purlin_small_bay', 'purlin_large_bay', 'brace', 'truss_chord', 'door_frame'];
const PRICE_KEYS = ['steel', 'roof_panel', 'wall_panel', 'bolt'] as const;

/** Kurallar: sistem eşiği · aşık aralığı · işçilik katsayısı · limitler (JSON) · profil eşlemesi (datalist: aktif profiller) · fiyat eşlemesi (malzeme kodları). */
export function RulesForm({ rules, choices }: Props) {
  const t = useTranslations('Admin.configuratorRules');
  const tc = useTranslations('Admin.common');
  const [state, action, pending] = useActionState(saveRules, IDLE);
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
      <FormSection title={t('system')}>
        <div className="grid gap-3 sm:grid-cols-3">
          {num('trussThresholdM', t('trussThreshold'), rules.trussThresholdM, t('trussThresholdHint'))}
          {num('purlinSpacingM', t('purlinSpacing'), rules.purlinSpacingM)}
          {num('laborFactor', t('laborFactor'), rules.laborFactor, t('laborFactorHint'))}
        </div>
        <div className="grid gap-1">
          <Label htmlFor="r-limits">{t('limits')}</Label>
          <textarea id="r-limits" name="limits" rows={4} defaultValue={JSON.stringify(rules.limits, null, 1)} className="rounded-md border bg-background px-2 py-1 font-mono text-xs" aria-invalid={state.fieldErrors?.['limits'] ? 'true' : undefined} />
          <p className="text-xs text-muted-foreground">{t('limitsHint')}</p>
          <FieldError state={state} name="limits" />
        </div>
      </FormSection>
      <FormSection title={t('simple.title')}>
        <p className="text-xs text-muted-foreground">{t('simple.hint')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SIMPLE_KINDS.map((k) => (
            <div key={k} className="grid gap-1">
              <Label htmlFor={`r-simple-${k}`}>{t(`simple.${k}`)}</Label>
              <textarea id={`r-simple-${k}`} name={`simple_${k}`} rows={8} defaultValue={JSON.stringify(rules.simple[k], null, 1)} className="rounded-md border bg-background px-2 py-1 font-mono text-xs" aria-invalid={state.fieldErrors?.[`simple_${k}`] ? 'true' : undefined} />
              <FieldError state={state} name={`simple_${k}`} />
            </div>
          ))}
        </div>
      </FormSection>
      <FormSection title={t('profileMap')}>
        <p className="text-xs text-muted-foreground">{t('profileMapHint')}</p>
        <datalist id="profile-codes">
          {choices.profiles.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="grid gap-3 sm:grid-cols-3">
          {PROFILE_KEYS.map((k) => (
            <div key={k} className="grid gap-1">
              <Label htmlFor={`r-profile_${k}`}>{t(`profileKeys.${k}`)}</Label>
              <Input id={`r-profile_${k}`} name={`profile_${k}`} list="profile-codes" defaultValue={rules.profileMap[k]} className={choices.profiles.includes(rules.profileMap[k]) ? '' : 'border-amber-500'} />
              {!choices.profiles.includes(rules.profileMap[k]) ? <p className="text-xs text-amber-700">{t('missingProfile')}</p> : null}
            </div>
          ))}
        </div>
      </FormSection>
      <FormSection title={t('priceMap')}>
        <p className="text-xs text-muted-foreground">{t('priceMapHint')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRICE_KEYS.map((k) => (
            <div key={k} className="grid gap-1">
              <Label htmlFor={`r-price_${k}`}>{t(`priceKeys.${k}`)}</Label>
              <select id={`r-price_${k}`} name={`price_${k}`} defaultValue={rules.priceMap[k]} className="h-9 rounded-md border bg-background px-2 text-sm">
                <option value="">{tc('none')}</option>
                {choices.materials.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.label}
                  </option>
                ))}
              </select>
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
