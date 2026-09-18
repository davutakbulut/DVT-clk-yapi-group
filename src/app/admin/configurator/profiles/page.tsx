import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { SteelProfileForm } from '@/modules/configurator';
import { deleteSteelProfile } from '@/modules/configurator/actions';
import { listSteelProfilesForAdmin } from '@/modules/configurator/server';

/** Profil kataloğu: metrajın TEK ağırlık kaynağı (0008 kg_per_m). Tohum yok (K-55) — ürün sahibi girer. Yalnız admin. */
export default async function SteelProfilesPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const rows = await listSteelProfilesForAdmin();
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('steelProfiles.title')} lead={t('steelProfiles.lead')} action={{ href: '/admin/pricing/materials', label: t('materials.title') }} />
      <section className="grid gap-2">
        <h2 className="text-sm font-medium">{t('steelProfiles.new')}</h2>
        <SteelProfileForm profile={null} />
      </section>
      <section className="grid gap-3">
        <h2 className="text-sm font-medium">{t('steelProfiles.count', { count: rows.data.length })}</h2>
        {rows.data.length === 0 ? <p className="text-sm text-muted-foreground">{t('steelProfiles.empty')}</p> : null}
        {rows.data.map((p) => (
          <details key={p.id} className="rounded-md border">
            <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-2 text-sm">
              <span className="font-mono">{p.code}</span>
              <span className="text-muted-foreground">{p.family}</span>
              {p.usage ? <span className="text-xs text-muted-foreground">{t(`steelProfiles.usages.${p.usage as 'column'}`)}</span> : null}
              {!p.is_active ? <span className="text-xs text-muted-foreground">{t('steelProfiles.inactive')}</span> : null}
              <span className="ml-auto tabular-nums">{p.kg_per_m} kg/m</span>
            </summary>
            <div className="grid gap-3 border-t p-4">
              <SteelProfileForm profile={p} />
              <form action={deleteSteelProfile}>
                <input type="hidden" name="id" value={p.id} />
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
