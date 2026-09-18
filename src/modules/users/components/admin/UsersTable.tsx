'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { ALL_ROLES } from '@/core/auth/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { IDLE } from '@/lib/formState';
import { inviteUser, updateProfileRole } from '../../actions';
import type { ProfileRow } from '../../data/usersRepository';

interface Props {
  readonly profiles: readonly ProfileRow[];
  readonly currentUserId: string;
  readonly canManage: boolean;
}

function RoleRow({ p, self, canManage }: { readonly p: ProfileRow; readonly self: boolean; readonly canManage: boolean }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(updateProfileRole, IDLE);
  return (
    <tr className="border-t">
      <td className="px-3 py-2">
        {p.full_name || '—'} {self ? <span className="text-xs text-muted-foreground">({t('users.you')})</span> : null}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
      <td className="px-3 py-2" colSpan={2}>
        {canManage ? (
          <form action={action} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={p.id} />
            <select name="role" defaultValue={p.role} className="h-8 rounded-md border bg-background px-2 text-xs" aria-label={t('users.role')}>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`users.roles.${r}`)}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" name="isActive" defaultChecked={p.is_active} /> {t('common.active')}
            </label>
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              {t('common.save')}
            </Button>
            {state.done ? <span role="status" className="text-xs text-green-700">{t('common.saved')}</span> : null}
            {state.error ? <span role="alert" className="text-xs text-destructive">{t(`errors.${state.error}`)}</span> : null}
          </form>
        ) : (
          <span className="text-xs">
            {t(`users.roles.${p.role as (typeof ALL_ROLES)[number]}`)} · {p.is_active ? t('common.active') : t('common.inactive')}
          </span>
        )}
      </td>
    </tr>
  );
}

export function UsersTable({ profiles, currentUserId, canManage }: Props) {
  const t = useTranslations('Admin');
  const [inviteState, inviteAction, invitePending] = useActionState(inviteUser, IDLE);

  return (
    <div className="grid gap-6">
      <form action={inviteAction} className="grid gap-3 rounded-md border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="grid gap-1">
          <Label htmlFor="inv-email">{t('users.inviteEmail')}</Label>
          <Input id="inv-email" name="email" type="email" required aria-invalid={inviteState.fieldErrors?.['email'] ? 'true' : undefined} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="inv-name">{t('users.name')}</Label>
          <Input id="inv-name" name="fullName" maxLength={120} />
        </div>
        <Button type="submit" disabled={invitePending}>
          {t('users.invite')}
        </Button>
        {inviteState.done ? <p role="status" className="text-sm text-green-700 sm:col-span-3">{t('users.invited')}</p> : null}
        {inviteState.error ? <p role="alert" className="text-sm text-destructive sm:col-span-3">{t(`errors.${inviteState.error}`)}</p> : null}
      </form>
      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t('users.name')}</th>
              <th className="px-3 py-2">{t('users.since')}</th>
              <th className="px-3 py-2">{t('users.role')}</th>
              <th className="px-3 py-2">{t('users.status')}</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <RoleRow key={p.id} p={p} self={p.id === currentUserId} canManage={canManage && p.id !== currentUserId} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
