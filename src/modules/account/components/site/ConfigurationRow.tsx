'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { archiveMyConfiguration, renameMyConfiguration } from '../../actions';
import { AccountForm } from './AccountForm';

interface Props { readonly id: string; readonly name: string; readonly status: string }
/** Satır eylemleri: adı değiştir (satır içi form), arşivle / arşivden çıkar. */
export function ConfigurationRow({ id, name, status }: Props) {
  const t = useTranslations('Account.configurations');
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const archived = status === 'archived';
  const locked = status === 'converted_to_lead' || status === 'converted_to_sale';
  return (
    <div className="account-row-actions">
      {editing ? (
        <AccountForm compact action={renameMyConfiguration} hidden={{ id }} submitLabel={t('save')} refreshOnDone fields={[{ name: 'name', label: t('name'), defaultValue: name, autoComplete: 'off' }]} />
      ) : (
        <button type="button" className="account-link-btn" onClick={() => setEditing(true)}>{t('rename')}</button>
      )}
      {!locked ? (
        <form action={async (fd) => { await archiveMyConfiguration(fd); router.refresh(); }}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="archived" value={archived ? '0' : '1'} />
          <button type="submit" className="account-link-btn">{archived ? t('unarchive') : t('archive')}</button>
        </form>
      ) : null}
    </div>
  );
}
