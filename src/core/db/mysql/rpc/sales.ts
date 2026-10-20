// Müşteri / satış / tahsilat RPC'leri (0029/0030/0031/0034/0040 → K-116).
// create_customer_from_lead ve recalc_sale_payments SECURITY INVOKER'dı: çağıranın erişim kuralı burada açıkça uygulanır.
// Diğerleri DEFINER: yetki kontrolü burada; satış koruma tetikleyicisi (@app_role 'sales') maliyet sütunu yazılmadığı için geçer.
import { randomUUID } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import { ACCESS } from '../access.generated';
import type { Actor } from '../pool';
import { clean, dbNow, denied, exec, invalid, noExecute, select, toUuid, uid } from './pgCast';
import { hasRole, type RpcHandler } from './registry';

/** bypass: DEFINER fonksiyonun içinden çağrı (sahip rolü RLS'e takılmaz) ya da service_role. */
async function createCustomerFromLead(conn: PoolConnection, actor: Actor, leadId: string | null, bypass: boolean): Promise<string> {
  const rls = !bypass && actor.kind === 'user';
  const visible = rls ? ` AND (${ACCESS['leads']!.user.select})` : '';
  const [lead] = await select<{ customer_id: string | null; anonymized_at: string | null; company: string | null; full_name: string; city: string | null; email: string | null; phone: string | null; ref_no: string }>(
    conn, `SELECT customer_id, anonymized_at, company, full_name, city, email, phone, ref_no FROM leads WHERE id = ?${visible}`, [leadId],
  );
  if (!lead) throw invalid('create_customer_from_lead: lead');
  if (lead.customer_id != null) return lead.customer_id;
  if (lead.anonymized_at != null) throw invalid('create_customer_from_lead: anonymized');
  if (rls && !hasRole(actor, 'super_admin', 'admin', 'sales')) throw denied(actor, 'new row violates row-level security policy for table "customers"');
  const company = clean(lead.company);
  const id = randomUUID();
  await exec(
    conn,
    "INSERT INTO customers (id, type, full_name, company_title, city, email, phone, contact_person, contact_phone, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'lead', ?)",
    [id, company == null ? 'individual' : 'corporate', lead.full_name, company, lead.city, lead.email, lead.phone, company == null ? null : lead.full_name, company == null ? null : lead.phone, `Talep ${lead.ref_no}`],
  );
  await exec(conn, 'UPDATE leads SET customer_id = ? WHERE id = ?', [id, leadId]);
  return id;
}

const createCustomerFromLeadRpc: RpcHandler = async (conn, actor, args) => {
  if (actor.kind === 'anon') throw noExecute(actor, 'create_customer_from_lead');
  return createCustomerFromLead(conn, actor, toUuid(args['p_lead_id']), actor.kind === 'service');
};

async function createSaleFromLead(conn: PoolConnection, actor: Actor, leadId: string | null): Promise<string> {
  // is_trusted_context() → service aktörü
  if (!(actor.kind === 'service' || hasRole(actor, 'super_admin', 'admin', 'sales'))) throw denied(actor, 'create_sale_from_lead: yetki yok');
  const [open] = await select<{ id: string }>(conn, "SELECT id FROM sales WHERE lead_id = ? AND status <> 'cancelled' LIMIT 1", [leadId]);
  if (open) return open.id;
  const customer = await createCustomerFromLead(conn, actor, leadId, true);
  const sale = randomUUID();
  await exec(conn, "INSERT INTO sales (id, customer_id, lead_id, assigned_to, created_by, notes) VALUES (?, ?, ?, ?, ?, (SELECT CONCAT('Talep ', l.ref_no) FROM leads l WHERE l.id = ?))", [
    sale, customer, leadId, uid(actor), uid(actor), leadId,
  ]);
  await exec(
    conn,
    `INSERT INTO sale_items (sale_id, product_id, description, quantity, unit, unit_price, line_total, sort_order)
     SELECT ?, li.product_id, CONCAT(li.product_name_snapshot, COALESCE(CONCAT(' · ', li.variant_label_snapshot), '')), li.quantity, COALESCE(li.unit, 'adet'), 0, 0, li.sort_order
       FROM lead_items li WHERE li.lead_id = ?`,
    [sale, leadId],
  );
  await exec(conn, "UPDATE leads SET status = 'won' WHERE id = ? AND status IN ('new', 'in_review', 'quoted')", [leadId]);
  return sale;
}

const createSaleFromLeadRpc: RpcHandler = async (conn, actor, args) => {
  if (actor.kind === 'anon') throw noExecute(actor, 'create_sale_from_lead');
  return createSaleFromLead(conn, actor, toUuid(args['p_lead_id']));
};

