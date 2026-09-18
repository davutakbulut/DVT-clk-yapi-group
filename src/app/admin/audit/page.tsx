import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminPageHeader } from '@/modules/admin-shell';
import { changedFields, listAuditLogs } from '@/modules/audit/server';

/** Denetim kaydı (0001): kim, ne zaman, neyi değiştirdi; yalnız-ekleme, silinemez. Süzgeç: tablo (?table=). */
export default async function AuditPage({ searchParams }: { readonly searchParams: Promise<{ table?: string }> }) {
  const [t, gate, sp] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const table = sp.table && /^[a-z_]+$/.test(sp.table) ? sp.table : undefined;
  const result = await listAuditLogs({ table });
  if (!result.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  const { rows, tables } = result.data;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('audit.title')} lead={t('audit.lead')} />
      <form method="get" className="flex flex-wrap items-end gap-2 text-sm">
        <label className="grid gap-1">
          {t('audit.table')}
          <select name="table" defaultValue={table ?? ''} className="h-9 rounded-md border bg-background px-2 text-sm">
            <option value="">{t('common.none')}</option>
            {tables.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-9 rounded-md border px-3">
          {t('audit.filter')}
        </button>
      </form>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('audit.when')}</TableHead>
              <TableHead>{t('audit.actor')}</TableHead>
              <TableHead>{t('audit.action')}</TableHead>
              <TableHead>{t('audit.table')}</TableHead>
              <TableHead>{t('audit.changes')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const diff = changedFields(r);
              return (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{r.created_at.slice(0, 19).replace('T', ' ')}</TableCell>
                  <TableCell className="text-xs">{r.actorName}</TableCell>
                  <TableCell className="font-mono text-xs">{r.action}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {r.table_name}
                    {r.row_id ? <span className="block text-muted-foreground">{r.row_id.slice(0, 8)}…</span> : null}
                  </TableCell>
                  <TableCell className="text-xs">
                    {diff.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <details>
                        <summary className="cursor-pointer">{t('audit.fieldCount', { count: diff.length })}</summary>
                        <ul className="mt-1 grid gap-1">
                          {diff.slice(0, 20).map((d) => (
                            <li key={d.key} className="font-mono">
                              <span className="font-semibold">{d.key}</span>: <span className="text-muted-foreground line-through">{JSON.stringify(d.from ?? null).slice(0, 80)}</span> → {JSON.stringify(d.to ?? null).slice(0, 80)}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
