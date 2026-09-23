import 'server-only';
import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

/** Hesabım (K-103): üyenin kendi verileri — RLS (member reads own) + RPC'ler. Oturum istemcisi; service-role YOK. */
export interface MyLeadRow {
  readonly id: string;
  readonly refNo: string;
  readonly status: string;
  readonly source: string;
  readonly subject: string | null;
  readonly createdAt: string;
  readonly itemCount: number;
  readonly quotedAmount: number | null;
  readonly quotedCurrency: string | null;
}
export interface MyLeadDetail extends MyLeadRow {
  readonly message: string | null;
  readonly items: readonly { readonly id: string; readonly productName: string; readonly variantLabel: string | null; readonly stockCode: string | null; readonly quantity: number; readonly unit: string | null; readonly note: string | null; readonly attributes: Readonly<Record<string, string | number>> }[];
  readonly replies: readonly { readonly id: string; readonly subject: string; readonly body: string; readonly direction: 'inbound' | 'outbound'; readonly kind: string; readonly createdAt: string }[];
}
export interface MyCustomer {
  readonly type: 'individual' | 'corporate';
  readonly fullName: string | null;
  readonly companyTitle: string | null;
  readonly taxOffice: string | null;
  readonly taxId: string | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly district: string | null;
  readonly phone: string | null;
}
export interface MyNotification {
  readonly id: string;
  readonly type: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly linkPath: string | null;
  readonly read: boolean;
  readonly createdAt: string;
}

