'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError } from '@/modules/admin-shell';
import { saveFunnel } from '../../actions';
import type { FunnelRow } from '../../data/insightsRepository';

/** Huni tanımı: ad, açıklama, adım satırları "ad | tür | değer". Admin'den tanımlanır (06-ANALYTICS). */
export function FunnelForm({ funnel }: { readonly funnel: FunnelRow | null }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveFunnel, IDLE);
  const k = funnel?.id ?? 'new';
  const lines = funnel ? funnel.steps.map((s) => `${s.name} | ${s.match_type} | ${s.match_value}`).join('\n') : '';
  return (
    <form action={action} className="grid gap-3 rounded-md border p-3">
      <input type="hidden" name="id" value={funnel?.id ?? ''} />
      <ActionMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor={`f-${k}-name`}>{t('insights.name')}</Label>
          <Input id={`f-${k}-name`} name="name" defaultValue={funnel?.name ?? ''} required aria-invalid={state.fieldErrors?.['name'] ? 'true' : undefined} />
          <FieldError state={state} name="name" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`f-${k}-desc`}>{t('customers.notes')}</Label>
          <Input id={`f-${k}-desc`} name="description" defaultValue={funnel?.description ?? ''} />
        </div>
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`f-${k}-steps`}>{t('insights.steps')}</Label>
        <Textarea id={`f-${k}-steps`} name="steps" rows={4} defaultValue={lines} className="font-mono text-xs" aria-invalid={state.fieldErrors?.['steps'] ? 'true' : undefined} />
        <p className="text-xs text-muted-foreground">{t('insights.stepsHint')}</p>
        <FieldError state={state} name="steps" />
      </div>
      <div className="flex items-center gap-4">
        {funnel ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={funnel.is_active} /> {t('common.active')}
          </label>
        ) : null}
        <Button type="submit" size="sm" disabled={pending}>
          {funnel ? t('common.save') : t('common.add')}
        </Button>
      </div>
    </form>
  );
}
