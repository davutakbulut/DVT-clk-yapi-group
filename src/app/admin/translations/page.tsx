import { getTranslations } from 'next-intl/server';
import NextLink from 'next/link';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { flattenMessages, TranslationsTable, type LabelEntry } from '@/modules/translations';
import { listOverrides } from '@/modules/translations/server';
import en from '../../../../messages/en.json';
import tr from '../../../../messages/tr.json';

/** Arayüz etiketleri (K-40 istisnası): mesaj dosyası varsayılan, ui_translations override. Admin ad alanı hariç (panel metni). */
export default async function TranslationsPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const overrides = await listOverrides();
  if (!overrides.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const trFlat = new Map(flattenMessages(tr as Record<string, unknown>).map((e) => [e.key, e.value]));
  const enFlat = new Map(flattenMessages(en as Record<string, unknown>).map((e) => [e.key, e.value]));
  const entries: LabelEntry[] = [...trFlat.keys()].filter((k) => !k.startsWith('Admin.')).map((k) => ({ key: k, tr: trFlat.get(k) ?? '', en: enFlat.get(k) ?? '' }));
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('translations.title')} lead={t('translations.lead')} />
      <p className="text-sm">
        <NextLink href="/admin/translations/glossary" className="underline underline-offset-4">
          {t('translations.glossary')}
        </NextLink>
        {' · '}
        <NextLink href="/admin/translations/missing" className="underline underline-offset-4">
          {t('translations.missing')}
        </NextLink>
      </p>
      <TranslationsTable entries={entries} overrides={overrides.data} />
    </div>
  );
}
