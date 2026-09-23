import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';
import { isLocalizedText } from '@/lib/localized';
import { formatOptions, readOptions } from '../domain/leadSchema';

export interface LeadRow {
  readonly id: string;
  readonly ref_no: string;
  readonly source: string;
  readonly status: string;
  readonly full_name: string;
  readonly company: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly locale: string;
  readonly created_at: string;
  readonly serviceTitle: string;
  readonly assignedName: string;
}

export interface LeadDetail extends LeadRow {
  readonly city: string | null;
  readonly subject: string | null;
  readonly message: string | null;
  readonly form_data: Readonly<Record<string, unknown>>;
  readonly service_id: string | null;
  readonly assigned_to: string | null;
  readonly customer_id: string | null;
  /** Faz 28: konfigüratörden gelen talep. */
  readonly configuration_id: string | null;
  readonly quoted_amount: number | null;
  readonly quoted_currency: string | null;
  readonly lost_reason: string | null;
  readonly consent_kvkk_at: string;
  readonly consent_marketing: boolean;
  readonly page_url: string | null;
  readonly utm: Readonly<Record<string, unknown>>;
  readonly notes: readonly { id: string; body: string; created_at: string; authorName: string; is_pinned: boolean }[];
  readonly replies: readonly { id: string; subject: string; body: string; created_at: string; sent_at: string | null; authorName: string }[];
  readonly mails: readonly { id: string; template_key: string | null; to_email: string; status: string; provider: string; error: string | null; created_at: string }[];
  readonly items: readonly { id: string; product_name_snapshot: string; variant_label_snapshot: string | null; stock_code_snapshot: string | null; quantity: number; unit: string | null; note: string | null; attributes: unknown }[];
}

export interface StaffChoice {
  readonly id: string;
  readonly label: string;
}

const name = (p: { full_name?: string | null } | null | undefined) => p?.full_name || '';
const title = (s: { title?: unknown } | null | undefined) => (isLocalizedText(s?.title) ? (s!.title['tr'] ?? '') : '');

export async function listLeadsForAdmin(status: string | null): Promise<Result<LeadRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  let query = client.data.from('leads').select('id, ref_no, source, status, full_name, company, email, phone, locale, created_at, service:services(title), assignee:profiles!leads_assigned_to_fkey(full_name)').order('created_at', { ascending: false }).limit(300);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return err(appError('external_service', error.message, { module: 'leads' }));
  return ok(data.map((r) => ({ ...r, serviceTitle: title(r.service as { title?: unknown } | null), assignedName: name(r.assignee as { full_name?: string | null } | null) })));
}

export async function getLeadForAdmin(id: string): Promise<Result<LeadDetail | null>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [lead, notes, replies, mails, items] = await Promise.all([
    client.data.from('leads').select('*, service:services(title), assignee:profiles!leads_assigned_to_fkey(full_name)').eq('id', id).maybeSingle(),
    client.data.from('lead_notes').select('id, body, created_at, is_pinned, author:profiles(full_name)').eq('lead_id', id).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
    client.data.from('lead_replies').select('id, subject, body, created_at, sent_at, author:profiles(full_name)').eq('lead_id', id).order('created_at', { ascending: false }),
    client.data.from('email_logs').select('id, template_key, to_email, status, provider, error, created_at').eq('related_type', 'lead').eq('related_id', id).order('created_at', { ascending: false }),
    client.data.from('lead_items').select('id, product_name_snapshot, variant_label_snapshot, stock_code_snapshot, quantity, unit, note, attributes').eq('lead_id', id).order('sort_order'),
  ]);
  const failure = lead.error ?? notes.error ?? replies.error;
  if (failure) return err(appError('external_service', failure.message, { module: 'leads' }));
  if (!lead.data) return ok(null);
  const r = lead.data;
  return ok({
    ...r,
    quoted_amount: r.quoted_amount === null ? null : Number(r.quoted_amount),
    form_data: (r.form_data ?? {}) as Record<string, unknown>,
    utm: (r.utm ?? {}) as Record<string, unknown>,
    serviceTitle: title(r.service as { title?: unknown } | null),
    assignedName: name(r.assignee as { full_name?: string | null } | null),
    notes: (notes.data ?? []).map((n) => ({ id: n.id, body: n.body, created_at: n.created_at, is_pinned: n.is_pinned, authorName: name(n.author as { full_name?: string | null } | null) })),
    replies: (replies.data ?? []).map((n) => ({ id: n.id, subject: n.subject, body: n.body, created_at: n.created_at, sent_at: n.sent_at, authorName: name(n.author as { full_name?: string | null } | null) })),
    mails: mails.data ?? [],
    items: (items.data ?? []).map((i) => ({ ...i, quantity: Number(i.quantity) })),
  });
}

