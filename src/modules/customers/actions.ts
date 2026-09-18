'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireRole } from '@/core/auth';
import { checkbox, dbErrorKey } from '@/core/content/adminContent';
import { createServerClient } from '@/core/db/createServerClient';
import { logger } from '@/core/observability/logger';
import { DONE, failed, type ActionState } from '@/lib/formState';
import { customerSchema } from './domain/customerSchema';

const WRITERS = ['super_admin', 'admin', 'sales'] as const;
const ADMINS = ['super_admin', 'admin'] as const;
const ADMIN_PATH = '/admin/customers';

export async function saveCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const gate = await requireRole(WRITERS);
  if (!gate.ok) return failed('forbidden');
  const parsed = customerSchema.safeParse({ ...Object.fromEntries(formData), isActive: checkbox(formData, 'isActive') });
  if (!parsed.success) return failed('validation', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? 'form'), 'validation'])));
  const v = parsed.data;
  const client = await createServerClient();
  if (!client.ok) return failed('notConfigured');
  const row = {
    type: v.type,
    full_name: v.fullName || null,
    company_title: v.companyTitle || null,
    tax_office: v.taxOffice || null,
    tax_id: v.taxId || null,
    address: v.address || null,
    city: v.city || null,
    district: v.district || null,
    email: v.email ? v.email.toLocaleLowerCase('en') : null,
    phone: v.phone || null,
    contact_person: v.contactPerson || null,
    contact_phone: v.contactPhone || null,
    notes: v.notes || null,
    source: v.source,
    profile_id: v.profileId || null,
    is_active: v.isActive,
  };
  let id = v.id || '';
  if (id) {
    const { error } = await client.data.from('customers').update(row).eq('id', id);
    if (error) return fail(error);
  } else {
    const { data, error } = await client.data.from('customers').insert(row).select('id').single();
    if (error) return fail(error);
    id = data.id;
  }
  revalidatePath(ADMIN_PATH);
  revalidatePath(`${ADMIN_PATH}/${id}`);
  if (!v.id) redirect(`${ADMIN_PATH}/${id}`);
  return DONE;
}

function fail(error: { code?: string; message: string }): ActionState {
  logger.error('Musteri kaydedilemedi', { module: 'customers', code: error.code, message: error.message });
  return failed(dbErrorKey(error.code));
}

/** Talep detayından tek tık: RPC (invoker) müşteriyi açar ve talebi bağlar; var olan müşteri varsa ona gider. */
export async function convertLeadToCustomer(formData: FormData): Promise<void> {
  const gate = await requireRole(WRITERS);
  if (!gate.ok) return;
  const leadId = z.string().uuid().safeParse(formData.get('leadId'));
  if (!leadId.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { data, error } = await client.data.rpc('create_customer_from_lead', { p_lead_id: leadId.data });
  if (error || !data) {
    logger.error('Talep musteriye donusturulemedi', { module: 'customers', code: error?.code, message: error?.message });
    return;
  }
  revalidatePath(`/admin/leads/${leadId.data}`);
  revalidatePath(ADMIN_PATH);
  redirect(`${ADMIN_PATH}/${data}`);
}

/** K-34: geri alınamaz; form "onaylıyorum" kutusu ister. Yalnız admin (RPC de denetler). */
export async function anonymizeCustomer(formData: FormData): Promise<void> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success || formData.get('confirm') !== 'on') return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.rpc('anonymize_customer', { p_id: id.data });
  if (error) logger.error('Musteri anonimlestirilemedi', { module: 'customers', code: error.code, message: error.message });
  revalidatePath(ADMIN_PATH);
  revalidatePath(`${ADMIN_PATH}/${id.data}`);
}

/** Silme yalnız satışı/faturası olmayan kayıt için mümkündür (0007 restrict); aksi hâlde anonimleştirin. */
export async function deleteCustomer(formData: FormData): Promise<void> {
  const gate = await requireRole(ADMINS);
  if (!gate.ok) return;
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return;
  const client = await createServerClient();
  if (!client.ok) return;
  const { error } = await client.data.from('customers').delete().eq('id', id.data);
  if (error) {
    logger.error('Musteri silinemedi', { module: 'customers', code: error.code, message: error.message });
    return;
  }
  revalidatePath(ADMIN_PATH);
  redirect(ADMIN_PATH);
}
