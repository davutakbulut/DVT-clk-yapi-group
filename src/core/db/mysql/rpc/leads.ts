// Talep, iş başvurusu ve ziyaretçi yorumu RPC'leri (0020/0021/0027/0051/0052 → K-116). Hepsi SECURITY DEFINER'dı:
// erişim kuralı uygulanmaz, yetki burada. require_gate() düştü (dışarıdan PostgREST çağrısı artık yok); eşik ve boyut kapıları aynen.
import { randomUUID } from 'node:crypto';
import type { PoolConnection } from 'mysql2/promise';
import type { Actor } from '../pool';
import {
  charLen, clean, companyEmail, dbNow, denied, exec, invalid, isObject, jsonbText, jsonSize, jsonText, lower, noExecute, nullif, select, toBool, toInt, toNumeric, toUuid, txt, uid, type Row,
} from './pgCast';
import { hasRole, RpcError, throttle, type RpcHandler } from './registry';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const lowerOrNull = (s: string | null) => (s == null ? null : lower(s));
const LEAD_SOURCES = ['contact_form', 'quote_form', 'quote_basket', 'configurator', 'whatsapp'];

async function queueEmail(conn: PoolConnection, m: { template: string; to: string; toName?: string | null; locale: string; payload: Row; priority: number; relatedType: string; relatedId: string }) {
  await exec(conn, 'INSERT INTO email_queue (template_key, to_email, to_name, locale, payload, priority, related_type, related_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [
    m.template, m.to, m.toName ?? null, m.locale, JSON.stringify(m.payload), m.priority, m.relatedType, m.relatedId,
  ]);
}
async function notifyRoles(conn: PoolConnection, roles: readonly string[], type: string, payload: Row, link: string) {
  for (const r of roles) await exec(conn, 'INSERT INTO notifications (target_role, type, payload, link_path) VALUES (?, ?, ?, ?)', [r, type, JSON.stringify(payload), link]);
}
const pickLocale = (p: Row, fn: string) => {
  const v = txt(p, 'locale') ?? 'tr';
  if (v !== 'tr' && v !== 'en') throw invalid(`${fn}: locale`);
  return v;
};

