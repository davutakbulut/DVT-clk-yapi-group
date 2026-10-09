'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection } from '@/modules/admin-shell';
import { saveRules } from '../../actions';
import type { RuleChoices } from '../../data/adminConfigurationsRepository';
import type { ConfiguratorRules } from '../../data/rulesRepository';

const PRICE_KEYS = ['steel', 'roof_panel', 'wall_panel', 'bolt'] as const;

/** Genel kurallar: işçilik katsayısı · fiyat eşlemesi (malzeme kodları). Tür bazlı ayarlar EngineRuleForm'da (K-110). */
export function RulesForm({ rules, choices }: { readonly rules: ConfiguratorRules; readonly choices: RuleChoices }) {
  const t = useTranslations('Admin.configuratorRules');
  const tc = useTranslations('Admin.common');
  const [state, action, pending] = useActionState(saveRules, IDLE);
  return (
    <form action={action} className="grid gap-6">
      <ActionMessage state={state} />
      <FormSection title={t('pricing')}>
        <div className="grid gap-1 sm:max-w-xs">
          <Label htmlFor="r-laborFactor">{t('laborFactor')}</Label>
          <Input id="r-laborFactor" name="laborFactor" defaultValue={String(rules.laborFactor)} inputMode="decimal" aria-invalid={state.fieldErrors?.['laborFactor'] ? 'true' : undefined} />
          <p className="text-xs text-muted-foreground">{t('laborFactorHint')}</p>
          <FieldError state={state} name="laborFactor" />
        </div>
        <p className="text-xs text-muted-foreground">{t('priceMapHint')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRICE_KEYS.map((k) => (
            <div key={k} className="grid gap-1">
              <Label htmlFor={`r-price_${k}`}>{t(`priceKeys.${k}`)}</Label>
              <select id={`r-price_${k}`} name={`price_${k}`} defaultValue={rules.priceMap[k]} className="h-9 rounded-md border bg-background px-2 text-sm">
                <option value="">{tc('none')}</option>
                {choices.materials.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      </FormSection>
      <div><Button type="submit" size="sm" disabled={pending}>{tc('save')}</Button></div>
    </form>
  );
}
