import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { moderateComment } from '@/modules/blog/actions';
import { listCommentsForAdmin } from '@/modules/blog/server';

const FILTERS = ['pending', 'approved', 'rejected', 'spam'] as const;

export default async function AdminCommentsPage({ searchParams }: { readonly searchParams: Promise<{ status?: string }> }) {
  const [t, gate, { status }] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin', 'editor']), searchParams]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const filter = FILTERS.find((f) => f === status) ?? null;
  const rows = await listCommentsForAdmin(filter);
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;

  const action = (id: string, next: (typeof FILTERS)[number], label: string) => (
    <form action={moderateComment}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next} />
      <Button type="submit" variant="outline" size="sm">
        {label}
      </Button>
    </form>
  );

  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('comments.title')} lead={t('comments.lead')} />
      <nav className="flex flex-wrap gap-2 text-sm" aria-label={t('comments.status')}>
        <NextLink href="/admin/blog/comments" className={`rounded-md border px-3 py-1 ${!filter ? 'bg-muted font-medium' : ''}`}>
          {t('comments.all')}
        </NextLink>
        {FILTERS.map((f) => (
          <NextLink key={f} href={`/admin/blog/comments?status=${f}`} className={`rounded-md border px-3 py-1 ${filter === f ? 'bg-muted font-medium' : ''}`}>
            {t(`comments.${f}`)}
          </NextLink>
        ))}
      </nav>
      <p className="text-sm text-muted-foreground">{t('comments.count', { count: rows.data.length })}</p>
      {rows.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('comments.author')}</TableHead>
              <TableHead>{t('comments.post')}</TableHead>
              <TableHead>{t('comments.status')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.data.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="align-top">
                  <p className="font-medium">
                    {c.author_name} {c.author_email ? <span className="text-xs text-muted-foreground">({c.author_email})</span> : null}
                  </p>
                  <p className="max-w-md whitespace-pre-wrap text-sm">{c.body}</p>
                  <p className="text-xs text-muted-foreground">{c.created_at.slice(0, 16).replace('T', ' ')}</p>
                </TableCell>
                <TableCell className="align-top text-sm">{c.postTitle}</TableCell>
                <TableCell className="align-top text-sm">{t(`comments.${c.status as (typeof FILTERS)[number]}`)}</TableCell>
                <TableCell className="align-top">
                  <span className="flex justify-end gap-1">
                    {c.status !== 'approved' ? action(c.id, 'approved', t('comments.approve')) : null}
                    {c.status !== 'rejected' ? action(c.id, 'rejected', t('comments.reject')) : null}
                    {c.status !== 'spam' ? action(c.id, 'spam', t('comments.markSpam')) : null}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