// ── submit_lead ─────────────────────────────────────────────────────────────────────────────────────────────────────
async function submitLeadImpl(conn: PoolConnection, actor: Actor, p: Row): Promise<{ id: string; ref_no: string; items: number }> {
  const now = dbNow();
  const source = txt(p, 'source') ?? 'contact_form';
  const email = lowerOrNull(clean(txt(p, 'email')));
  const phone = clean(txt(p, 'phone'));
  const name = clean(txt(p, 'full_name'));
  const companyTo = await companyEmail(conn);
  let service = toUuid(nullif(txt(p, 'service_id')));
  const items = p['items'];
  const locale = pickLocale(p, 'submit_lead');
  if (!LEAD_SOURCES.includes(source)) throw invalid('submit_lead: source');
  if (name == null || charLen(name) < 2) throw invalid('submit_lead: full_name');
  if (email == null && phone == null) throw invalid('submit_lead: contact');
  if (email != null && !EMAIL_RE.test(email)) throw invalid('submit_lead: email');
  if ((toBool(txt(p, 'consent_kvkk')) ?? false) !== true) throw invalid('submit_lead: consent');
  if (Array.isArray(items) && items.length > 50) throw invalid('submit_lead: items');
  let serviceTitle: string | null = null;
  if (service != null) {
    const [s] = await select<{ t: string | null }>(conn, `SELECT ${jsonText('title', '?')} AS t FROM services WHERE id = ?`, [`$.${locale}`, `$.${locale}`, service]);
    serviceTitle = s?.t ?? null;
    if (serviceTitle == null) service = null;
  }
  let config: string | null = null;
  const token = nullif(txt(p, 'configuration_token'));
  if (token != null) config = (await select<{ id: string }>(conn, 'SELECT id FROM configurations WHERE public_token = ?', [toUuid(token)]))[0]?.id ?? null;

  const id = randomUUID();
  await exec(
    conn,
    `INSERT INTO leads (id, source, full_name, company, email, phone, city, subject, message, form_data, service_id, locale, user_id,
                        consent_kvkk_at, consent_marketing, utm, page_url, ip_masked, configuration_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, source, name, clean(txt(p, 'company')), email, phone, clean(txt(p, 'city')), clean(txt(p, 'subject')), clean(txt(p, 'message')),
      'form_data' in p ? JSON.stringify(p['form_data']) : '{}', service, locale, uid(actor),
      now, (toBool(txt(p, 'consent_marketing')) ?? false) ? 1 : 0, 'utm' in p ? JSON.stringify(p['utm']) : '{}', nullif(txt(p, 'page_url')), nullif(txt(p, 'ip_masked')), config,
    ],
  );
  const ref = (await select<{ ref_no: string }>(conn, 'SELECT ref_no FROM leads WHERE id = ?', [id]))[0]!.ref_no; // tetikleyici atar (TLP-YYYY-NNNN)
  if (config != null) await exec(conn, "UPDATE configurations SET status = 'converted_to_lead', lead_id = ? WHERE id = ? AND status = 'saved'", [id, config]);

  let count = 0;
  if (Array.isArray(items)) {
    for (const item of items) {
      const it = isObject(item) ? item : {};
      const [pr] = await select<{ id: string; name: string | null }>(
        conn,
        `SELECT id, ${jsonText('name', '?')} AS name FROM products WHERE id = ? AND status = 'published' AND JSON_CONTAINS(published_locales, JSON_QUOTE(?))`,
        [`$.${locale}`, `$.${locale}`, toUuid(nullif(txt(it, 'product_id'))), locale],
      );
      if (!pr) continue;
      let variant: { id: string; size_label: string | null; stock_code: string | null } | undefined;
      const variantId = nullif(txt(it, 'variant_id'));
      if (variantId != null) [variant] = await select(conn, 'SELECT id, size_label, stock_code FROM product_variants WHERE id = ? AND product_id = ?', [toUuid(variantId), pr.id]);
      count++;
      // Seçim nitelikleri (K-88): yalnız nesne, en çok 1 KB; ziyaretçi verisi olduğu için snapshot olarak saklanır
      const attrs = isObject(it['attributes']) && charLen(jsonbText(it['attributes'])) <= 1024 ? it['attributes'] : {};
      await exec(
        conn,
        `INSERT INTO lead_items (lead_id, product_id, variant_id, product_name_snapshot, variant_label_snapshot, stock_code_snapshot, quantity, unit, note, sort_order, attributes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, pr.id, variant?.id ?? null, pr.name ?? '', variant?.size_label ?? null, variant?.stock_code ?? null,
          Math.max(toNumeric(nullif(txt(it, 'quantity'))) ?? 1, 0.001), clean(txt(it, 'unit')), clean(txt(it, 'note')), count, JSON.stringify(attrs)],
      );
    }
  }

  const message = txt(p, 'message') ?? '';
  if (email != null) {
    await queueEmail(conn, { template: 'lead.received.customer', to: email, toName: name, locale, payload: { ref_no: ref, full_name: name, service: serviceTitle ?? '', message }, priority: 3, relatedType: 'lead', relatedId: id });
  }
  if (companyTo != null) {
    await queueEmail(conn, {
      template: 'lead.received.company', to: companyTo, locale: 'tr', priority: 2, relatedType: 'lead', relatedId: id,
      payload: {
        ref_no: ref, full_name: name, email: email ?? '', phone: phone ?? '', company: txt(p, 'company') ?? '', service: serviceTitle ?? '',
        message: message + (count > 0 ? `\n\n${count} kalem` : '') + (config != null ? `\n\nKonfigürasyon: /admin/configurator/${config}` : ''),
        admin_path: `/admin/leads/${id}`,
      },
    });
  }
  await notifyRoles(conn, ['sales', 'admin'], 'lead.created', { ref_no: ref, full_name: name, source, items: count }, `/admin/leads/${id}`);
  return { id, ref_no: ref, items: count };
}

