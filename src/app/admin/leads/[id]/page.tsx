import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { requireRole } from '@/core/auth';
import { AdminPageHeader, FormSection } from '@/modules/admin-shell';
import { LeadNoteForm, LeadReplyForm, LeadStatusForm } from '@/modules/leads';
import { getLeadForAdmin, listStaffChoices } from '@/modules/leads/server';

export default async function AdminLeadDetailPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const [t, gate, { id }] = await Promise.all([getTranslations('Admin'), requireRole(), params]);
  if (!gate.ok) return <p role="alert">{t('errors.forbidden')}</p>;
  const [lead, staff] = await Promise.all([getLeadForAdmin(id), listStaffChoices()]);
  if (!lead.ok) return <p role="alert">{t('errors.unexpected')}</p>;
  if (!lead.data) notFound();
  const l = lead.data;
  const canWrite = ['super_admin', 'admin', 'sales'].includes(gate.data.role);
  const formEntries = Object.entries(l.form_data).filter(([, v]) => v !== null && v !== '' && v !== undefined);

  return (
    <div className="grid gap-6">
      <AdminPageHeader title={`${l.ref_no} · ${l.full_name}`} lead={`${t(`leads.sources.${l.source as 'manual'}`)} · ${l.created_at.slice(0, 16).replace('T', ' ')}`} action={{ href: '/admin/leads', label: t('form.back') }} />
      <div className="grid gap-6 lg:grid-cols-2">
        <FormSection title={t('leads.contact')}>
          <dl className="grid gap-2 text-sm">
            {[
              [t('leads.name'), [l.full_name, l.company].filter(Boolean).join(' · ')],
              [t('settings.email'), l.email],
              [t('settings.phone'), l.phone],
              ['Şehir', l.city], // static-ok: admin etiketi, messages'a taşınacak alan sayısı az
              [t('leads.service'), l.serviceTitle],
              [t('leads.page'), l.page_url],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="grid grid-cols-[140px_1fr] gap-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="break-words">{v}</dd>
                </div>
              ))}
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <dt className="text-muted-foreground">{t('leads.consents')}</dt>
              <dd>
                {t('leads.kvkk')}: {l.consent_kvkk_at.slice(0, 16).replace('T', ' ')} · {t('leads.marketing')}: {l.consent_marketing ? t('common.yes') : t('common.no')}
              </dd>
            </div>
          </dl>
          {l.subject || l.message ? (
            <div className="grid gap-1 border-t pt-3 text-sm">
              <p className="font-medium">{l.subject ?? t('leads.message')}</p>
              <p className="whitespace-pre-wrap">{l.message}</p>
            </div>
          ) : null}
          {l.items.length > 0 ? (
            <div className="grid gap-1 border-t pt-3 text-sm">
              <p className="font-medium">{t('leads.items')}</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-1">{t('leads.itemProduct')}</th>
                    <th className="py-1">{t('leads.itemVariant')}</th>
                    <th className="py-1">{t('leads.itemQuantity')}</th>
                    <th className="py-1">{t('leads.itemNote')}</th>
                  </tr>
                </thead>
                <tbody>
                  {l.items.map((i) => (
                    <tr key={i.id} className="border-t">
                      <td className="py-1">{i.product_name_snapshot}</td>
                      <td className="py-1">
                        {i.variant_label_snapshot ?? '—'} {i.stock_code_snapshot ? <span className="font-mono text-xs text-muted-foreground">{i.stock_code_snapshot}</span> : null}
                      </td>
                      <td className="py-1">
                        {i.quantity} {i.unit ?? ''}
                      </td>
                      <td className="py-1">{i.note ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {formEntries.length > 0 ? (
            <dl className="grid gap-1 border-t pt-3 text-sm">
              <p className="font-medium">{t('leads.formData')}</p>
              {formEntries.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[140px_1fr] gap-2">
                  <dt className="font-mono text-xs text-muted-foreground">{k}</dt>
                  <dd>{String(v)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </FormSection>
        <FormSection title={t('leads.status')}>{canWrite ? <LeadStatusForm lead={l} staff={staff.ok ? staff.data : []} /> : <p className="text-sm">{t(`leads.statuses.${l.status as 'new'}`)}</p>}</FormSection>
        <FormSection title={t('leads.notes')}>
          {l.notes.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.empty')}</p> : null}
          <ul className="grid gap-3">
            {l.notes.map((n) => (
              <li key={n.id} className={`rounded-md border p-3 text-sm ${n.is_pinned ? 'border-primary' : ''}`}>
                <p className="whitespace-pre-wrap">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.authorName} · {n.created_at.slice(0, 16).replace('T', ' ')}
                </p>
              </li>
            ))}
          </ul>
          {canWrite ? <LeadNoteForm leadId={l.id} /> : null}
        </FormSection>
        <FormSection title={t('leads.replies')}>
          {l.replies.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.empty')}</p> : null}
          <ul className="grid gap-3">
            {l.replies.map((r) => (
              <li key={r.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{r.subject}</p>
                <p className="whitespace-pre-wrap">{r.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.authorName} · {r.created_at.slice(0, 16).replace('T', ' ')} · {r.sent_at ? t('leads.sent') : t('leads.queued')}
                </p>
              </li>
            ))}
          </ul>
          {canWrite ? <LeadReplyForm lead={l} /> : null}
          {l.mails.length > 0 ? (
            <ul className="grid gap-1 border-t pt-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">{t('leads.mails')}</p>
              {l.mails.map((m) => (
                <li key={m.id}>
                  {m.created_at.slice(0, 16).replace('T', ' ')} · {m.template_key} → {m.to_email} · {m.provider} · {m.status}
                  {m.error ? ` · ${m.error}` : ''}
                </li>
              ))}
            </ul>
          ) : null}
        </FormSection>
      </div>
    </div>
  );
}
