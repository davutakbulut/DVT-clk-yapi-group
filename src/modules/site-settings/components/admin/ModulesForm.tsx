'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { IDLE } from '@/lib/formState';
import { ActionMessage, FormSection } from '@/modules/admin-shell';
import { saveModules } from '../../actions';
import { isModuleEnabled, MODULE_KEYS, type PublicSettings } from '../../domain/settings';

/** Kill switch (K-43): canlıda sorun çıkaran modül dağıtım yapmadan kapatılır — sayfası 404, menü bağlantısı gizli, ana sayfa bölümü yok. */
export function ModulesForm({ settings }: { readonly settings: PublicSettings }) {
  const t = useTranslations('Admin');
  const [state, action, pending] = useActionState(saveModules, IDLE);
  return (
    <form action={action} className="grid gap-6">
      <ActionMessage state={state} />
      <FormSection title={t('modules.title')}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {MODULE_KEYS.map((key) => (
            <li key={key}>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={`m_${key}`} defaultChecked={isModuleEnabled(settings.modules, key)} /> {t(`modules.keys.${key}`)}
              </label>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">{t('modules.hint')}</p>
      </FormSection>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
}
