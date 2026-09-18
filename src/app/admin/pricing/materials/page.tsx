import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { MaterialPriceForm } from '@/modules/pricing';
import { deleteMaterialPrice } from '@/modules/pricing/actions';
import { listMaterialPricesForAdmin } from '@/modules/pricing/server';

/** Fiyatın TEK kaynağı (0008): yalnız admin yazar; her değişiklik geçmişe düşer, bağlı rehberler tazelenir (0026). Faz 29 konfigüratör de buradan okur. */
export default async function MaterialPricesPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const rows = await listMaterialPricesForAdmin();
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('materials.title')} lead={t('materials.lead')} action={{ href: '/admin/pricing', label: t('form.back') }} />
      <section className="grid gap-2">
        <h2 className="text-sm font-medium">{t('materials.new')}</h2>
        <MaterialPriceForm material={null} />
      </section>
      <section className="grid gap-3">
        <h2 className="text-sm font-medium">{t('materials.count', { count: rows.data.length })}</h2>
        {rows.data.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.empty')}</p> : null}
        {rows.data.map((m) => (
          <details key={m.id} className="rounded-md border">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-2 text-sm">
              <span className="font-mono">{m.code}</span>
              <span className="font-medium">{m.name['tr']}</span>
              <span className="text-muted-foreground">{t(`materials.categories.${m.category as 'steel'}`)}</span>
              <span className="ml-auto tabular-nums">
                {m.unit_price} {m.currency}/{m.unit}
              </span>
              <span className="text-xs text-muted-foreground">
                {m.valid_from} · {t('materials.history', { count: m.historyCount })}
              </span>
            </summary>
            <div className="grid gap-3 border-t p-4">
              <MaterialPriceForm material={m} />
              <form action={deleteMaterialPrice}>
                <input type="hidden" name="id" value={m.id} />
                <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                  {t('common.delete')}
                </Button>
              </form>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
