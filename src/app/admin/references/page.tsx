import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, Thumb, thumbSrc } from '@/modules/admin-shell';
import { ClientForm } from '@/modules/corporate';
import { deleteClient, moveClient } from '@/modules/corporate/actions';
import { listClientsForAdmin, listMediaChoices } from '@/modules/corporate/server';

export default async function ReferencesPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [clients, images] = await Promise.all([listClientsForAdmin(), listMediaChoices('image')]);
  if (!clients.ok || !images.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid max-w-4xl gap-6">
      <AdminPageHeader title={t('corporate.references.title')} lead={t('corporate.references.lead')} />
      <ol className="grid gap-4">
        {clients.data.map((client, i) => (
          <li key={client.id} className="grid gap-2">
            <div className="flex items-center gap-2">
              <Thumb src={thumbSrc(client.thumb)} alt={client.name} />
              <span className="text-sm font-medium">{client.name}</span>
              {!client.is_active ? <span className="rounded bg-muted px-1.5 py-0.5 text-xs">{t('common.inactive')}</span> : null}
              <span className="ml-auto flex gap-1">
                <form action={moveClient}>
                  <input type="hidden" name="id" value={client.id} />
                  <input type="hidden" name="direction" value="up" />
                  <Button type="submit" variant="outline" size="sm" disabled={i === 0} aria-label={`${t('common.up')}: ${client.name}`}>
                    ↑
                  </Button>
                </form>
                <form action={moveClient}>
                  <input type="hidden" name="id" value={client.id} />
                  <input type="hidden" name="direction" value="down" />
                  <Button type="submit" variant="outline" size="sm" disabled={i === clients.data.length - 1} aria-label={`${t('common.down')}: ${client.name}`}>
                    ↓
                  </Button>
                </form>
                <form action={deleteClient}>
                  <input type="hidden" name="id" value={client.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                    {t('common.delete')}
                  </Button>
                </form>
              </span>
            </div>
            <ClientForm client={client} images={images.data} />
          </li>
        ))}
      </ol>
      <section className="grid gap-2">
        <h2 className="text-base font-semibold">{t('corporate.references.new')}</h2>
        <ClientForm client={null} images={images.data} />
      </section>
    </div>
  );
}
