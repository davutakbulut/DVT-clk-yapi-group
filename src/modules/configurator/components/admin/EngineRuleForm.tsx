'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError, FormSection } from '@/modules/admin-shell';
import { saveEngineRule } from '../../actions';
import type { EngineRule } from '../../data/engineRepository';
import type { CatalogRow } from '../../engine/catalog';
import { ENGINE_APPS, type EngineKind } from '../../engine/registry';
import { allFields } from '../../engine/runtime';

interface Props {
  readonly kind: EngineKind;
  readonly rule: EngineRule;
  readonly catalog: readonly CatalogRow[];
}

/**
 * Tür bazlı konfigüratör ayarı (K-110): her alan için sınır/adım/varsayılan, seçimlerde varsayılan, profil alanlarında varsayılan katalog kodu,
 * notlar (satır satır TR/EN). Boş bırakılan kutu kod varsayılanını kullanır; yer tutucu varsayılanı gösterir.
 */
export function EngineRuleForm({ kind, rule, catalog }: Props) {
  const t = useTranslations('Admin.configuratorRules');
  const tc = useTranslations('Admin.common');
  const te = useTranslations('Engine');
  const tx = te as unknown as (k: string) => string;
  const [state, action, pending] = useActionState(saveEngineRule, IDLE);
  const app = ENGINE_APPS[kind];
  const fields = allFields(app);
  const num = (name: string, placeholder: number | undefined, value: number | undefined) => (
    <Input name={name} defaultValue={value === undefined ? '' : String(value)} placeholder={placeholder === undefined ? '' : String(placeholder)} inputMode="decimal" className="w-24" aria-label={name} aria-invalid={state.fieldErrors?.[name] ? 'true' : undefined} />
  );
  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="kind" value={kind} />
      <ActionMessage state={state} />
      <FormSection title={t('engine.fields')}>
        <p className="text-xs text-muted-foreground">{t('engine.fieldsHint')}</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground"><th className="py-1">{t('engine.field')}</th><th className="py-1">{t('engine.min')}</th><th className="py-1">{t('engine.max')}</th><th className="py-1">{t('engine.step')}</th><th className="py-1">{t('engine.default')}</th></tr>
          </thead>
          <tbody>
            {fields.map((f) => {
              const o = rule.fields[f.id] ?? {};
              return (
                <tr key={f.id} className="border-t align-top">
                  <th scope="row" className="py-2 pr-2 font-normal">{tx(f.labelKey)} <span className="font-mono text-xs text-muted-foreground">{f.id}{f.unit ? ` · ${f.unit}` : ''}</span></th>
                  {f.type === 'range' ? (
                    <>
                      <td className="py-1 pr-2">{num(`f_${f.id}_min`, f.min, typeof o.min === 'number' ? o.min : undefined)}</td>
                      <td className="py-1 pr-2">{num(`f_${f.id}_max`, f.max, typeof o.max === 'number' ? o.max : undefined)}</td>
                      <td className="py-1 pr-2">{num(`f_${f.id}_step`, f.step, typeof o.step === 'number' ? o.step : undefined)}</td>
                      <td className="py-1 pr-2">{num(`f_${f.id}_value`, typeof f.value === 'number' ? f.value : undefined, typeof o.value === 'number' ? o.value : undefined)}</td>
                    </>
                  ) : (
                    <>
                      <td className="py-1 text-xs text-muted-foreground" colSpan={3}>—</td>
                      <td className="py-1 pr-2">
                        <select name={`f_${f.id}_value`} aria-label={`${tx(f.labelKey)} · ${t('engine.default')}`} defaultValue={o.value === undefined ? '' : f.type === 'toggle' ? (o.value ? '1' : '0') : String(o.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
                          <option value="">{t('engine.codeDefault', { value: f.type === 'toggle' ? (f.value ? tc('yes') : tc('no')) : f.options ? tx(f.options.find((x) => String(x.value) === String(f.value))?.labelKey ?? '') : String(f.value) })}</option>
                          {f.type === 'toggle' ? (<><option value="1">{tc('yes')}</option><option value="0">{tc('no')}</option></>) : f.options?.map((x) => <option key={String(x.value)} value={String(x.value)}>{tx(x.labelKey).replace('\n', ' ')}</option>)}
                        </select>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </FormSection>
      <FormSection title={t('engine.profiles')}>
        <p className="text-xs text-muted-foreground">{t('engine.profilesHint')}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {app.profiles.map((p) => {
            const allowed = catalog.filter((c) => p.families.includes(c.family));
            const current = rule.profiles[p.id] ?? '';
            const missing = current !== '' && !allowed.some((c) => c.code === current);
            return (
              <div key={p.id} className="grid gap-1">
                <Label htmlFor={`p-${kind}-${p.id}`}>{tx(p.labelKey)}</Label>
                <select id={`p-${kind}-${p.id}`} name={`p_${p.id}`} defaultValue={missing ? '' : current} className={`h-9 rounded-md border bg-background px-2 text-sm ${missing ? 'border-amber-500' : ''}`}>
                  <option value="">{t('engine.codeDefault', { value: catalog.find((c) => c.code === p.value)?.label ?? p.value })}</option>
                  {allowed.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
                {missing ? <p className="text-xs text-amber-700">{t('missingProfile')}</p> : null}
                <FieldError state={state} name={`p_${p.id}`} />
              </div>
            );
          })}
        </div>
      </FormSection>
      <FormSection title={t('engine.notes')}>
        <p className="text-xs text-muted-foreground">{t('engine.notesHint')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label htmlFor={`notesTr-${kind}`}>{t('engine.notesTr')}</Label>
            <Textarea id={`notesTr-${kind}`} name="notesTr" rows={5} defaultValue={rule.notes.tr.join('\n')} placeholder={app.noteKeys.map((k) => tx(k)).join('\n')} />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`notesEn-${kind}`}>{t('engine.notesEn')}</Label>
            <Textarea id={`notesEn-${kind}`} name="notesEn" rows={5} defaultValue={rule.notes.en.join('\n')} />
          </div>
        </div>
      </FormSection>
      <div><Button type="submit" size="sm" disabled={pending}>{tc('save')}</Button></div>
    </form>
  );
}