const submitLead: RpcHandler = async (conn, actor, args) => {
  const raw = args['p'];
  const p = isObject(raw) ? raw : {};
  const email = lower(clean(txt(p, 'email')) ?? '');
  if (jsonSize(raw) > 32768) throw invalid('submit_lead: gövde çok büyük');
  await throttle(conn, 'lead:global', 60, 600);
  if (email !== '') await throttle(conn, `lead:email:${email}`, 3, 3600);
  return submitLeadImpl(conn, actor, p);
};

// ── submit_job_application ──────────────────────────────────────────────────────────────────────────────────────────
async function submitJobApplicationImpl(conn: PoolConnection, p: Row): Promise<{ id: string }> {
  const now = dbNow();
  const posting = toUuid(nullif(txt(p, 'job_posting_id')));
  const email = lowerOrNull(clean(txt(p, 'email')));
  const name = clean(txt(p, 'full_name'));
  const locale = pickLocale(p, 'submit_job_application');
  const cv = clean(txt(p, 'cv_path'));
  const companyTo = await companyEmail(conn);
  if (name == null || charLen(name) < 2) throw invalid('submit_job_application: full_name');
  if (email == null || !EMAIL_RE.test(email)) throw invalid('submit_job_application: email');
  if ((toBool(txt(p, 'consent_kvkk')) ?? false) !== true) throw invalid('submit_job_application: consent');
  if (cv != null && !/^cv\/[a-f0-9-]{36}\.(pdf|doc|docx)$/.test(cv)) throw invalid('submit_job_application: cv_path');
  let title: string | null = null;
  if (posting != null) {
    const [j] = await select<{ t: string | null }>(
      conn,
      `SELECT ${jsonText('title', '?')} AS t FROM job_postings
        WHERE id = ? AND is_open AND status = 'published' AND JSON_CONTAINS(published_locales, JSON_QUOTE(?))
          AND (application_deadline IS NULL OR application_deadline >= CURRENT_DATE)`,
      [`$.${locale}`, `$.${locale}`, posting, locale],
    );
    title = j?.t ?? null;
    if (title == null) throw invalid('submit_job_application: posting');
  }
  const id = randomUUID();
  await exec(conn, 'INSERT INTO job_applications (id, job_posting_id, full_name, email, phone, cover_letter, cv_path, locale, consent_kvkk_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
    id, posting, name, email, clean(txt(p, 'phone')), clean(txt(p, 'cover_letter')), cv, locale, now,
  ]);
  await queueEmail(conn, { template: 'application.received.applicant', to: email, toName: name, locale, payload: { full_name: name, position: title ?? '' }, priority: 3, relatedType: 'job_application', relatedId: id });
  if (companyTo != null) {
    await queueEmail(conn, {
      template: 'application.received.company', to: companyTo, locale: 'tr', priority: 2, relatedType: 'job_application', relatedId: id,
      payload: { full_name: name, email, position: title ?? '', admin_path: '/admin/careers/applications' },
    });
  }
  await notifyRoles(conn, ['admin'], 'application.created', { full_name: name, position: title ?? '' }, '/admin/careers/applications');
  return { id };
}

const submitJobApplication: RpcHandler = async (conn, _actor, args) => {
  const raw = args['p'];
  const p = isObject(raw) ? raw : {};
  const email = lower(clean(txt(p, 'email')) ?? '');
  if (jsonSize(raw) > 32768) throw invalid('submit_job_application: gövde çok büyük');
  await throttle(conn, 'job:global', 30, 3600);
  if (email !== '') await throttle(conn, `job:email:${email}`, 2, 86400);
  return submitJobApplicationImpl(conn, p);
};

