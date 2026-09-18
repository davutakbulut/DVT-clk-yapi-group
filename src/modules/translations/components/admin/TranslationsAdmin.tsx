'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FieldError } from '@/modules/admin-shell';
import { resetOverride, saveGlossaryTerm, saveOverride } from '../../actions';
import type { GlossaryTerm, OverrideRow } from '../../data/adminTranslationsRepository';

export interface LabelEntry {
  readonly key: string; // "Header.nav.services"
  readonly tr: string;
  readonly en: string;
}

/** Tek etiket satırı: TR/EN varsayılan + override girişleri; override varsa "varsayılana dön". */
function LabelRow({ entry, overrides }: { readonly entry: LabelEntry; readonly overrides: readonly OverrideRow[] }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveOverride, IDLE);
  const [namespace, ...rest] = entry.key.split('.');
  const key = rest.join('.');
  const cell = (locale: 'tr' | 'en', fallback: string) => {
    const o = overrides.find((x) => x.locale === locale);
    return (
      <div className="grid gap-1">
        <form action={action} className="grid gap-1">
          <input type="hidden" name="namespace" value={namespace} />
          <input type="hidden" name="key" value={key} />
          <input type="hidden" name="locale" value={locale} />
          <Label htmlFor={`o-${entry.key}-${locale}`} className="text-xs text-muted-foreground">
            {locale.toUpperCase()} · {o ? t('translations.overridden') : t('translations.default')}
          </Label>
          <div className="flex gap-1">
            <Input id={`o-${entry.key}-${locale}`} name="value" defaultValue={o?.value ?? fallback} className="h-8 text-xs" />
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
        {o ? (
          // Ayrı form: useActionState formunun içinde formAction karışmasın; JS'siz de çalışır
          <form action={resetOverride}>
            <input type="hidden" name="id" value={o.id} />
            <button type="submit" className="text-xs underline underline-offset-4">
              {t('translations.reset')}
            </button>
          </form>
        ) : null}
      </div>
    );
  };
  return (
    <li className="grid gap-2 rounded-md border p-3 sm:grid-cols-[minmax(0,220px)_1fr_1fr]">
      <code className="break-all text-xs">{entry.key}</code>
      {cell('tr', entry.tr)}
      {cell('en', entry.en)}
      <div className="sm:col-span-3">
        <ActionMessage state={state} />
      </div>
    </li>
  );
}

/** Etiket tablosu: arama (anahtar/metin), yalnız override'lar süzgeci; sayfa başına 50. */
export function TranslationsTable({ entries, overrides }: { readonly entries: readonly LabelEntry[]; readonly overrides: readonly OverrideRow[] }) {
  const t = useTranslations('Admin');
  const [q, setQ] = useState('');
  const [onlyOverridden, setOnlyOverridden] = useState(false);
  const byKey = useMemo(() => {
    const m = new Map<string, OverrideRow[]>();
    for (const o of overrides) {
      const k = `${o.namespace}.${o.key}`;
      m.set(k, [...(m.get(k) ?? []), o]);
    }
    return m;
  }, [overrides]);
  const needle = q.trim().toLocaleLowerCase('tr');
  const filtered = entries
    .filter((e) => !onlyOverridden || byKey.has(e.key))
    .filter((e) => !needle || e.key.toLocaleLowerCase('en').includes(needle) || e.tr.toLocaleLowerCase('tr').includes(needle) || e.en.toLocaleLowerCase('en').includes(needle))
    .slice(0, 50);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <Label htmlFor="tr-search">{t('translations.search')}</Label>
          <Input id="tr-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Header.nav" className="w-72" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyOverridden} onChange={(e) => setOnlyOverridden(e.target.checked)} /> {t('translations.onlyOverridden')}
        </label>
        <span className="text-xs text-muted-foreground">{t('translations.shown', { shown: filtered.length, total: entries.length })}</span>
      </div>
      <ul className="grid gap-2">
        {filtered.map((e) => (
          <LabelRow key={e.key} entry={e} overrides={byKey.get(e.key) ?? []} />
        ))}
      </ul>
    </div>
  );
}

export function GlossaryForm({ term }: { readonly term: GlossaryTerm | null }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveGlossaryTerm, IDLE);
  const k = term?.id ?? 'new';
  return (
    <form action={action} className="grid gap-3 rounded-md border p-3">
      <input type="hidden" name="id" value={term?.id ?? ''} />
      <ActionMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1">
          <Label htmlFor={`g-${k}-tr`}>{t('translations.termTr')}</Label>
          <Input id={`g-${k}-tr`} name="termTr" defaultValue={term?.term_tr ?? ''} required aria-invalid={state.fieldErrors?.['termTr'] ? 'true' : undefined} />
          <FieldError state={state} name="termTr" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`g-${k}-en`}>{t('translations.termEn')}</Label>
          <Input id={`g-${k}-en`} name="termEn" defaultValue={term?.term_en ?? ''} required aria-invalid={state.fieldErrors?.['termEn'] ? 'true' : undefined} />
          <FieldError state={state} name="termEn" />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`g-${k}-ctx`}>{t('translations.context')}</Label>
          <Input id={`g-${k}-ctx`} name="context" defaultValue={term?.context ?? ''} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="doNotTranslate" defaultChecked={term?.do_not_translate ?? false} /> {t('translations.doNotTranslate')}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isCaseSensitive" defaultChecked={term?.is_case_sensitive ?? false} /> {t('translations.caseSensitive')}
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          {term ? t('common.save') : t('common.add')}
        </Button>
      </div>
    </form>
  );
}
