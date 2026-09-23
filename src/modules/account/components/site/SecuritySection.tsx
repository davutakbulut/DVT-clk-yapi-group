import { getTranslations } from 'next-intl/server';
import type { CurrentUser } from '@/core/auth';
import { signOut } from '@/modules/auth/actions';
import { changeEmail, changePassword, deleteMyAccount } from '../../actions';
import { AccountForm } from './AccountForm';

export async function SecuritySection({ user }: { readonly user: CurrentUser }) {
  const t = await getTranslations('Account.security');
  return (
    <div className="grid gap-10">
      <div className="grid gap-10 md:grid-cols-2">
        <section className="grid gap-4" aria-labelledby="s-pass">
          <h2 id="s-pass" className="text-[length:var(--fs-h4)]">{t('changePassword')}</h2>
          <AccountForm
            action={changePassword}
            submitLabel={t('changePassword')}
            doneMessage={t('passwordChanged')}
            fields={[
              { name: 'current', label: t('current'), type: 'password', autoComplete: 'current-password' },
              { name: 'password', label: t('newPassword'), type: 'password', autoComplete: 'new-password' },
              { name: 'passwordConfirm', label: t('confirm'), type: 'password', autoComplete: 'new-password' },
            ]}
          />
        </section>
        <section className="grid gap-4" aria-labelledby="s-mail">
          <h2 id="s-mail" className="text-[length:var(--fs-h4)]">{t('changeEmail')}</h2>
          <p className="text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{t('currentEmail')}: {user.email}</p>
          <AccountForm
            action={changeEmail}
            submitLabel={t('changeEmail')}
            doneMessage={t('emailSent')}
            fields={[
              { name: 'email', label: t('newEmail'), type: 'email', autoComplete: 'email' },
              { name: 'current', label: t('current'), type: 'password', autoComplete: 'current-password' },
            ]}
          />
        </section>
      </div>
      <section className="grid gap-4 border-t border-[var(--color-border)] pt-8" aria-labelledby="s-session">
        <h2 id="s-session" className="text-[length:var(--fs-h4)]">{t('sessions')}</h2>
        <form action={signOut}><button type="submit" className="btn btn-ghost">{t('logout')}</button></form>
      </section>
      {!user.isStaff ? (
        <section className="account-danger grid gap-4" aria-labelledby="s-danger">
          <h2 id="s-danger" className="text-[length:var(--fs-h4)] text-[var(--color-danger)]">{t('danger')}</h2>
          <p className="max-w-prose text-[length:var(--fs-sm)] text-[var(--color-text-muted)]">{t('dangerLead')}</p>
          <AccountForm danger action={deleteMyAccount} submitLabel={t('deleteBtn')} fields={[{ name: 'confirm', label: t('confirmWord'), autoComplete: 'off' }]} />
        </section>
      ) : null}
    </div>
  );
}
