import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { GlossaryForm } from '@/modules/translations';
import { deleteGlossaryTerm } from '@/modules/translations/actions';
import { listGlossary } from '@/modules/translations/server';

/** Terim sözlüğü (01-TRANSLATION): makine çevirisi bu terimleri sabit tutar; marka/ürün adları çevrilmez. */
export default async function GlossaryPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const terms = await listGlossary();
  if (!terms.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('translations.glossary')} lead={t('translations.glossaryLead')} action={{ href: '/admin/translations', label: t('form.back') }} />
      <GlossaryForm term={null} />
      <p className="text-sm text-muted-foreground">{t('translations.termCount', { count: terms.data.length })}</p>
      <ul className="grid gap-2">
        {terms.data.map((term) => (
          <li key={term.id} className="grid gap-2">
            <GlossaryForm term={term} />
            <form action={deleteGlossaryTerm} className="justify-self-end">
              <input type="hidden" name="id" value={term.id} />
              <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                {t('common.delete')}
              </Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
