import { createServerClient } from '@/core/db/createServerClient';
import { appError, err, ok, type Result } from '@/core/errors/result';

export interface CustomerRow {
  readonly id: string;
  readonly type: string;
  readonly full_name: string | null;
  readonly company_title: string | null;
  readonly tax_id: string | null;
  readonly city: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly source: string;
  readonly is_active: boolean;
  readonly anonymized_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CustomerDetail extends CustomerRow {
  readonly tax_office: string | null;
  readonly address: string | null;
  readonly district: string | null;
  readonly contact_person: string | null;
  readonly contact_phone: string | null;
  readonly notes: string | null;
  readonly profile_id: string | null;
  readonly leads: readonly { id: string; ref_no: string; status: string; source: string; created_at: string; quoted_amount: number | null }[];
}

export interface CustomerFilter {
  readonly q?: string;
  readonly type?: 'individual' | 'corporate';
  readonly active?: 'active' | 'passive';
}

export interface MemberChoice {
  readonly id: string;
  readonly label: string;
}

const LIST = 'id, type, full_name, company_title, tax_id, city, email, phone, source, is_active, anonymized_at, created_at, updated_at';
const fail = (message: string) => err(appError('external_service', message, { module: 'customers' }));

/** Liste: arama (ad/ünvan/e-posta/telefon/VKN), tip, aktiflik. RLS: personel. */
export async function listCustomers(filter: CustomerFilter = {}): Promise<Result<CustomerRow[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  let q = client.data.from('customers').select(LIST).order('updated_at', { ascending: false }).limit(300);
  if (filter.type) q = q.eq('type', filter.type);
  if (filter.active) q = q.eq('is_active', filter.active === 'active');
  const term = filter.q?.trim().replace(/[%,]/g, '');
  if (term) q = q.or(`full_name.ilike.%${term}%,company_title.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,tax_id.ilike.%${term}%`);
  const { data, error } = await q;
  if (error) return fail(error.message);
  return ok(data);
}

export async function getCustomer(id: string): Promise<Result<CustomerDetail | null>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const [customer, leads] = await Promise.all([
    client.data.from('customers').select(`${LIST}, tax_office, address, district, contact_person, contact_phone, notes, profile_id`).eq('id', id).maybeSingle(),
    client.data.from('leads').select('id, ref_no, status, source, created_at, quoted_amount').eq('customer_id', id).order('created_at', { ascending: false }).limit(100),
  ]);
  const failure = customer.error ?? leads.error;
  if (failure) return fail(failure.message);
  if (!customer.data) return ok(null);
  return ok({ ...customer.data, leads: (leads.data ?? []).map((l) => ({ ...l, quoted_amount: l.quoted_amount === null ? null : Number(l.quoted_amount) })) });
}

/** Site üyesi bağlantısı (profile_id): yalnız 'member' rolü. */
export async function listMemberChoices(): Promise<Result<MemberChoice[]>> {
  const client = await createServerClient();
  if (!client.ok) return client;
  const { data, error } = await client.data.from('profiles').select('id, full_name').eq('role', 'member').eq('is_active', true).order('full_name').limit(500);
  if (error) return fail(error.message);
  return ok(data.map((p) => ({ id: p.id, label: p.full_name || p.id.slice(0, 8) })));
}
