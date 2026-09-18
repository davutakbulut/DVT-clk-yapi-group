import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { DEFAULT_RULES, getCachedRules, RulesForm } from '@/modules/configurator';
import { listRuleChoices } from '@/modules/configurator/server';

/** Konfigüratör kuralları (yalnız admin): limitler, sistem eşiği, işçilik, profil/fiyat eşlemeleri; profil ve fiyat kataloğuna bağlantı. */
export default async function ConfiguratorRulesPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [rules, choices] = await Promise.all([getCachedRules(), listRuleChoices()]);
  if (!choices.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={t('configuratorRules.title')} lead={t('configuratorRules.lead')} action={{ href: '/admin/configurator', label: t('configurations.title') }} />
      <p className="flex flex-wrap gap-4 text-sm">
        <NextLink href="/admin/configurator/profiles" className="underline underline-offset-4">
          {t('steelProfiles.title')}
        </NextLink>
        <NextLink href="/admin/pricing/materials" className="underline underline-offset-4">
          {t('materials.title')}
        </NextLink>
      </p>
      <RulesForm rules={rules.ok ? rules.data : DEFAULT_RULES} choices={choices.data} />
    </div>
  );
}
