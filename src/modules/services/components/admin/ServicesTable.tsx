import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge, Thumb, thumbSrc } from '@/modules/admin-shell';
import { deleteService, moveService } from '../../actions';
import type { AdminServiceRow } from '../../data/adminServicesRepository';

/** Liste: ad · slug · durum · öne çıkan · sıra (↑↓ tek RPC) · düzenle/sil. Sunucu bileşeni, JS'siz çalışır. */
export async function ServicesTable({ rows }: { readonly rows: readonly AdminServiceRow[] }) {
  const t = await getTranslations('Admin');
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{t('common.empty')}</p>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">
            <span className="sr-only">{t('form.image')}</span>
          </TableHead>
          <TableHead>{t('services.name')}</TableHead>
          <TableHead>{t('services.slug')}</TableHead>
          <TableHead>{t('form.status')}</TableHead>
          <TableHead>{t('form.order')}</TableHead>
          <TableHead className="text-right">{t('common.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={row.id}>
            <TableCell className="w-14 py-1">
              <Thumb src={thumbSrc(row.thumb)} alt={row.title['tr'] || t('form.untitled')} />
            </TableCell>
            <TableCell className="font-medium">
              <NextLink href={`/admin/services/${row.id}`} className="underline-offset-4 hover:underline">
                {row.title['tr'] || t('form.untitled')}
              </NextLink>
              {row.is_featured ? <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">{t('form.featured')}</span> : null}
            </TableCell>
            <TableCell className="font-mono text-xs">{row.slug['tr']}</TableCell>
            <TableCell>
              <StatusBadge status={row.status} locales={row.published_locales} />
            </TableCell>
            <TableCell>
              <span className="flex gap-1">
                <form action={moveService}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="direction" value="up" />
                  <Button type="submit" variant="outline" size="sm" disabled={i === 0} aria-label={`${t('common.up')}: ${row.title['tr'] ?? ''}`}>
                    ↑
                  </Button>
                </form>
                <form action={moveService}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="direction" value="down" />
                  <Button type="submit" variant="outline" size="sm" disabled={i === rows.length - 1} aria-label={`${t('common.down')}: ${row.title['tr'] ?? ''}`}>
                    ↓
                  </Button>
                </form>
              </span>
            </TableCell>
            <TableCell className="text-right">
              <span className="inline-flex gap-2">
                <NextLink href={`/admin/services/${row.id}`} className="text-sm underline underline-offset-4">
                  {t('common.edit')}
                </NextLink>
                <form action={deleteService}>
                  <input type="hidden" name="id" value={row.id} />
                  <Button type="submit" variant="ghost" size="sm" className="text-destructive">
                    {t('common.delete')}
                  </Button>
                </form>
              </span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
