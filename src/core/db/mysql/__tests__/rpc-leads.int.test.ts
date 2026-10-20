// Talep / başvuru / yorum / müşteri / satış / hesap RPC'lerinin MariaDB bütünleşik testi (K-116). MYSQL_TEST_URL yoksa atlanır.
// Davranış tanımı supabase/tests (leads, customers, sales, finance, account, abuse, corporate, testimonials, system, rls-members).
//   MYSQL_URL=$MYSQL_TEST_URL npx vitest run src/core/db/mysql/__tests__/rpc-leads.int.test.ts
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const enabled = !!process.env['MYSQL_URL'] && process.env['MYSQL_URL'] === process.env['MYSQL_TEST_URL'];
// paralel test dosyaları aynı milisaniyede başlayabilir: rastgele ek çakışmayı önler
const TAG = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

describe.skipIf(!enabled)('MariaDB RPC: talep, müşteri, satış, hesap', { timeout: 60_000 }, async () => {
  const { withConnection, withTransaction } = await import('../pool');
  type Actor = Parameters<typeof withConnection>[0];
  const { mapError } = await import('../rest/engine');
  const { RpcError } = await import('../rpc/registry');
  const { LEADS_RPCS } = await import('../rpc/leads');
  const { SALES_RPCS } = await import('../rpc/sales');
  const { ACCOUNT_RPCS } = await import('../rpc/account');
  const RPCS = { ...LEADS_RPCS, ...SALES_RPCS, ...ACCOUNT_RPCS };

  const service: Actor = { kind: 'service' };
  const anon: Actor = { kind: 'anon' };
  const ids = { member: randomUUID(), other: randomUUID(), gone: randomUUID(), sales: randomUUID(), admin: randomUUID(), viewer: randomUUID(), editor: randomUUID() };
  const role: Record<keyof typeof ids, string> = { member: 'member', other: 'member', gone: 'member', sales: 'sales', admin: 'admin', viewer: 'viewer', editor: 'editor' };
  const as = (k: keyof typeof ids): Actor => ({ kind: 'user', userId: ids[k], role: role[k] });
  const mail = (k: string) => `${TAG}-${k}@test.local`;

  /** RPC'yi tek transaction'da çağırır; PostgREST'in döndüreceği { data, code, message } biçimi. */
  async function call(actor: Actor, name: string, args: Record<string, unknown> = {}): Promise<{ data: unknown; code: string | null; message: string | null }> {
    const res = await withTransaction(actor, (conn) => RPCS[name]!(conn, actor, args));
    if (res.ok) return { data: res.data, code: null, message: null };
    const c = res.error.cause;
    const e = c instanceof RpcError ? { code: c.code, message: c.message } : mapError(c);
    return { data: null, code: e.code, message: e.message };
  }
  async function sql<T = Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
    const res = await withConnection(service, async (conn) => (await conn.query(query, params))[0] as T[]);
    if (!res.ok) throw res.error.cause;
    return res.data;
  }
  const one = async <T = Record<string, unknown>>(query: string, params: unknown[] = []) => (await sql<T>(query, params))[0]!;
  const submit = async (actor: Actor, p: Record<string, unknown>) => {
    const r = await call(actor, 'submit_lead', { p });
    expect(r.code, String(r.message)).toBeNull();
    return r.data as { id: string; ref_no: string; items: number };
  };
  const winStart = (w: number) => `FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(UTC_TIMESTAMP(6)) / ${w}) * ${w})`;

  let companyTo: string | null = null;
  let ownSetting = false;
  let productId = '';
  let draftProductId = '';
  let postingId = '';
  const customerIds: string[] = [];

  beforeAll(async () => {
    for (const k of Object.keys(ids) as (keyof typeof ids)[]) {
      await sql('INSERT INTO users (id, email) VALUES (?, ?)', [ids[k], mail(k)]);
      if (role[k] !== 'member') await sql('UPDATE profiles SET role = ? WHERE id = ?', [role[k], ids[k]]);
    }
    const s = await sql<{ v: string }>("SELECT JSON_UNQUOTE(value) AS v FROM site_settings WHERE `key` = 'contact.email'");
    if (s.length && s[0]!.v?.trim()) companyTo = s[0]!.v.trim();
    else {
      companyTo = mail('satis');
      ownSetting = true;
      await sql("INSERT INTO site_settings (`key`, value) VALUES ('contact.email', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [JSON.stringify(companyTo)]);
    }
    // test veritabanının ortak genel sayaçları: art arda koşular 10 dk'lık eşiği doldurmasın (yalnız MYSQL_TEST_URL'de koşar)
    await sql("DELETE FROM throttle WHERE `key` IN ('lead:global', 'job:global', 'testimonial:global')");
    const cat = randomUUID();
    await sql('INSERT INTO product_categories (id, slug, name, is_active) VALUES (?, ?, ?, 1)', [cat, JSON.stringify({ tr: `${TAG}-kat` }), JSON.stringify({ tr: 'Kat' })]);
    productId = randomUUID();
    draftProductId = randomUUID();
    await sql("INSERT INTO products (id, slug, name, category_id, status, published_locales) VALUES (?, ?, ?, ?, 'published', '[\"tr\"]')", [productId, JSON.stringify({ tr: `${TAG}-kutu` }), JSON.stringify({ tr: 'Kutu Profil' }), cat]);
    await sql("INSERT INTO products (id, slug, name, category_id, status) VALUES (?, ?, ?, ?, 'draft')", [draftProductId, JSON.stringify({ tr: `${TAG}-taslak` }), JSON.stringify({ tr: 'Taslak' }), cat]);
    postingId = randomUUID();
    await sql("INSERT INTO job_postings (id, slug, title, status, published_locales, published_at) VALUES (?, ?, ?, 'published', '[\"tr\"]', UTC_TIMESTAMP(6))", [postingId, JSON.stringify({ tr: `${TAG}-muhendis` }), JSON.stringify({ tr: 'Proje Mühendisi' })]);
  });

  afterAll(async () => {
    const leads = (await sql<{ id: string }>('SELECT id FROM leads WHERE email LIKE ? OR full_name LIKE ? OR customer_id IN (?)', [`${TAG}%`, `${TAG}%`, customerIds.length ? customerIds : [''] ])).map((r) => r.id);
    const leadIds = leads.length ? leads : [''];
    const sales = (await sql<{ id: string }>('SELECT id FROM sales WHERE lead_id IN (?) OR customer_id IN (?)', [leadIds, customerIds.length ? customerIds : ['']])).map((r) => r.id);
    const saleIds = sales.length ? sales : [''];
    await sql('DELETE FROM payments WHERE sale_id IN (?)', [saleIds]);
    await sql('DELETE FROM invoices WHERE sale_id IN (?)', [saleIds]);
    await sql("UPDATE configurations SET sale_id = NULL, lead_id = NULL WHERE ref_code LIKE ?", [`${TAG}%`]);
    await sql('DELETE FROM sales WHERE id IN (?)', [saleIds]);
    const replies = (await sql<{ id: string }>('SELECT id FROM lead_replies WHERE lead_id IN (?)', [leadIds])).map((r) => r.id);
    const apps = (await sql<{ id: string }>('SELECT id FROM job_applications WHERE email LIKE ?', [`${TAG}%`])).map((r) => r.id);
    await sql('DELETE FROM email_queue WHERE to_email LIKE ? OR related_id IN (?)', [`${TAG}%`, [...leadIds, ...replies, ...apps]]);
    await sql(
      "DELETE FROM notifications WHERE JSON_VALUE(payload, '$.full_name') LIKE ? OR JSON_VALUE(payload, '$.author_name') LIKE ? OR JSON_VALUE(payload, '$.lead_id') IN (?) OR link_path IN (?) OR type = ?",
      [`${TAG}%`, `${TAG}%`, leadIds, leadIds.map((id) => `/admin/leads/${id}`), `test.${TAG}`],
    );
    await sql('DELETE FROM leads WHERE id IN (?)', [leadIds]);
    await sql('DELETE FROM customers WHERE id IN (?) OR email LIKE ? OR company_title LIKE ?', [customerIds.length ? customerIds : [''], `${TAG}%`, `${TAG}%`]);
    await sql('DELETE FROM job_applications WHERE email LIKE ?', [`${TAG}%`]);
    await sql('DELETE FROM testimonials WHERE author_name LIKE ?', [`${TAG}%`]);
    await sql('DELETE FROM configurations WHERE ref_code LIKE ?', [`${TAG}%`]);
    await sql('DELETE FROM job_postings WHERE slug_tr LIKE ?', [`${TAG}%`]);
    await sql('DELETE FROM products WHERE slug_tr LIKE ?', [`${TAG}%`]);
    await sql("DELETE FROM product_categories WHERE JSON_VALUE(slug, '$.tr') LIKE ?", [`${TAG}%`]);
    await sql('DELETE FROM throttle WHERE `key` LIKE ? OR `key` IN (?)', [`%${TAG}%`, Object.values(ids).map((id) => `clm:${id}`)]);
    await sql('DELETE FROM users WHERE id IN (?)', [Object.values(ids)]);
    if (ownSetting) await sql("DELETE FROM site_settings WHERE `key` = 'contact.email'");
  });

  // ── submit_lead ──────────────────────────────────────────────────────────────────────────────────────────────────────
  it('submit_lead (anonim): ref_no tetikleyiciden; e-posta küçük harf; müşteri + firma maili kuyrukta; sales ve admin bildirimi', async () => {
    const r = await submit(anon, { source: 'quote_form', full_name: `${TAG} Ali Veli`, email: `  ${mail('Ali').toLocaleUpperCase('en')}`, phone: '+905551112233', message: 'Depo yaptırmak istiyorum', consent_kvkk: true, locale: 'tr' });
    expect(r).toEqual({ id: expect.stringMatching(/^[0-9a-f-]{36}$/), ref_no: expect.stringMatching(/^TLP-\d{4}-\d{4}$/), items: 0 });
    expect(await one('SELECT email, status, source, user_id, consent_marketing FROM leads WHERE id = ?', [r.id])).toEqual({ email: mail('ali'), status: 'new', source: 'quote_form', user_id: null, consent_marketing: 0 });
    const queue = await sql<{ template_key: string; to_email: string }>('SELECT template_key, to_email FROM email_queue WHERE related_id = ? ORDER BY template_key', [r.id]);
    expect(queue).toEqual([{ template_key: 'lead.received.company', to_email: companyTo }, { template_key: 'lead.received.customer', to_email: mail('ali') }]);
    const notes = await sql<{ target_role: string }>("SELECT target_role FROM notifications WHERE type = 'lead.created' AND link_path = ? ORDER BY target_role", [`/admin/leads/${r.id}`]);
    expect(notes.map((n) => n.target_role)).toEqual(['admin', 'sales']);
  });

  it('submit_lead doğrulama: onay, iletişim, kaynak, dil, kalem sayısı → 22023; bozuk uuid → 22P02; 40 KB gövde reddedilir', async () => {
    const base = { full_name: `${TAG} X Y`, email: mail('x'), consent_kvkk: true };
    const cases: [Record<string, unknown>, RegExp][] = [
      [{ ...base, consent_kvkk: false }, /consent/],
      [{ full_name: `${TAG} X Y`, consent_kvkk: true }, /contact/],
      [{ ...base, source: 'manual' }, /source/],
      [{ ...base, locale: 'de' }, /locale/],
      [{ ...base, email: 'bozuk@adres' }, /email/],
      [{ ...base, full_name: ' a ' }, /full_name/],
      [{ ...base, items: Array.from({ length: 51 }, () => ({})) }, /items/],
      [{ ...base, message: 'a'.repeat(40_000) }, /çok büyük/],
    ];
    for (const [p, re] of cases) {
      const r = await call(anon, 'submit_lead', { p });
      expect(r.code, JSON.stringify(p).slice(0, 80)).toBe('22023');
      expect(r.message).toMatch(re);
    }
    expect((await call(anon, 'submit_lead', { p: { ...base, service_id: 'yok' } })).code).toBe('22P02');
  });

  it('submit_lead kalemleri: yalnız yayındaki ürün; miktar varsayılanı 1; 1 KB üstü nitelik düşer; üye talebi user_id taşır', async () => {
    const r = await submit(as('member'), {
      source: 'quote_basket', full_name: `${TAG} Üye`, email: mail('member'), consent_kvkk: true,
      items: [{ product_id: productId, attributes: { kalite: 'S235' } }, { product_id: productId, quantity: '2.5', attributes: { x: 'y'.repeat(1100) } }, { product_id: draftProductId }, 'bozuk'],
    });
    expect(r.items).toBe(2);
    expect(await one('SELECT user_id FROM leads WHERE id = ?', [r.id])).toEqual({ user_id: ids.member });
    const items = await sql<{ product_name_snapshot: string; quantity: number; sort_order: number; attributes: unknown }>('SELECT product_name_snapshot, quantity, sort_order, attributes FROM lead_items WHERE lead_id = ? ORDER BY sort_order', [r.id]);
    expect(items.map((i) => ({ ...i, attributes: typeof i.attributes === 'string' ? JSON.parse(i.attributes) : i.attributes }))).toEqual([
      { product_name_snapshot: 'Kutu Profil', quantity: 1, sort_order: 1, attributes: { kalite: 'S235' } },
      { product_name_snapshot: 'Kutu Profil', quantity: 2.5, sort_order: 2, attributes: {} },
    ]);
    const company = await one<{ m: string }>("SELECT JSON_VALUE(payload, '$.message') AS m FROM email_queue WHERE related_id = ? AND template_key = 'lead.received.company'", [r.id]);
    expect(company.m).toMatch(/2 kalem$/);
  });

  it('eşik (K-104): aynı e-postayla 4. talep ve global 61. talep P0429; aşan çağrı sayaca yazılmaz', async () => {
    const email = mail('ayni');
    await sql(`INSERT INTO throttle (\`key\`, window_start, hits) VALUES (?, ${winStart(3600)}, 3)`, [`lead:email:${email}`]);
    const r = await call(anon, 'submit_lead', { p: { full_name: `${TAG} Sel`, email, consent_kvkk: true } });
    expect(r.code).toBe('P0429');
    expect(r.message).toMatch(/^rate_limited: lead:email:/);
    expect(await one(`SELECT hits FROM throttle WHERE \`key\` = ? AND window_start = ${winStart(3600)}`, [`lead:email:${email}`])).toEqual({ hits: 3 });
    // global sayaç paylaşılır: önceki değer saklanır ve geri yazılır
    const prev = await sql<{ hits: number }>(`SELECT hits FROM throttle WHERE \`key\` = 'lead:global' AND window_start = ${winStart(600)}`);
    await sql(`INSERT INTO throttle (\`key\`, window_start, hits) VALUES ('lead:global', ${winStart(600)}, 60) ON DUPLICATE KEY UPDATE hits = 60`);
    try {
      expect((await call(anon, 'submit_lead', { p: { full_name: `${TAG} Sel`, email: mail('g'), consent_kvkk: true } })).code).toBe('P0429');
    } finally {
      if (prev.length) await sql(`UPDATE throttle SET hits = ? WHERE \`key\` = 'lead:global' AND window_start = ${winStart(600)}`, [prev[0]!.hits]);
      else await sql(`DELETE FROM throttle WHERE \`key\` = 'lead:global' AND window_start = ${winStart(600)}`);
    }
  });

  // ── reply_lead / customer_lead_message / claim_my_leads ─────────────────────────────────────────────────────────────
  it('reply_lead: sales cevap yazar → lead_replies + kuyruk, durum in_review; viewer ve anonim yazamaz', async () => {
    const { id } = await submit(anon, { full_name: `${TAG} Ayşe K`, email: mail('ayse'), consent_kvkk: true });
    const v = await call(as('viewer'), 'reply_lead', { p_lead_id: id, p_subject: 'Konu', p_body: 'Merhaba' });
    expect([v.code, v.message]).toEqual(['42501', 'reply_lead: yetki yok']);
    expect((await call(anon, 'reply_lead', { p_lead_id: id, p_subject: 'Konu', p_body: 'Merhaba' })).code).toBe('42501');
    expect((await call(as('sales'), 'reply_lead', { p_lead_id: id, p_subject: ' ', p_body: 'Merhaba' })).message).toBe('reply_lead: bos');
    const r = await call(as('sales'), 'reply_lead', { p_lead_id: id, p_subject: ' Teklifiniz hazır ', p_body: 'Ekte teklifimiz var.' });
    expect(r.data).toMatch(/^[0-9a-f-]{36}$/);
    expect(await one('SELECT status FROM leads WHERE id = ?', [id])).toEqual({ status: 'in_review' });
    expect(await one('SELECT subject, author_id, direction FROM lead_replies WHERE id = ?', [r.data])).toEqual({ subject: 'Teklifiniz hazır', author_id: ids.sales, direction: 'outbound' });
    expect(await sql("SELECT 1 FROM email_queue WHERE template_key = 'lead.reply.customer' AND related_id = ? AND to_email = ?", [r.data, mail('ayse')])).toHaveLength(1);
  });

  it('customer_lead_message: yalnız kendi talebi; inbound + satışa bildirim + şirkete e-posta; iptal → lost; saatte 5', async () => {
    const lead = await submit(as('member'), { full_name: `${TAG} Üye Bir`, email: mail('member'), consent_kvkk: true, message: 'Merhaba' });
    const send = (k: keyof typeof ids, kind: string, body: string) => call(as(k), 'customer_lead_message', { p_lead_id: lead.id, p_kind: kind, p_body: body });
    expect(await send('other', 'reply', 'Bu talep benim değil')).toMatchObject({ code: '42501', message: 'customer_lead_message: lead' });
    expect(await send('member', 'bogus', 'xxx')).toMatchObject({ code: '22023', message: 'customer_lead_message: kind' });
    expect(await send('member', 'reply', ' a ')).toMatchObject({ code: '22023', message: 'customer_lead_message: body' });
    expect((await call(anon, 'customer_lead_message', { p_lead_id: lead.id, p_kind: 'reply', p_body: 'xxxx' })).code).toBe('42501');
    expect((await send('member', 'revision_request', 'Kalınlık 3 mm olsun lütfen')).code).toBeNull();
    expect(await sql('SELECT direction, kind, subject FROM lead_replies WHERE lead_id = ?', [lead.id])).toEqual([{ direction: 'inbound', kind: 'revision_request', subject: 'Revizyon isteği' }]);
    expect(await sql("SELECT 1 FROM notifications WHERE type = 'lead.customer_message' AND target_role = 'sales' AND JSON_VALUE(payload, '$.lead_id') = ?", [lead.id])).toHaveLength(1);
    expect(await sql("SELECT 1 FROM email_queue WHERE to_email = ? AND related_id = ? AND JSON_VALUE(payload, '$.message') LIKE '[revision_request]%'", [companyTo, lead.id])).toHaveLength(1);
    expect((await send('member', 'cancel_request', 'Vazgeçtim, iptal edin')).code).toBeNull();
    expect(await one('SELECT status, lost_reason FROM leads WHERE id = ?', [lead.id])).toEqual({ status: 'lost', lost_reason: 'customer_cancel' });
    // başarılı 2 çağrı sayıldı; 3 daha geçer, 6. reddedilir
    for (let i = 0; i < 3; i++) expect((await send('member', 'reply', `mesaj ${i} gönderiyorum`)).code).toBeNull();
    expect((await send('member', 'reply', 'altıncı mesaj')).code).toBe('P0429');
  });

  it('claim_my_leads: doğrulanmış e-postayla eşleşen anonim talepler üyeye bağlanır (büyük/küçük harf duyarsız, idempotent)', async () => {
    const lead = await submit(anon, { full_name: `${TAG} Anonim`, email: mail('other').toLocaleUpperCase('en'), consent_kvkk: true });
    expect((await call(as('other'), 'claim_my_leads')).data).toBe(0); // doğrulanmamış
    await sql('UPDATE users SET email_confirmed_at = UTC_TIMESTAMP(6) WHERE id = ?', [ids.other]);
    expect((await call(as('other'), 'claim_my_leads')).data).toBe(1);
    expect((await call(as('other'), 'claim_my_leads')).data).toBe(0);
    expect(await one('SELECT user_id FROM leads WHERE id = ?', [lead.id])).toEqual({ user_id: ids.other });
    expect((await call(anon, 'claim_my_leads')).code).toBe('42501');
  });

  // ── hesap ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  it('upsert_my_customer / get_my_customer: kendi satırı; notlar dışarı çıkmaz; PostgREST biçimi', async () => {
    const first = await call(as('member'), 'upsert_my_customer', { p: { type: 'corporate', company_title: `${TAG} Üye A.Ş.`, tax_office: 'Kadıköy', tax_id: '1234567890', city: 'İstanbul' } });
    const again = await call(as('member'), 'upsert_my_customer', { p: { type: 'corporate', company_title: `${TAG} Üye Anonim Şirketi`, city: 'İstanbul' } });
    expect(again.data).toBe(first.data);
    customerIds.push(first.data as string);
    const c = (await call(as('member'), 'get_my_customer')).data as Record<string, unknown>;
    expect(c).toMatchObject({ id: first.data, company_title: `${TAG} Üye Anonim Şirketi`, tax_office: null, email: mail('member'), profile_id: ids.member, is_active: true, source: 'lead' });
    expect(String(c['created_at'])).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}\+00:00$/);
    expect('notes' in c).toBe(false);
    expect((await call(as('viewer'), 'get_my_customer')).data).toBeNull();
    expect((await call(anon, 'upsert_my_customer', { p: {} })).code).toBe('42501');
    expect((await call(service, 'upsert_my_customer', { p: {} })).message).toBe('upsert_my_customer: auth');
  });

  it('delete_my_account: üye silinir (profil + konfigürasyon gider, talep kalır user_id null, denetim kaydı düşer); personel silemez', async () => {
    const lead = await submit(as('gone'), { full_name: `${TAG} Silinecek`, email: mail('gone'), consent_kvkk: true });
    await sql("INSERT INTO configurations (ref_code, name, params, user_id) VALUES (?, 'Silinecek', '{}', ?)", [`${TAG}-del`, ids.gone]);
    expect((await call(as('admin'), 'delete_my_account')).message).toBe('delete_my_account: staff');
    expect((await call(as('gone'), 'delete_my_account')).code).toBeNull();
    expect(await sql('SELECT 1 FROM users WHERE id = ?', [ids.gone])).toHaveLength(0);
    expect(await sql('SELECT 1 FROM profiles WHERE id = ?', [ids.gone])).toHaveLength(0);
    expect(await sql('SELECT 1 FROM configurations WHERE ref_code = ?', [`${TAG}-del`])).toHaveLength(0);
    expect(await one('SELECT user_id FROM leads WHERE id = ?', [lead.id])).toEqual({ user_id: null });
    expect(await sql("SELECT 1 FROM audit_logs WHERE table_name = 'profiles' AND action = 'DELETE' AND row_id = ?", [ids.gone])).toHaveLength(1);
  });

  it('mark_notifications_read: rol hedefli bildirim kişiye özel işaretlenir; ikinci kez 0; başka rol 0', async () => {
    const id = randomUUID();
    await sql("INSERT INTO notifications (id, target_role, type, payload) VALUES (?, 'sales', ?, '{}')", [id, `test.${TAG}`]);
    expect((await call(as('editor'), 'mark_notifications_read', { p_ids: [id] })).data).toBe(0);
    expect((await call(as('sales'), 'mark_notifications_read', { p_ids: [id.toLocaleUpperCase('en')] })).data).toBe(1);
    expect((await call(as('sales'), 'mark_notifications_read', { p_ids: [id] })).data).toBe(0);
    const row = await one<{ read_by: unknown }>('SELECT read_by FROM notifications WHERE id = ?', [id]);
    expect(typeof row.read_by === 'string' ? JSON.parse(row.read_by) : row.read_by).toEqual([ids.sales]);
    expect((await call(as('sales'), 'mark_notifications_read', { p_ids: ['bozuk'] })).code).toBe('22P02');
  });

  // ── müşteri / satış ─────────────────────────────────────────────────────────────────────────────────────────────────
  it('create_customer_from_lead: sales dönüştürür, ikinci çağrı aynı id; viewer RLS ile reddedilir; üye görmediği talebi bulamaz; anonimleştirme', async () => {
    const { id: leadId } = await submit(anon, { source: 'quote_form', full_name: `${TAG} Ali Veli`, company: ` ${TAG} Veli İnşaat `, email: mail('veli'), phone: '+905551112233', city: 'İzmir', consent_kvkk: true });
    expect((await call(as('viewer'), 'create_customer_from_lead', { p_lead_id: leadId })).code).toBe('42501');
    expect((await call(as('member'), 'create_customer_from_lead', { p_lead_id: leadId })).message).toBe('create_customer_from_lead: lead');
    expect((await call(anon, 'create_customer_from_lead', { p_lead_id: leadId })).code).toBe('42501');
    const first = await call(as('sales'), 'create_customer_from_lead', { p_lead_id: leadId });
    const cid = first.data as string;
    customerIds.push(cid);
    expect((await call(as('sales'), 'create_customer_from_lead', { p_lead_id: leadId })).data).toBe(cid);
    expect(await one('SELECT type, company_title, email, contact_person, source, notes FROM customers WHERE id = ?', [cid])).toMatchObject({
      type: 'corporate', company_title: `${TAG} Veli İnşaat`, email: mail('veli'), contact_person: `${TAG} Ali Veli`, source: 'lead', notes: expect.stringMatching(/^Talep TLP-/),
    });
    expect(await one('SELECT customer_id FROM leads WHERE id = ?', [leadId])).toEqual({ customer_id: cid });

    await sql("UPDATE customers SET tax_id = '1234567890' WHERE id = ?", [cid]);
    expect((await call(as('sales'), 'anonymize_customer', { p_id: cid })).message).toBe('anonymize_customer: yetki yok');
    expect((await call(as('viewer'), 'anonymize_customer', { p_id: cid })).code).toBe('42501');
    expect((await call(as('admin'), 'anonymize_customer', { p_id: cid })).code).toBeNull();
    expect(await one('SELECT full_name, company_title, tax_id, email, is_active, anonymized_at IS NOT NULL AS done FROM customers WHERE id = ?', [cid])).toEqual({
      full_name: null, company_title: `${TAG} Veli İnşaat`, tax_id: '1234567890', email: null, is_active: 0, done: 1,
    });
    expect(await one('SELECT full_name, email, anonymized_at IS NOT NULL AS done FROM leads WHERE id = ?', [leadId])).toEqual({ full_name: 'Anonim', email: null, done: 1 });
    expect((await call(as('admin'), 'anonymize_customer', { p_id: cid })).message).toBe('anonymize_customer: customer');
  });

  let saleId = '';
  it('create_sale_from_lead: sales satış açar (SAT no, kalem kopyası, talep won, müşteri bağlı); tekrar aynı satış; viewer yapamaz', async () => {
    const { id: leadId } = await submit(anon, { source: 'quote_basket', full_name: `${TAG} Ayşe K`, company: `${TAG} K Yapı`, email: mail('k'), consent_kvkk: true });
    await sql("INSERT INTO lead_items (lead_id, product_name_snapshot, variant_label_snapshot, quantity, unit, sort_order) VALUES (?, 'Kutu Profil', '40×40', 12, NULL, 1)", [leadId]);
    expect((await call(as('viewer'), 'create_sale_from_lead', { p_lead_id: leadId })).message).toBe('create_sale_from_lead: yetki yok');
    const r = await call(as('sales'), 'create_sale_from_lead', { p_lead_id: leadId });
    expect(r.code, String(r.message)).toBeNull();
    saleId = r.data as string;
    expect((await call(as('sales'), 'create_sale_from_lead', { p_lead_id: leadId })).data).toBe(saleId);
    const s = await one<{ sale_no: string; status: string; customer_id: string; created_by: string; notes: string }>('SELECT sale_no, status, customer_id, created_by, notes FROM sales WHERE id = ?', [saleId]);
    customerIds.push(s.customer_id);
    expect(s).toMatchObject({ sale_no: expect.stringMatching(/^SAT-\d{4}-\d{4}$/), status: 'draft', created_by: ids.sales, notes: expect.stringMatching(/^Talep TLP-/) });
    expect(await sql('SELECT description, quantity, unit, unit_cost FROM sale_items WHERE sale_id = ?', [saleId])).toEqual([{ description: 'Kutu Profil · 40×40', quantity: 12, unit: 'adet', unit_cost: null }]);
    expect(await one('SELECT status, customer_id FROM leads WHERE id = ?', [leadId])).toEqual({ status: 'won', customer_id: s.customer_id });
  });

  it('create_sale_from_configuration: talepten satış + konfigürasyon kalemleri + not; tekrar aynı satış; talepsiz/yetkisiz reddedilir', async () => {
    const { id: leadId } = await submit(anon, { source: 'configurator', full_name: `${TAG} Konfig`, email: mail('konfig'), consent_kvkk: true });
    const cfg = randomUUID();
    const ref = `${TAG}-kfg`;
    await sql("INSERT INTO configurations (id, ref_code, params, owner_email, estimated_price, currency, lead_id, status) VALUES (?, ?, '{}', ?, 125000, 'TRY', ?, 'converted_to_lead')", [cfg, ref, mail('konfig'), leadId]);
    const ver = randomUUID();
    await sql("INSERT INTO configuration_versions (id, configuration_id, version, params) VALUES (?, ?, 1, '{}')", [ver, cfg]);
    await sql("INSERT INTO configuration_items (configuration_version_id, element_group, profile_code_snapshot, total_weight_kg, sort_order) VALUES (?, 'Kolon', 'HEA 200', 1234.5, 1)", [ver]);
    await sql("INSERT INTO configuration_items (configuration_version_id, element_group, piece_count, sort_order) VALUES (?, 'Ankraj', NULL, 2)", [ver]);
    expect((await call(as('viewer'), 'create_sale_from_configuration', { p_configuration_id: cfg })).code).toBe('42501');
    expect((await call(service, 'create_sale_from_configuration', { p_configuration_id: cfg })).code).toBe('42501');
    expect((await call(as('sales'), 'create_sale_from_configuration', { p_configuration_id: randomUUID() })).message).toBe('create_sale_from_configuration: yok');
    const r = await call(as('sales'), 'create_sale_from_configuration', { p_configuration_id: cfg });
    expect(r.code, String(r.message)).toBeNull();
    expect((await call(as('sales'), 'create_sale_from_configuration', { p_configuration_id: cfg })).data).toBe(r.data);
    expect(await sql('SELECT description, quantity, unit, sort_order FROM sale_items WHERE sale_id = ? ORDER BY sort_order', [r.data])).toEqual([
      { description: `Konfig ${ref} v1 · Kolon · HEA 200`, quantity: 1234.5, unit: 'kg', sort_order: 1 },
      { description: `Konfig ${ref} v1 · Ankraj`, quantity: 0.001, unit: 'adet', sort_order: 2 },
    ]);
    const s = await one<{ notes: string; configuration_id: string }>('SELECT notes, configuration_id FROM sales WHERE id = ?', [r.data]);
    expect(s.configuration_id).toBe(cfg);
    expect(s.notes).toMatch(new RegExp(`^Talep TLP-\\d{4}-\\d{4}\\nKonfigürasyon ${ref} v1 · tahmini 125000\\.00 TRY$`));
    expect(await one('SELECT status, sale_id FROM configurations WHERE id = ?', [cfg])).toEqual({ status: 'converted_to_sale', sale_id: r.data });
    const bare = randomUUID();
    await sql("INSERT INTO configurations (id, ref_code, params, owner_email) VALUES (?, ?, '{}', ?)", [bare, `${TAG}-bos`, mail('konfig')]);
    expect((await call(as('sales'), 'create_sale_from_configuration', { p_configuration_id: bare })).message).toBe('create_sale_from_configuration: talep yok');
  });

  it('recalc_sale_payments: admin kısmi → partially_paid, tam → paid, fatura türetilir; sales için etkisiz; anonim reddedilir', async () => {
    const sched = randomUUID();
    await sql("INSERT INTO payment_schedules (id, sale_id, seq, description, amount, due_date) VALUES (?, ?, 1, 'Peşinat', 1000, CURRENT_DATE)", [sched, saleId]);
    const customer = (await one<{ customer_id: string }>('SELECT customer_id FROM sales WHERE id = ?', [saleId])).customer_id;
    const inv = randomUUID();
    await sql("INSERT INTO invoices (id, sale_id, customer_id, type, status, invoice_no, issue_date, base_amount, vat_rate, vat_amount, total_amount, collectable_amount) VALUES (?, ?, ?, 'e_invoice', 'sent', ?, CURRENT_DATE, 1000, 0.20, 200, 1200, 1200)", [inv, saleId, customer, `${TAG}-EF`]);
    await sql("INSERT INTO payments (sale_id, invoice_id, schedule_id, paid_on, amount, amount_try, method) VALUES (?, ?, ?, CURRENT_DATE, 400, 400, 'bank_transfer')", [saleId, inv, sched]);
    expect((await call(anon, 'recalc_sale_payments', { p_sale_id: saleId })).code).toBe('42501');
    expect(await call(as('sales'), 'recalc_sale_payments', { p_sale_id: saleId })).toEqual({ data: null, code: null, message: null });
    expect(await one('SELECT status FROM payment_schedules WHERE id = ?', [sched])).toEqual({ status: 'pending' });
    await call(as('admin'), 'recalc_sale_payments', { p_sale_id: saleId });
    expect(await one('SELECT status FROM payment_schedules WHERE id = ?', [sched])).toEqual({ status: 'partially_paid' });
    expect(await one('SELECT status FROM invoices WHERE id = ?', [inv])).toEqual({ status: 'partially_paid' });
    await sql("INSERT INTO payments (sale_id, invoice_id, schedule_id, paid_on, amount, amount_try, method) VALUES (?, ?, ?, CURRENT_DATE, 800, 800, 'cash')", [saleId, inv, sched]);
    await call(service, 'recalc_sale_payments', { p_sale_id: saleId });
    expect(await one('SELECT status FROM payment_schedules WHERE id = ?', [sched])).toEqual({ status: 'paid' });
    expect(await one('SELECT status FROM invoices WHERE id = ?', [inv])).toEqual({ status: 'paid' });
  });

  // ── başvuru / yorum / bakım ─────────────────────────────────────────────────────────────────────────────────────────
  it('submit_job_application: kayıt + aday maili + İK bildirimi; KVKK, CV deseni, kapalı ilan kontrolleri; e-posta başına günde 2', async () => {
    const r = await call(anon, 'submit_job_application', { p: { job_posting_id: postingId, full_name: `${TAG} Ada Lovelace`, email: mail('ADA'), consent_kvkk: true, cv_path: 'cv/123e4567-e89b-12d3-a456-426614174000.pdf' } });
    expect(r.code, String(r.message)).toBeNull();
    const id = (r.data as { id: string }).id;
    expect(r.data).toEqual({ id: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    expect(await one('SELECT email, status, cv_path, retention_until > CURRENT_DATE AS kept FROM job_applications WHERE id = ?', [id])).toEqual({ email: mail('ada'), status: 'new', cv_path: 'cv/123e4567-e89b-12d3-a456-426614174000.pdf', kept: 1 });
    expect(await sql('SELECT template_key FROM email_queue WHERE related_id = ? ORDER BY template_key', [id])).toEqual([{ template_key: 'application.received.applicant' }, { template_key: 'application.received.company' }]);
    expect(await sql("SELECT 1 FROM notifications WHERE type = 'application.created' AND target_role = 'admin' AND JSON_VALUE(payload, '$.position') = 'Proje Mühendisi' AND JSON_VALUE(payload, '$.full_name') = ?", [`${TAG} Ada Lovelace`])).toHaveLength(1);
    const base = { job_posting_id: postingId, full_name: `${TAG} X Y`, email: mail('xy'), consent_kvkk: true };
    expect((await call(anon, 'submit_job_application', { p: { ...base, consent_kvkk: false } })).message).toBe('submit_job_application: consent');
    expect((await call(anon, 'submit_job_application', { p: { ...base, cv_path: '../etc/passwd' } })).message).toBe('submit_job_application: cv_path');
    await sql('UPDATE job_postings SET is_open = 0 WHERE id = ?', [postingId]);
    expect((await call(anon, 'submit_job_application', { p: base })).message).toBe('submit_job_application: posting');
    await sql('UPDATE job_postings SET is_open = 1 WHERE id = ?', [postingId]);
    expect((await call(anon, 'submit_job_application', { p: { ...base, job_posting_id: null, email: mail('ada') } })).code).toBeNull(); // 2. başvuru
    expect((await call(anon, 'submit_job_application', { p: { ...base, job_posting_id: null, email: mail('ada') } })).code).toBe('P0429');
  });

  it('submit_testimonial: pending başlar, editör ve admine bildirim; doğrulama; yayında olmayan hizmet; 8 KB gövde', async () => {
    const base = { author_name: `${TAG} Ayşe Yılmaz`, body: 'Süreç planlandığı gibi ilerledi, montaj ekibi titizdi.', rating: 5, locale: 'tr', consent_kvkk: true, ip_masked: 'abc' };
    const r = await call(anon, 'submit_testimonial', { p: base });
    expect(r.code, String(r.message)).toBeNull();
    const id = (r.data as { id: string }).id;
    const row = await one<{ status: string; source: string; body: unknown; consent: number; sort_order: number | null }>('SELECT status, source, body, consent_kvkk_at IS NOT NULL AS consent, sort_order FROM testimonials WHERE id = ?', [id]);
    expect(row).toMatchObject({ status: 'pending', source: 'visitor', consent: 1 });
    expect(typeof row.body === 'string' ? JSON.parse(row.body) : row.body).toEqual({ tr: base.body });
    expect(row.sort_order).not.toBeNull();
    expect(await sql("SELECT target_role FROM notifications WHERE type = 'testimonial.pending' AND JSON_VALUE(payload, '$.author_name') = ? ORDER BY target_role", [base.author_name])).toEqual([{ target_role: 'admin' }, { target_role: 'editor' }]);
    for (const [p, re] of [[{ ...base, body: 'kısa' }, /body/], [{ ...base, rating: 6 }, /rating/], [{ ...base, consent_kvkk: false }, /consent/], [{ ...base, service_id: randomUUID() }, /service/], [{ ...base, company: 'x'.repeat(9000) }, /çok büyük/]] as const) {
      const e = await call(anon, 'submit_testimonial', { p });
      expect(e.code).toBe('22023');
      expect(e.message).toMatch(re);
    }
    expect((await call(anon, 'submit_testimonial', { p: { ...base, rating: '4.5' } })).code).toBe('22P02');
  });

  it('purge_expired_job_applications: yalnız service; süresi dolan başvuru silinir, CV yolu döner (geri alınan transaction)', async () => {
    expect((await call(anon, 'purge_expired_job_applications')).code).toBe('42501');
    expect((await call(as('admin'), 'purge_expired_job_applications')).code).toBe('42501');
    const cv = `cv/${TAG}-eski.pdf`;
    // Başkalarının süresi dolmuş satırları silinmesin diye kalıcı çalıştırılmaz
    const res = await withConnection(service, async (conn) => {
      await conn.beginTransaction();
      try {
        await conn.query("INSERT INTO job_applications (full_name, email, cv_path, consent_kvkk_at, retention_until) VALUES ('Eski', ?, ?, UTC_TIMESTAMP(6), CURRENT_DATE - INTERVAL 1 DAY)", [mail('eski'), cv]);
        return (await RPCS['purge_expired_job_applications']!(conn, service, {})) as { cv_bucket: string; cv_path: string | null }[];
      } finally {
        await conn.rollback();
      }
    });
    expect(res.ok && res.data).toContainEqual({ cv_bucket: 'private-documents', cv_path: cv });
  });
});