// ── submit_testimonial ──────────────────────────────────────────────────────────────────────────────────────────────
async function submitTestimonialImpl(conn: PoolConnection, p: Row): Promise<{ id: string }> {
  const now = dbNow();
  const name = clean(txt(p, 'author_name'));
  const body = clean(txt(p, 'body'));
  const rating = toInt(nullif(txt(p, 'rating')));
  const refs = { service: toUuid(nullif(txt(p, 'service_id'))), project: toUuid(nullif(txt(p, 'project_id'))), product: toUuid(nullif(txt(p, 'product_id'))) };
  const locale = pickLocale(p, 'submit_testimonial');
  if (name == null || charLen(name) < 2 || charLen(name) > 120) throw invalid('submit_testimonial: author_name');
  if (body == null || charLen(body) < 10 || charLen(body) > 2000) throw invalid('submit_testimonial: body');
  if (rating == null || rating < 1 || rating > 5) throw invalid('submit_testimonial: rating');
  if ((toBool(txt(p, 'consent_kvkk')) ?? false) !== true) throw invalid('submit_testimonial: consent');
  for (const [kind, table] of [['service', 'services'], ['project', 'projects'], ['product', 'products']] as const) {
    const ref = refs[kind];
    if (ref != null && !(await select(conn, `SELECT 1 FROM ${table} WHERE id = ? AND status = 'published'`, [ref])).length) throw invalid(`submit_testimonial: ${kind}`);
  }
  const id = randomUUID();
  await exec(
    conn,
    `INSERT INTO testimonials (id, source, author_name, company, rating, body, original_locale, service_id, project_id, product_id, reviewed_on, status, consent_kvkk_at, ip_masked)
     VALUES (?, 'visitor', ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE, 'pending', ?, ?)`,
    [id, name, clean(txt(p, 'company')), rating, JSON.stringify({ [locale]: body }), locale, refs.service, refs.project, refs.product, now, clean(txt(p, 'ip_masked'))],
  );
  await notifyRoles(conn, ['editor', 'admin'], 'testimonial.pending', { author_name: name, rating }, '/admin/testimonials?status=pending');
  return { id };
}

const submitTestimonial: RpcHandler = async (conn, _actor, args) => {
  const raw = args['p'];
  if (jsonSize(raw) > 8192) throw invalid('submit_testimonial: gövde çok büyük');
  await throttle(conn, 'testimonial:global', 30, 3600);
  return submitTestimonialImpl(conn, isObject(raw) ? raw : {});
};

// ── reply_lead (personel → müşteri) ─────────────────────────────────────────────────────────────────────────────────
const replyLead: RpcHandler = async (conn, actor, args) => {
  if (actor.kind === 'anon') throw noExecute(actor, 'reply_lead');
  const leadId = toUuid(args['p_lead_id']);
  if (!hasRole(actor, 'super_admin', 'admin', 'sales')) throw denied(actor, 'reply_lead: yetki yok');
  const subject = args['p_subject'] == null ? null : clean(String(args['p_subject'])) ?? '';
  const body = args['p_body'] == null ? null : clean(String(args['p_body'])) ?? '';
  // length(null) < 2 null döner → plpgsql kontrolü geçer, NOT NULL ihlali eklemede çıkar
  if ((subject != null && charLen(subject) < 2) || (body != null && charLen(body) < 2)) throw invalid('reply_lead: bos');
  const [lead] = await select<{ email: string | null; full_name: string; locale: string; ref_no: string }>(conn, 'SELECT email, full_name, locale, ref_no FROM leads WHERE id = ?', [leadId]);
  if (lead?.email == null) throw invalid('reply_lead: e-posta yok');
  const reply = randomUUID();
  await exec(conn, 'INSERT INTO lead_replies (id, lead_id, author_id, subject, body) VALUES (?, ?, ?, ?, ?)', [reply, leadId, uid(actor), subject, body]);
  await queueEmail(conn, {
    template: 'lead.reply.customer', to: lead.email, toName: lead.full_name, locale: lead.locale, priority: 2, relatedType: 'lead_reply', relatedId: reply,
    payload: { ref_no: lead.ref_no, full_name: lead.full_name, subject, body, reply_id: reply },
  });
  await exec(conn, "UPDATE leads SET status = 'in_review' WHERE id = ? AND status = 'new'", [leadId]);
  return reply;
};