export async function listStaffChoices(): Promise<Result<StaffChoice[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('profiles').select('id, full_name, role').in('role', ['super_admin', 'admin', 'sales']).eq('is_active', true).order('full_name');
  if (error) return err(appError('external_service', error.message, { module: 'leads' }));
  return ok(data.map((p) => ({ id: p.id, label: p.full_name || p.id })));
}

export async function getQuoteFormOptionsText(): Promise<Result<{ projectTypes: string; budgets: string; timelines: string }>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('site_settings').select('value').eq('key', 'quote_form.options').maybeSingle();
  if (error) return err(appError('external_service', error.message, { module: 'leads' }));
  const o = readOptions(data?.value);
  return ok({ projectTypes: formatOptions(o.projectTypes), budgets: formatOptions(o.budgets), timelines: formatOptions(o.timelines) });
}

export interface MailTemplateRow {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly subject: Readonly<Record<string, string>>;
  readonly body: Readonly<Record<string, string>>;
  readonly variables: readonly string[];
  readonly is_active: boolean;
}

export interface MailOverview {
  readonly templates: readonly MailTemplateRow[];
  readonly pending: number;
  readonly failed: number;
  readonly sentToday: number;
  readonly heartbeat: { last_run_at: string | null; last_status: string | null; last_error: string | null; stale: boolean } | null;
  readonly logs: readonly { id: string; template_key: string | null; to_email: string; subject: string; provider: string; status: string; error: string | null; created_at: string }[];
}

export async function getMailOverview(): Promise<Result<MailOverview>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const [templates, pending, failed, sentToday, hb, logs] = await Promise.all([
    client.data.from('email_templates').select('id, key, name, subject, body, variables, is_active').order('key'),
    client.data.from('email_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    client.data.from('email_queue').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    client.data.from('email_logs').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('created_at', dayStart.toISOString()),
    client.data.from('cron_heartbeats').select('last_run_at, last_status, last_error, expected_interval_seconds').eq('job_key', 'mail_queue').maybeSingle(),
    client.data.from('email_logs').select('id, template_key, to_email, subject, provider, status, error, created_at').order('created_at', { ascending: false }).limit(50),
  ]);
  if (templates.error) return err(appError('external_service', templates.error.message, { module: 'leads' }));
  const h = hb.data;
  const stale = h ? !h.last_run_at || Date.now() - new Date(h.last_run_at).getTime() > h.expected_interval_seconds * 2000 || h.last_status === 'error' : true;
  return ok({
    templates: templates.data.map((t) => ({ ...t, subject: (t.subject ?? {}) as Record<string, string>, body: (t.body ?? {}) as Record<string, string>, variables: Array.isArray(t.variables) ? (t.variables as string[]) : [] })),
    pending: pending.count ?? 0,
    failed: failed.count ?? 0,
    sentToday: sentToday.count ?? 0,
    heartbeat: h ? { last_run_at: h.last_run_at, last_status: h.last_status, last_error: h.last_error, stale } : null,
    logs: logs.data ?? [],
  });
}