const createSaleFromConfiguration: RpcHandler = async (conn, actor, args) => {
  if (actor.kind === 'anon') throw noExecute(actor, 'create_sale_from_configuration');
  const configId = toUuid(args['p_configuration_id']);
  if (!hasRole(actor, 'super_admin', 'admin', 'sales')) throw denied(actor, 'create_sale_from_configuration: yetki yok');
  // numeric::text ölçeği korur ('125000.00'); sürücü DECIMAL'i sayıya çevirip sıfırları atardı
  const [c] = await select<{ sale_id: string | null; lead_id: string | null; ref_code: string; current_version: number; price: string | null; currency: string | null }>(
    conn, 'SELECT sale_id, lead_id, ref_code, current_version, CAST(estimated_price AS CHAR) AS price, currency FROM configurations WHERE id = ?', [configId],
  );
  if (!c) throw invalid('create_sale_from_configuration: yok');
  if (c.sale_id != null) return c.sale_id;
  if (c.lead_id == null) throw invalid('create_sale_from_configuration: talep yok');
  const sale = await createSaleFromLead(conn, actor, c.lead_id);
  const [{ n } = { n: 0 }] = await select<{ n: number }>(conn, 'SELECT COALESCE(MAX(sort_order), 0) AS n FROM sale_items WHERE sale_id = ?', [sale]);
  const prefix = `Konfig ${c.ref_code} v${c.current_version} · `;
  // greatest() PostgreSQL'de NULL'u yok sayar, MariaDB'de NULL döndürür → içteki COALESCE 0.001'e düşer
  await exec(
    conn,
    `INSERT INTO sale_items (sale_id, description, quantity, unit, unit_price, line_total, sort_order)
     SELECT ?, CONCAT(?, i.element_group, COALESCE(CONCAT(' · ', i.profile_code_snapshot), '')),
            GREATEST(COALESCE(i.total_weight_kg, i.total_area_m2, i.total_length_m, i.piece_count, 0.001), 0.001),
            CASE WHEN i.total_weight_kg IS NOT NULL THEN 'kg' WHEN i.total_area_m2 IS NOT NULL THEN 'm2' WHEN i.total_length_m IS NOT NULL THEN 'm' ELSE 'adet' END,
            0, 0, ? + i.sort_order
       FROM configuration_items i JOIN configuration_versions v ON v.id = i.configuration_version_id
      WHERE v.configuration_id = ? AND v.version = ?`,
    [sale, prefix, Number(n), configId, c.current_version],
  );
  const note = `\nKonfigürasyon ${c.ref_code} v${c.current_version}${c.price != null ? ` · tahmini ${c.price} ${c.currency ?? ''}` : ''}`;
  await exec(conn, "UPDATE sales SET configuration_id = ?, notes = CONCAT(COALESCE(notes, ''), ?) WHERE id = ?", [configId, note, sale]);
  await exec(conn, "UPDATE configurations SET sale_id = ?, status = 'converted_to_sale' WHERE id = ?", [sale, configId]);
  return sale;
};

const recalcSalePayments: RpcHandler = async (conn, actor, args) => {
  if (actor.kind === 'anon') throw noExecute(actor, 'recalc_sale_payments');
  const saleId = toUuid(args['p_sale_id']);
  // INVOKER: hakediş/fatura UPDATE kuralı yalnız yöneticiye; diğer rollerde RLS satırları süzer → hata değil, etkisiz
  if (actor.kind === 'user' && !hasRole(actor, 'super_admin', 'admin')) return null;
  await exec(
    conn,
    `UPDATE payment_schedules s SET s.status = CASE
       WHEN s.status = 'cancelled' THEN 'cancelled'
       WHEN COALESCE((SELECT SUM(pm.amount_try) FROM payments pm WHERE pm.schedule_id = s.id), 0) >= s.amount THEN 'paid'
       WHEN COALESCE((SELECT SUM(pm.amount_try) FROM payments pm WHERE pm.schedule_id = s.id), 0) > 0 THEN 'partially_paid'
       ELSE 'pending' END
     WHERE s.sale_id = ?`,
    [saleId],
  );
  await exec(
    conn,
    `UPDATE invoices i SET i.status = CASE
       WHEN i.status IN ('not_issued', 'cancelled') THEN i.status
       WHEN COALESCE((SELECT SUM(pm.amount) FROM payments pm WHERE pm.invoice_id = i.id), 0) >= i.collectable_amount THEN 'paid'
       WHEN COALESCE((SELECT SUM(pm.amount) FROM payments pm WHERE pm.invoice_id = i.id), 0) > 0 THEN 'partially_paid'
       WHEN i.status IN ('paid', 'partially_paid') THEN 'sent'
       ELSE i.status END
     WHERE i.sale_id = ?`,
    [saleId],
  );
  return null;
};

const anonymizeCustomer: RpcHandler = async (conn, actor, args) => {
  if (actor.kind === 'anon') throw noExecute(actor, 'anonymize_customer');
  const id = toUuid(args['p_id']);
  if (!hasRole(actor, 'super_admin', 'admin')) throw denied(actor, 'anonymize_customer: yetki yok');
  const now = dbNow();
  const r = await exec(
    conn,
    `UPDATE customers SET full_name = CASE WHEN type = 'individual' THEN 'Anonim' ELSE NULL END,
            email = NULL, phone = NULL, contact_person = NULL, contact_phone = NULL, address = NULL, district = NULL, notes = NULL,
            profile_id = NULL, is_active = FALSE, anonymized_at = ?
      WHERE id = ? AND anonymized_at IS NULL`,
    [now, id],
  );
  if (r.affectedRows === 0) throw invalid('anonymize_customer: customer');
  await exec(
    conn,
    `UPDATE leads SET full_name = 'Anonim', company = NULL, email = NULL, phone = NULL, message = NULL, subject = NULL, form_data = '{}', ip_masked = NULL, anonymized_at = ?
      WHERE customer_id = ? AND anonymized_at IS NULL`,
    [now, id],
  );
  return null;
};

export const SALES_RPCS: Readonly<Record<string, RpcHandler>> = {
  create_customer_from_lead: createCustomerFromLeadRpc,
  create_sale_from_lead: createSaleFromLeadRpc,
  create_sale_from_configuration: createSaleFromConfiguration,
  recalc_sale_payments: recalcSalePayments,
  anonymize_customer: anonymizeCustomer,
};