// ── customer_lead_message (üye → şirket, K-103) ─────────────────────────────────────────────────────────────────────
const KIND_SUBJECT: Readonly<Record<string, string>> = { reply: 'Müşteri mesajı', revision_request: 'Revizyon isteği', cancel_request: 'İptal isteği' };

async function customerLeadMessageImpl(conn: PoolConnection, userId: string, leadId: string | null, kind: string | null, bodyArg: string | null): Promise<string> {
  const now = dbNow();
  if (kind == null || !Object.hasOwn(KIND_SUBJECT, kind)) throw invalid('customer_lead_message: kind');
  const body = bodyArg ?? '';
  if (charLen(clean(body) ?? '') < 3 || charLen(body) > 4000) throw invalid('customer_lead_message: body');
  const [lead] = await select<{ ref_no: string; status: string; full_name: string | null; email: string | null; phone: string | null; company: string | null }>(
    conn, 'SELECT ref_no, status, full_name, email, phone, company FROM leads WHERE id = ? AND user_id = ?', [leadId, userId],
  );
  if (!lead) throw new RpcError('42501', 'customer_lead_message: lead', 403);
  const id = randomUUID();
  const text = clean(body) ?? '';
  await exec(conn, "INSERT INTO lead_replies (id, lead_id, author_id, subject, body, direction, kind, sent_at) VALUES (?, ?, ?, ?, ?, 'inbound', ?, ?)", [id, leadId, userId, KIND_SUBJECT[kind], text, kind, now]);
  await notifyRoles(conn, ['sales'], 'lead.customer_message', { ref_no: lead.ref_no, kind, lead_id: leadId }, `/admin/leads/${leadId}`);
  if (kind === 'cancel_request' && (lead.status === 'new' || lead.status === 'in_review')) {
    await exec(conn, "UPDATE leads SET status = 'lost', lost_reason = 'customer_cancel', updated_at = ? WHERE id = ?", [now, leadId]);
  }
  const to = await companyEmail(conn);
  if (to != null) {
    await queueEmail(conn, {
      template: 'lead.received.company', to, locale: 'tr', priority: 3, relatedType: 'lead', relatedId: leadId!,
      payload: { ref_no: lead.ref_no, full_name: lead.full_name ?? '', email: lead.email ?? '', phone: lead.phone ?? '', company: lead.company ?? '', service: '', message: `[${kind}] ${text}` },
    });
  }
  return id;
}

const customerLeadMessage: RpcHandler = async (conn, actor, args) => {
  if (actor.kind === 'anon') throw noExecute(actor, 'customer_lead_message');
  const leadId = toUuid(args['p_lead_id']);
  if (actor.kind !== 'user') throw denied(actor, 'customer_lead_message: auth');
  await throttle(conn, `clm:${actor.userId}`, 5, 3600);
  const str = (v: unknown) => (v == null ? null : String(v));
  return customerLeadMessageImpl(conn, actor.userId, leadId, str(args['p_kind']), str(args['p_body']));
};

// ── purge_expired_job_applications (KVKK saklama süresi; yalnız service_role) ───────────────────────────────────────
const purgeExpiredJobApplications: RpcHandler = async (conn, actor) => {
  if (actor.kind !== 'service') throw noExecute(actor, 'purge_expired_job_applications');
  return select<{ cv_bucket: string; cv_path: string | null }>(conn, 'DELETE FROM job_applications WHERE retention_until < CURRENT_DATE RETURNING cv_bucket, cv_path');
};

export const LEADS_RPCS: Readonly<Record<string, RpcHandler>> = {
  submit_lead: submitLead,
  submit_job_application: submitJobApplication,
  submit_testimonial: submitTestimonial,
  reply_lead: replyLead,
  customer_lead_message: customerLeadMessage,
  purge_expired_job_applications: purgeExpiredJobApplications,
};
