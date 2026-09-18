'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useEffect, type ReactNode } from 'react';
import { INITIAL_STATE, type AuthFormState } from '../../domain/schemas';

type Action = (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;

export interface FieldSpec {
  readonly name: string;
  readonly label: string;
  readonly type?: 'text' | 'email' | 'password' | 'tel';
  readonly autoComplete?: string;
  readonly defaultValue?: string;
  readonly required?: boolean;
}

interface Props {
  readonly action: Action;
  readonly fields: readonly FieldSpec[];
  readonly submitLabel: string;
  readonly doneMessage?: string;
  readonly hidden?: Readonly<Record<string, string>>;
  readonly children?: ReactNode;
  readonly select?: { readonly name: string; readonly label: string; readonly options: readonly { value: string; label: string }[]; readonly defaultValue: string };
}

/** Ortak üyelik formu: useActionState + hata anahtarları → messages. JS'siz de gönderilir (Server Action). */
export function AuthForm({ action, fields, submitLabel, doneMessage, hidden = {}, children, select }: Props) {
  const t = useTranslations('Auth');
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);

  // Tam sayfa yönlendirme: yeni oturum çerezi bir sonraki isteğe kesin taşınır (router.push RSC fetch'i yarışabilir).
  useEffect(() => {
    if (state.redirectTo) window.location.assign(state.redirectTo);
  }, [state.redirectTo]);

  if (state.redirectTo) return <p role="status">…</p>;
  if (state.done && doneMessage) {
    return (
      <p role="status" className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-[var(--color-text-muted)]">
        {doneMessage}
      </p>
    );
  }

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {state.error && state.error !== 'validation' ? (
        <p role="alert" className="border border-[var(--color-danger)] px-4 py-3 text-[length:var(--fs-sm)] text-[var(--color-danger)]">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
      {fields.map((field) => {
        const error = state.fieldErrors?.[field.name];
        const id = `auth-${field.name}`;
        return (
          <div key={field.name} className="grid gap-1">
            <label htmlFor={id} className="text-[length:var(--fs-sm)] font-medium">
              {field.label}
            </label>
            <input
              id={id}
              name={field.name}
              type={field.type ?? 'text'}
              autoComplete={field.autoComplete}
              defaultValue={field.defaultValue}
              required={field.required ?? true}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              className="min-h-11 border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-[var(--color-text)]"
            />
            {error ? (
              <p id={`${id}-error`} className="text-[length:var(--fs-xs)] text-[var(--color-danger)]">
                {t(`errors.${error}`)}
              </p>
            ) : null}
          </div>
        );
      })}
      {select ? (
        <div className="grid gap-1">
          <label htmlFor={`auth-${select.name}`} className="text-[length:var(--fs-sm)] font-medium">
            {select.label}
          </label>
          <select id={`auth-${select.name}`} name={select.name} defaultValue={select.defaultValue} className="min-h-11 border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3">
            {select.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {state.done && !doneMessage ? (
        <p role="status" className="text-[length:var(--fs-sm)] text-[var(--color-success)]">
          {t('saved')}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={pending} aria-busy={pending}>
        {submitLabel}
      </button>
      {children}
    </form>
  );
}
