'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useEffect, useId, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import { INITIAL_STATE, type AuthFormState } from '@/modules/auth';

type Action = (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
export interface AccountField {
  readonly name: string;
  readonly label: string;
  readonly type?: 'text' | 'email' | 'password' | 'tel' | 'textarea' | 'select';
  readonly options?: readonly { readonly value: string; readonly label: string }[];
  readonly defaultValue?: string;
  readonly required?: boolean;
  readonly autoComplete?: string;
  readonly hint?: string;
  readonly placeholder?: string;
  readonly rows?: number;
  readonly pattern?: string;
}
interface Props {
  readonly action: Action;
  readonly fields: readonly AccountField[];
  readonly submitLabel: string;
  readonly doneMessage?: string;
  readonly hidden?: Readonly<Record<string, string>>;
  readonly danger?: boolean;
  /** Başarıda sunucu bileşenlerini tazele (liste/veri değişti) ve formu sıfırla. */
  readonly refreshOnDone?: boolean;
  readonly compact?: boolean;
}

/** Hesabım formları (K-103): AuthForm'un textarea/select/ipucu destekli kardeşi; hata anahtarları Auth.errors'tan. */
export function AccountForm({ action, fields, submitLabel, doneMessage, hidden = {}, danger = false, refreshOnDone = false, compact = false }: Props) {
  const t = useTranslations('Auth');
  const router = useRouter();
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  useEffect(() => {
    if (state.done && refreshOnDone) { formRef.current?.reset(); router.refresh(); }
  }, [state, refreshOnDone, router]);
  const inputClass = 'field min-h-11 w-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 text-[var(--color-text)]';
  return (
    <form ref={formRef} action={formAction} className={compact ? 'grid gap-3' : 'grid gap-4'} noValidate data-danger={danger || undefined}>
      {Object.entries(hidden).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      {state.error && state.error !== 'validation' ? (
        <p role="alert" className="border border-[var(--color-danger)] px-4 py-3 text-[length:var(--fs-sm)] text-[var(--color-danger)]">{t(`errors.${state.error}`)}</p>
      ) : null}
      {fields.map((f) => {
        const error = state.fieldErrors?.[f.name];
        const id = `${uid}-${f.name}`;
        const describedBy = [error ? `${id}-error` : null, f.hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
        return (
          <div key={f.name} className="grid gap-1">
            <label htmlFor={id} className="text-[length:var(--fs-sm)] font-medium">{f.label}</label>
            {f.type === 'textarea' ? (
              <textarea id={id} name={f.name} rows={f.rows ?? 5} defaultValue={f.defaultValue} required={f.required ?? true} placeholder={f.placeholder} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} className={`${inputClass} py-2`} />
            ) : f.type === 'select' ? (
              <select id={id} name={f.name} defaultValue={f.defaultValue} aria-describedby={describedBy} className={inputClass}>
                {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input id={id} name={f.name} type={f.type ?? 'text'} autoComplete={f.autoComplete} defaultValue={f.defaultValue} required={f.required ?? true} placeholder={f.placeholder} pattern={f.pattern} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} className={inputClass} />
            )}
            {f.hint ? <p id={`${id}-hint`} className="text-[length:var(--fs-xs)] text-[var(--color-text-muted)]">{f.hint}</p> : null}
            {error ? <p id={`${id}-error`} className="text-[length:var(--fs-xs)] text-[var(--color-danger)]">{t(`errors.${error}`)}</p> : null}
          </div>
        );
      })}
      {state.done ? <p role="status" className="text-[length:var(--fs-sm)] text-[var(--color-success)]">{doneMessage ?? t('saved')}</p> : null}
      <div>
        <button type="submit" className={danger ? 'btn account-btn-danger' : 'btn btn-primary'} disabled={pending} aria-busy={pending}>{submitLabel}</button>
      </div>
    </form>
  );
}
