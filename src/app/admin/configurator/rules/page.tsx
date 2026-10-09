import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { DEFAULT_RULES, EMPTY_ENGINE_RULE, ENGINE_KINDS, EngineRuleForm, getCachedCatalogRows, getCachedEngineRules, getCachedRules, RulesForm } from '@/modules/configurator';
import { listRuleChoices } from '@/modules/configurator/server';

/** Konfigüratör ayarları (yalnız admin): fiyat/işçilik + her tür için alan sınırları, varsayılan profiller, notlar (K-110). */
export default async function ConfiguratorRulesPage({ searchParams }: { readonly searchParams: Promise<{ kind?: string }> }) {
  const [t, gate, sp] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [rules, engineRules, catalog, choices] = await Promise.all([getCachedRules(), getCachedEngineRules(), getCachedCatalogRows(), listRuleChoices()]);
  if (!choices.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const kind = ENGINE_KINDS.find((k) => k === sp.kind) ?? 'hall';
  return (
    <div className="grid max-w-5xl gap-6">
      <AdminPageHeader title={t('configuratorRules.title')} lead={t('configuratorRules.lead')} action={{ href: '/admin/configurator', label: t('configurations.title') }} />
      <p className="flex flex-wrap gap-4 text-sm">
        <NextLink href="/admin/configurator/profiles" className="underline underline-offset-4">{t('steelProfiles.title')}</NextLink>
        <NextLink href="/admin/pricing/materials" className="underline underline-offset-4">{t('materials.title')}</NextLink>
      </p>
      <RulesForm rules={rules.ok ? rules.data : DEFAULT_RULES} choices={choices.data} />
      <nav className="flex flex-wrap gap-2 border-t pt-6" aria-label={t('configuratorRules.engine.kinds')}>
        {ENGINE_KINDS.map((k) => (
          <NextLink key={k} href={`/admin/configurator/rules?kind=${k}`} aria-current={k === kind ? 'page' : undefined} className={`rounded-full border px-3 py-1 text-sm ${k === kind ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>{t(`configuratorRules.kinds.${k}`)}</NextLink>
        ))}
      </nav>
      <h2 className="text-base font-semibold">{t(`configuratorRules.kinds.${kind}`)}</h2>
      <EngineRuleForm key={kind} kind={kind} rule={engineRules.ok ? engineRules.data[kind] : EMPTY_ENGINE_RULE} catalog={catalog.ok ? catalog.data : []} />
    </div>
  );
}
