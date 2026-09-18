'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ActionState } from '@/lib/formState';

/** Ortak admin form parçaları: TR/EN çiftleri, medya seçici, yayın alanları, sonuç mesajı. Metinler Admin.form.* */

export function FieldError({ state, name }: { readonly state: ActionState; readonly name: string }) {
  const t = useTranslations('Admin');
  return state.fieldErrors?.[name] ? <span className="text-xs text-destructive">{t('errors.validation')}</span> : null;
}

export function ActionMessage({ state }: { readonly state: ActionState }) {
  const t = useTranslations('Admin');
  if (state.error && state.error !== 'validation') return <p role="alert" className="text-sm text-destructive">{t(`errors.${state.error}`)}</p>;
  if (state.error === 'validation') return <p role="alert" className="text-sm text-destructive">{t('errors.validation')}</p>;
  if (state.done) return <p role="status" className="text-sm text-green-700">{t('common.saved')}</p>;
  return null;
}

interface LocalizedProps {
  readonly name: string;
  readonly label: string;
  readonly value?: Readonly<Partial<Record<string, string>>> | null;
  readonly state: ActionState;
  readonly multiline?: boolean;
  readonly rows?: number;
  readonly required?: boolean;
  readonly hint?: string;
}

/** TR + EN ikilisi; form alan adları `${name}Tr` / `${name}En`. */
export function LocalizedField({ name, label, value, state, multiline = false, rows = 4, required = false, hint }: LocalizedProps) {
  const t = useTranslations('Admin');
  const render = (suffix: 'Tr' | 'En', locale: 'tr' | 'en') => {
    const id = `f-${name}${suffix}`;
    const common = { id, name: `${name}${suffix}`, defaultValue: value?.[locale] ?? '', required: required && locale === 'tr', 'aria-invalid': state.fieldErrors?.[`${name}${suffix}`] ? ('true' as const) : undefined };
    return (
      <div className="grid gap-1">
        <Label htmlFor={id}>
          {label} ({t(`common.${locale}`)})
        </Label>
        {multiline ? <Textarea {...common} rows={rows} /> : <Input {...common} />}
        <FieldError state={state} name={`${name}${suffix}`} />
      </div>
    );
  };
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      {render('Tr', 'tr')}
      {render('En', 'en')}
      {hint ? <p className="text-xs text-muted-foreground sm:col-span-2">{hint}</p> : null}
    </fieldset>
  );
}

export interface MediaOption {
  readonly id: string;
  readonly path: string;
  readonly mime: string;
}

/** media_library'den seçim; görsel/video süzgeci çağıranda. */
export function MediaSelect({ name, label, options, value, allowEmpty = true }: { readonly name: string; readonly label: string; readonly options: readonly MediaOption[]; readonly value?: string | null; readonly allowEmpty?: boolean }) {
  const t = useTranslations('Admin');
  return (
    <div className="grid gap-1">
      <Label htmlFor={`f-${name}`}>{label}</Label>
      <select id={`f-${name}`} name={name} defaultValue={value ?? ''} className="h-9 rounded-md border bg-background px-2 text-sm">
        {allowEmpty ? <option value="">{t('common.none')}</option> : null}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.path}
          </option>
        ))}
      </select>
    </div>
  );
}

export interface PublishValue {
  readonly status: string;
  readonly published_locales: readonly string[];
  readonly reviewedEn: boolean;
  readonly slug?: Readonly<Partial<Record<string, string>>> | null;
}

/** Durum · EN yayın · EN onay (K-08) · slug'lar (K-09: EN slug elle). */
export function PublishFields({ value, withSlug = true, state }: { readonly value?: PublishValue | null; readonly withSlug?: boolean; readonly state: ActionState }) {
  const t = useTranslations('Admin');
  return (
    <fieldset className="grid gap-3 rounded-md border p-3">
      <legend className="px-1 text-sm font-medium">{t('form.publishing')}</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1">
          <Label htmlFor="f-status">{t('form.status')}</Label>
          <select id="f-status" name="status" defaultValue={value?.status ?? 'draft'} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="draft">{t('form.draft')}</option>
            <option value="published">{t('form.published')}</option>
            <option value="archived">{t('form.archived')}</option>
          </select>
        </div>
        {withSlug ? (
          <>
            <div className="grid gap-1">
              <Label htmlFor="f-slugTr">{t('form.slugTr')}</Label>
              <Input id="f-slugTr" name="slugTr" defaultValue={value?.slug?.['tr'] ?? ''} placeholder={t('form.slugAuto')} />
              <FieldError state={state} name="slugTr" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="f-slugEn">{t('form.slugEn')}</Label>
              <Input id="f-slugEn" name="slugEn" defaultValue={value?.slug?.['en'] ?? ''} />
              <FieldError state={state} name="slugEn" />
            </div>
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="reviewedEn" defaultChecked={value?.reviewedEn ?? false} /> {t('form.reviewedEn')}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="publishEn" defaultChecked={value?.published_locales.includes('en') ?? false} /> {t('form.publishEn')}
        </label>
      </div>
      <FieldError state={state} name="publishEn" />
    </fieldset>
  );
}

export function FormSection({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-md border bg-card p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
