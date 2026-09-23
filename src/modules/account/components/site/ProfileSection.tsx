import { getTranslations } from 'next-intl/server';
import type { CurrentUser } from '@/core/auth';
import { AuthForm } from '@/modules/auth';
import { updateProfile } from '@/modules/auth/actions';
import { getMyCustomer } from '../../data/accountRepository';
import { saveMyCustomer } from '../../actions';
import { AccountForm } from './AccountForm';

export async function ProfileSection({ user }: { readonly user: CurrentUser }) {
  const [t, tAuth, customer] = await Promise.all([getTranslations('Account.profile'), getTranslations('Auth'), getMyCustomer()]);
  const c = customer.ok ? customer.data : null;
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <section className="grid gap-4" aria-labelledby="p-personal">
        <h2 id="p-personal" className="text-[length:var(--fs-h4)]">{t('personal')}</h2>
        <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{user.email}</p>
        <AuthForm
          action={updateProfile}
          submitLabel={t('save')}
          fields={[
            { name: 'fullName', label: tAuth('fullName'), autoComplete: 'name', defaultValue: user.fullName },
            { name: 'phone', label: tAuth('phone'), type: 'tel', autoComplete: 'tel', required: false },
          ]}
          select={{ name: 'preferredLocale', label: tAuth('preferredLocale'), defaultValue: user.preferredLocale, options: [{ value: 'tr', label: 'Türkçe' }, { value: 'en', label: 'English' }] }} // static-ok: dil adları kendi dilinde
        />
      </section>
      <section className="grid gap-4" aria-labelledby="p-company">
        <h2 id="p-company" className="text-[length:var(--fs-h4)]">{t('company')}</h2>
        <AccountForm
          action={saveMyCustomer}
          submitLabel={t('save')}
          doneMessage={t('saved')}
          fields={[
            { name: 'type', label: t('type'), type: 'select', defaultValue: c?.type ?? 'corporate', options: [{ value: 'corporate', label: t('corporate') }, { value: 'individual', label: t('individual') }] },
            { name: 'company_title', label: t('companyTitle'), defaultValue: c?.companyTitle ?? '', required: false, autoComplete: 'organization' },
            { name: 'full_name', label: t('fullName'), defaultValue: c?.fullName ?? user.fullName, required: false, autoComplete: 'name' },
            { name: 'tax_office', label: t('taxOffice'), defaultValue: c?.taxOffice ?? '', required: false },
            { name: 'tax_id', label: t('taxId'), defaultValue: c?.taxId ?? '', required: false, hint: t('taxIdHint') },
            { name: 'phone', label: t('phone'), type: 'tel', defaultValue: c?.phone ?? '', required: false, autoComplete: 'tel' },
            { name: 'address', label: t('address'), type: 'textarea', rows: 3, defaultValue: c?.address ?? '', required: false },
            { name: 'city', label: t('city'), defaultValue: c?.city ?? '', required: false, autoComplete: 'address-level1' },
            { name: 'district', label: t('district'), defaultValue: c?.district ?? '', required: false, autoComplete: 'address-level2' },
          ]}
        />
      </section>
    </div>
  );
}