export async function listMyLeads(): Promise<Result<MyLeadRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('leads').select('id, ref_no, status, source, subject, created_at, quoted_amount, quoted_currency, items:lead_items(id)').order('created_at', { ascending: false }).limit(100);
  if (error) return err(appError('external_service', error.message, { module: 'account' }));
  return ok(data.map((l) => ({ id: l.id, refNo: l.ref_no, status: l.status, source: l.source, subject: l.subject, createdAt: l.created_at, itemCount: (l.items ?? []).length, quotedAmount: l.quoted_amount === null ? null : Number(l.quoted_amount), quotedCurrency: l.quoted_currency })));
}
export async function getMyLead(id: string): Promise<Result<MyLeadDetail | null>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [lead, items, replies] = await Promise.all([
    client.data.from('leads').select('id, ref_no, status, source, subject, message, created_at, quoted_amount, quoted_currency').eq('id', id).maybeSingle(),
    client.data.from('lead_items').select('id, product_name_snapshot, variant_label_snapshot, stock_code_snapshot, quantity, unit, note, attributes').eq('lead_id', id).order('sort_order'),
    client.data.from('lead_replies').select('id, subject, body, direction, kind, created_at').eq('lead_id', id).order('created_at', { ascending: true }),
  ]);
  const failure = lead.error ?? items.error ?? replies.error;
  if (failure) return err(appError('external_service', failure.message, { module: 'account' }));
  if (!lead.data) return ok(null);
  const l = lead.data;
  return ok({
    id: l.id, refNo: l.ref_no, status: l.status, source: l.source, subject: l.subject, message: l.message, createdAt: l.created_at, quotedAmount: l.quoted_amount === null ? null : Number(l.quoted_amount), quotedCurrency: l.quoted_currency, itemCount: (items.data ?? []).length,
    items: (items.data ?? []).map((i) => ({ id: i.id, productName: i.product_name_snapshot, variantLabel: i.variant_label_snapshot, stockCode: i.stock_code_snapshot, quantity: Number(i.quantity), unit: i.unit, note: i.note, attributes: (typeof i.attributes === 'object' && i.attributes !== null ? i.attributes : {}) as Record<string, string | number> })),
    replies: (replies.data ?? []).map((r) => ({ id: r.id, subject: r.subject, body: r.body, direction: (r.direction === 'inbound' ? 'inbound' : 'outbound') as 'inbound' | 'outbound', kind: r.kind ?? 'reply', createdAt: r.created_at })),
  });
}
export async function getMyCustomer(): Promise<Result<MyCustomer | null>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.rpc('get_my_customer');
  if (error) return err(appError('external_service', error.message, { module: 'account' }));
  if (!data || typeof data !== 'object') return ok(null);
  const c = data as Record<string, unknown>;
  const s = (k: string) => (typeof c[k] === 'string' && c[k] ? (c[k] as string) : null);
  return ok({ type: c['type'] === 'individual' ? 'individual' : 'corporate', fullName: s('full_name'), companyTitle: s('company_title'), taxOffice: s('tax_office'), taxId: s('tax_id'), address: s('address'), city: s('city'), district: s('district'), phone: s('phone') });
}
export async function listMyNotifications(userId: string): Promise<Result<MyNotification[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('notifications').select('id, type, payload, link_path, read_by, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  if (error) return err(appError('external_service', error.message, { module: 'account' }));
  return ok(data.map((n) => ({ id: n.id, type: n.type, payload: (typeof n.payload === 'object' && n.payload !== null ? n.payload : {}) as Record<string, unknown>, linkPath: n.link_path, read: (n.read_by ?? []).includes(userId), createdAt: n.created_at })));
}
export async function getMySavedBasket(userId: string): Promise<Result<unknown[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('profiles').select('saved_basket').eq('id', userId).maybeSingle();
  if (error) return err(appError('external_service', error.message, { module: 'account' }));
  return ok(Array.isArray(data?.saved_basket) ? (data.saved_basket as unknown[]) : []);
}
/** KVKK dışa aktarım: profil + talepler (kalemler, cevaplar) + konfigürasyonlar + firma bilgisi — yalnız kendi satırları (RLS). */
export async function exportMyData(userId: string): Promise<Result<Record<string, unknown>>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [profile, leads, items, replies, configs, customer] = await Promise.all([
    client.data.from('profiles').select('full_name, phone, preferred_locale, created_at').eq('id', userId).maybeSingle(),
    client.data.from('leads').select('ref_no, status, source, subject, message, created_at, quoted_amount, quoted_currency').order('created_at'),
    client.data.from('lead_items').select('lead_id, product_name_snapshot, variant_label_snapshot, stock_code_snapshot, quantity, unit, note, attributes'),
    client.data.from('lead_replies').select('lead_id, subject, body, direction, kind, created_at'),
    client.data.from('configurations').select('ref_code, name, params, tonnage_kg, status, created_at, updated_at'),
    client.data.rpc('get_my_customer'),
  ]);
  const failure = profile.error ?? leads.error ?? items.error ?? replies.error ?? configs.error;
  if (failure) return err(appError('external_service', failure.message, { module: 'account' }));
  return ok({ exported_at: new Date().toISOString(), profile: profile.data, customer: customer.data ?? null, leads: leads.data, lead_items: items.data, lead_replies: replies.data, configurations: configs.data });
}

export interface MyConfigurationRow {
  readonly id: string;
  readonly refCode: string;
  readonly name: string;
  readonly publicToken: string;
  readonly currentVersion: number;
  readonly tonnageKg: number | null;
  readonly status: string;
  readonly updatedAt: string;
}
export async function listMyConfigurations(): Promise<Result<MyConfigurationRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('configurations').select('id, ref_code, name, public_token, current_version, tonnage_kg, status, updated_at').order('updated_at', { ascending: false }).limit(100);
  if (error) return err(appError('external_service', error.message, { module: 'account' }));
  return ok(data.map((c) => ({ id: c.id, refCode: c.ref_code, name: c.name, publicToken: c.public_token, currentVersion: c.current_version, tonnageKg: c.tonnage_kg === null ? null : Number(c.tonnage_kg), status: c.status, updatedAt: c.updated_at })));
}
/** Aynı e-postayla verilmiş eski anonim talepler üyeye bağlanır (RPC, idempotent; doğrulanmış e-posta şart). */
export async function claimMyLeads(): Promise<number> {
  const client = await createServerClient();
  if (!client.ok) return 0;
  const { data } = await client.data.rpc('claim_my_leads');
  return typeof data === 'number' ? data : 0;
}
