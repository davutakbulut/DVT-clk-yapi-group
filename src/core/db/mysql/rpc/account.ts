// Hesabım RPC'leri (0005/0051, K-103 → K-116). Hepsi SECURITY DEFINER ve yalnız oturumluya açıktı (anon EXECUTE yok).
import { randomUUID } from 'node:crypto';
import type { Actor } from '../pool';
import { dbNow, denied, exec, isObject, lower, noExecute, nullif, pgRow, select, toUuid, txt, type Row } from './pgCast';
import { RpcError, type RpcHandler } from './registry';

/** Anonimse PostgREST'in yetki hatası; oturum yoksa (service) auth.uid() null. */
function member(actor: Actor, fn: string): string | null {
  if (actor.kind === 'anon') throw noExecute(actor, fn);
  return actor.kind === 'user' ? actor.userId : null;
}

/** Eski anonim talepler: doğrulanmış e-postayla eşleşenler üyeye bağlanır (idempotent). */
const claimMyLeads: RpcHandler = async (conn, actor) => {
  const me = member(actor, 'claim_my_leads');
  if (me == null) return 0;
  const [u] = await select<{ email: string }>(conn, 'SELECT email FROM users WHERE id = ? AND email_confirmed_at IS NOT NULL', [me]);
  if (!u) return 0;
  // Harmanlama büyük/küçük harf ve aksan duyarsız: ilk koşul indeksi kullanır, utf8mb4_bin tam eşleşmeyi sağlar
  const email = lower(u.email);
  const r = await exec(conn, 'UPDATE leads SET user_id = ? WHERE user_id IS NULL AND email_lower = ? AND email_lower = ? COLLATE utf8mb4_bin', [me, email, email]);
  return r.affectedRows;
};

/** Kendi firma kaydı; iç notlar (notes) dışarı çıkmaz. */
const getMyCustomer: RpcHandler = async (conn, actor) => {
  const me = member(actor, 'get_my_customer');
  if (me == null) return null;
  const [c] = await select(conn, 'SELECT * FROM customers WHERE profile_id = ? LIMIT 1', [me]);
  if (!c) return null;
  const out = pgRow('customers', c);
  delete out['notes'];
  return out;
};

const upsertMyCustomer: RpcHandler = async (conn, actor, args) => {
  const me = member(actor, 'upsert_my_customer');
  if (me == null) throw denied(actor, 'upsert_my_customer: auth');
  const p: Row = isObject(args['p']) ? args['p'] : {};
  const f = (k: string) => nullif(txt(p, k));
  const [existing] = await select<{ id: string }>(conn, 'SELECT id FROM customers WHERE profile_id = ? LIMIT 1', [me]);
  const fields = [f('full_name'), f('company_title'), f('tax_office'), f('tax_id'), f('address'), f('city'), f('district')];
  if (!existing) {
    const id = randomUUID();
    await exec(
      conn,
      `INSERT INTO customers (id, type, full_name, company_title, tax_office, tax_id, address, city, district, email, phone, source, profile_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT u.email FROM users u WHERE u.id = ?), ?, 'lead', ?)`,
      [id, f('type') ?? 'corporate', ...fields, me, f('phone'), me],
    );
    return id;
  }
  await exec(
    conn,
    `UPDATE customers SET type = COALESCE(?, type), full_name = ?, company_title = ?, tax_office = ?, tax_id = ?, address = ?, city = ?, district = ?, phone = ?, updated_at = ?
      WHERE id = ?`,
    [f('type'), ...fields, f('phone'), dbNow(), existing.id],
  );
  return existing.id;
};

/**
 * Üye hesabını siler; personel silinemez. Firma kaydı kalır (profile_id null), talepler user_id null ile kalır.
 * MariaDB yabancı anahtar zincirinde tetikleyici çalıştırmaz: profil açıkça silinir ki denetim kaydı (PostgreSQL'deki gibi) düşsün.
 */
const deleteMyAccount: RpcHandler = async (conn, actor) => {
  const me = member(actor, 'delete_my_account');
  if (me == null) throw denied(actor, 'delete_my_account: auth');
  if ((await select(conn, "SELECT 1 FROM profiles WHERE id = ? AND role <> 'member'", [me])).length) throw denied(actor, 'delete_my_account: staff');
  await exec(conn, 'UPDATE customers SET profile_id = NULL WHERE profile_id = ?', [me]);
  await exec(conn, 'DELETE FROM profiles WHERE id = ?', [me]);
  await exec(conn, 'DELETE FROM users WHERE id = ?', [me]);
  return null;
};

/** Okundu işareti kişiye özel (read_by); yalnız kendine ya da rolüne düşen bildirim. Dönen: işaretlenen satır sayısı. */
const markNotificationsRead: RpcHandler = async (conn, actor, args) => {
  const me = member(actor, 'mark_notifications_read');
  const raw = args['p_ids'];
  if (raw != null && !Array.isArray(raw)) throw new RpcError('22P02', `malformed array literal: "${String(raw).slice(0, 64)}"`);
  const ids = (raw ?? []).map(toUuid).filter((x): x is string => x != null);
  if (me == null || ids.length === 0) return 0;
  const role = actor.kind === 'user' ? actor.role : null;
  const r = await exec(
    conn,
    `UPDATE notifications SET read_by = JSON_ARRAY_APPEND(read_by, '$', ?)
      WHERE id IN (?) AND NOT JSON_CONTAINS(read_by, JSON_QUOTE(?)) AND (user_id = ? OR target_role = ?)`,
    [me, ids, me, me, role],
  );
  return r.affectedRows;
};

export const ACCOUNT_RPCS: Readonly<Record<string, RpcHandler>> = {
  claim_my_leads: claimMyLeads,
  get_my_customer: getMyCustomer,
  upsert_my_customer: upsertMyCustomer,
  delete_my_account: deleteMyAccount,
  mark_notifications_read: markNotificationsRead,
};
