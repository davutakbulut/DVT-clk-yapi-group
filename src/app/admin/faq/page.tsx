import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, StatusBadge } from '@/modules/admin-shell';
import { FaqForm } from '@/modules/corporate';
import { deleteFaq, moveFaq } from '@/modules/corporate/actions';
import { listFaqEntityChoices, listFaqsForAdmin } from '@/modules/corporate/server';

export default async function FaqAdminPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [faqs, entities] = await Promise.all([listFaqsForAdmin(), listFaqEntityChoices()]);
  if (!faqs.ok || !entities.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={t('corporate.faq.title')} lead={t('corporate.faq.lead')} />
      <ol className="grid gap-4">
        {faqs.data.map((faq, i) => (
          <li key={faq.id} className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={faq.status} locales={faq.published_locales} />
              <span className="text-xs text-muted-foreground">{faq.entityLabel || t('corporate.faq.general')}</span>
              <span className="ml-auto flex gap-1">
                <form action={moveFaq}>
                  <input type="hidden" name="id" value={faq.id} />
                  <input type="hidden" name="direction" value="up" />
                  <Button type="submit" variant="outline" size="sm" disabled={i === 0} aria-label={`${t('common.up')}: ${faq.question['tr'] ?? ''}`}>
                    ↑
                  </Button>
                </form>
                <form action={moveFaq}>
                  <input type="hidden" name="id" value={faq.id} />
                  <input type="hidden" name="direction" value="down" />
                  <Button type="submit" variant="outline" size="sm" disabled={i === faqs.data.length - 1} aria-label={`${t('common.down')}: ${faq.question['tr'] ?? ''}`}>
                    ↓
                  </Button>
                </form>
                <form action={deleteFaq}>
                  <input type="hidden" name="id" value={faq.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                    {t('common.delete')}
                  </Button>
                </form>
              </span>
            </div>
            <FaqForm faq={faq} entities={entities.data} />
          </li>
        ))}
      </ol>
      <section className="grid gap-2">
        <h2 className="text-base font-semibold">{t('corporate.faq.new')}</h2>
        <FaqForm faq={null} entities={entities.data} />
      </section>
    </div>
  );
}
