import { cache } from 'react';
import { logger } from '@/core/observability/logger';
import { getCachedPublicSettings } from './data/settingsRepository';
import { DEFAULT_SETTINGS, isModuleEnabled, MODULE_BY_PATH, type ModuleKey, type PublicSettings } from './domain/settings';

export type { CookieBannerText, PublicSettings, ModuleKey } from './domain/settings';
export { MODULE_KEYS, MODULE_BY_PATH, isModuleEnabled } from './domain/settings';
export { EMPTY_PROJECTS_PAGE, EMPTY_SERVICES_PAGE, SERVICE_GROUP_KEYS, itemsToLines, linesToItems, type ServiceGroupKey, type ServicesPageCopy, type ProjectsPageCopy } from './domain/pageCopy';
export { PagesSettingsForm } from './components/admin/PagesSettingsForm';

/** Asla fırlatmaz: veri gelmezse loglar ve varsayılanı döner — header/footer her koşulda render edilir. */
export const getPublicSettings = cache(async (): Promise<PublicSettings> => { // K-104: istek başına bir kez (layout+header+footer ≈ 8 çağrı)
  const result = await getCachedPublicSettings();
  if (result.ok) return result.data;
  logger.warn(result.error.message, { module: 'site-settings', code: result.error.code });
  return DEFAULT_SETTINGS;
});
/** Kill switch kapısı (K-43): route sayfaları kapalı modülde notFound() verir; yalnız bayrak okur, asla fırlatmaz. */
export async function moduleEnabled(key: ModuleKey): Promise<boolean> {
  const settings = await getPublicSettings();
  return isModuleEnabled(settings.modules, key);
}

/** Menü iç bağlantısı gizlensin mi? (kapalı modülün sayfası 404 verir; bağlantı da gizlenir) */
export async function hiddenMenuPaths(): Promise<ReadonlySet<string>> {
  const settings = await getPublicSettings();
  return new Set(Object.entries(MODULE_BY_PATH).filter(([, key]) => !isModuleEnabled(settings.modules, key)).map(([path]) => path));
}
export { SettingsForm } from './components/admin/SettingsForm';
export { ModulesForm } from './components/admin/ModulesForm';
export { CookieBannerForm, MaintenanceForm, SeoSettingsForm } from './components/admin/ExtraSettingsForms';
export { SocialLinksForm } from './components/admin/SocialLinksForm';
