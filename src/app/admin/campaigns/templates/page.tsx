import NextLink from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { requireRole } from '@/core/auth';
import { AdminPageHeader } from '@/modules/admin-shell';
import { listCampaignTemplates } from '@/modules/mail-campaigns/server';

/** Hazır e-posta şablonları (K-109): kampanya taslağındaki seçicinin kaynağı. Yalnız super_admin/admin. */
export default async function CampaignTemplatesPage() {
  const [t, gate] = await Promise.all([getTranslations('Admin'), requireRole(['super_admin', 'admin'])]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const rows = await listCampaignTemplates();
  if (!rows.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  return (
    <div className="grid gap-6">
      <AdminPageHeader title={t('campaigns.templates.title')} lead={t('campaigns.templates.lead')} action={{ href: '/admin/campaigns/templates/new', label: t('campaigns.templates.new') }} />
      <p className="text-sm"><NextLink href="/admin/campaigns" className="underline underline-offset-4">{t('campaigns.title')}</NextLink></p>
      {rows.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('campaigns.templates.empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('campaigns.templates.name')}</TableHead>
              <TableHead>{t('campaigns.templates.category')}</TableHead>
              <TableHead>{t('campaigns.subject')}</TableHead>
              <TableHead>{t('campaigns.templates.languages')}</TableHead>
              <TableHead>{t('form.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  <NextLink href={`/admin/campaigns/templates/${r.id}`} className="underline-offset-4 hover:underline">{r.name}</NextLink>
                  {r.description ? <span className="block max-w-md truncate text-xs text-muted-foreground">{r.description}</span> : null}
                </TableCell>
                <TableCell className="text-xs">{t(`campaigns.templates.categories.${r.category}`)}</TableCell>
                <TableCell className="max-w-xs truncate text-xs">{r.subject.tr}</TableCell>
                <TableCell className="font-mono text-xs uppercase">{r.body.en ? 'tr/en' : 'tr'}</TableCell>
                <TableCell className="text-xs">{r.is_active ? t('common.active') : t('common.inactive')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
