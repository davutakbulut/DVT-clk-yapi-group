// Toplu e-posta RPC'lerinin MariaDB'ye karşı bütünleşik testi (K-108 → K-116); davranış kaynağı supabase/tests/mail-campaigns.test.ts.
//   MYSQL_URL=$MYSQL_TEST_URL npx vitest run src/core/db/mysql/__tests__/rpc-mail.int.test.ts
// Ortak test veritabanı: kitle her zaman bu teste özgü il ile süzülür; yalnız TAG'li satırlar yazılır ve silinir. Gerçek e-posta gönderilmez.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const enabled = !!process.env['MYSQL_URL'] && process.env['MYSQL_URL'] === process.env['MYSQL_TEST_URL'];
const TAG = `t${Date.now().toString(36)}`;
const D = `${TAG}.clk.local`;
const CITY = `İzmir ${TAG}`;
const CITY_LOWER = `izmir ${TAG}`;
const CITY_B = `Ankara ${TAG}`;
const ADMIN_EMAIL = `${TAG}-admin@clk-test.invalid`; // .invalid: kuyruk satırı yanlışlıkla işlense bile teslim edilemez

describe.skipIf(!enabled)('MariaDB toplu e-posta RPC', async () => {
  const { withConnection, withTransaction } = await import('../pool');
  type Actor = Parameters<typeof withTransaction>[0];
  const { MAIL_RPCS } = await import('../rpc/mail');
  const { RpcError } = await import('../rpc/registry');
  const { mapError } = await import('../rest/engine');

  const service: Actor = { kind: 'service' };
  const anon: Actor = { kind: 'anon' };
  let admin: Actor = anon;
  let adminId = '';
  const role = (r: string): Actor => ({ kind: 'user', userId: '00000000-0000-4000-8000-0000000000aa', role: r });

  const sql = async <T = Record<string, unknown>>(query: string, params: unknown[] = []) => {
    const r = await withConnection(service, async (c) => (await c.query(query, params))[0]);
    if (!r.ok) throw r.error.cause;
    return r.data as T[];
  };
  const one = async <T = Record<string, unknown>>(query: string, params: unknown[] = []) => (await sql<T>(query, params))[0]!;
  const count = async (query: string, params: unknown[] = []) => Number((await one<{ n: number }>(query, params)).n);
  /** PostgREST'in döndüreceği hata biçimi: RpcError aynen, MariaDB hatası PostgreSQL koduna çevrilmiş. */
  const call = async (actor: Actor, name: string, args: Record<string, unknown> = {}) => {
    const res = await withTransaction(actor, (conn) => MAIL_RPCS[name]!(conn, actor, args));
    if (res.ok) return res.data;
    const cause = res.error.cause;
    if (cause instanceof RpcError) throw cause;
    const m = mapError(cause);
    throw Object.assign(new Error(m.message), { code: m.code });
  };
  const fail = (code: string, re: RegExp) => ({ code, message: expect.stringMatching(re) });

  const AUDIENCE = {
    segments: ['customers_corporate', 'customers_individual', 'leads'],
    city: CITY,
    manual: [{ email: `Elle@${D}`, name: 'Elle Eklenen' }, { email: 'bozuk-adres' }, { email: `kurumsal@${D}`, name: 'Tekrar' }],
    manual_attested: true,
  };
  const campaign = (extra: Record<string, unknown> = {}) => ({ name: 'Eylül duyurusu', locale: 'tr', subject: 'Yeni ürünlerimiz', body: 'Merhaba {{full_name}},\n\nYeni ürünlerimizi inceleyin.', audience: AUDIENCE, ...extra });

  beforeAll(async () => {
    adminId = (await one<{ id: string }>("INSERT INTO users (email, meta) VALUES (?, '{}') RETURNING id", [ADMIN_EMAIL])).id;
    await sql("UPDATE profiles SET role = 'admin' WHERE id = ?", [adminId]);
    admin = { kind: 'user', userId: adminId, role: 'admin' };
    await sql(
      `INSERT INTO customers (type, company_title, full_name, contact_person, email, city, is_active, marketing_consent) VALUES
       ('corporate', 'Kurumsal A.Ş.', NULL, 'Ayşe Yetkili', ?, ?, TRUE, FALSE),
       ('corporate', 'Pasif Ltd.', NULL, NULL, ?, ?, FALSE, FALSE),
       ('corporate', 'Test Alanı A.Ş.', NULL, NULL, ?, ?, TRUE, FALSE),
       ('corporate', 'Küçük Harf Ltd.', NULL, NULL, ?, ?, TRUE, FALSE),
       ('individual', NULL, 'İzinli Birey', NULL, ?, ?, TRUE, TRUE),
       ('individual', NULL, 'İzinsiz Birey', NULL, ?, ?, TRUE, FALSE)`,
      [`Kurumsal@${D}`, CITY, `pasif@${D}`, CITY, `${TAG}@example.com`, CITY, `kucuk@${D}`, CITY_LOWER, `izinli@${D}`, CITY, `izinsiz@${D}`, CITY],
    );
    await sql(
      `INSERT INTO leads (ref_no, source, full_name, company, email, city, consent_kvkk_at, consent_marketing) VALUES
       (?, 'quote_form', 'Talep İzinli', 'Talep Ltd.', ?, ?, UTC_TIMESTAMP(6), TRUE),
       (?, 'quote_form', 'Talep İzinsiz', NULL, ?, ?, UTC_TIMESTAMP(6), FALSE),
       (?, 'contact_form', 'Aynı Adres', NULL, ?, ?, UTC_TIMESTAMP(6), TRUE),
       (?, 'contact_form', 'Çıkmış Kişi', NULL, ?, ?, UTC_TIMESTAMP(6), TRUE),
       (?, 'contact_form', 'Ankaralı', NULL, ?, ?, UTC_TIMESTAMP(6), TRUE)`,
      [`${TAG}-1`, `talep-izinli@${D}`, CITY, `${TAG}-2`, `talep-izinsiz@${D}`, CITY, `${TAG}-3`, `kurumsal@${D}`, CITY, `${TAG}-4`, `cikmis@${D}`, CITY, `${TAG}-5`, `ankara@${D}`, CITY_B],
    );
    await call(admin, 'add_mail_suppression', { p_email: `Cikmis@${D}`, p_reason: 'bounced', p_note: 'geri döndü' });
  }, 60_000);

  afterAll(async () => {
    const like = `%${TAG}%`;
    const rowIds = (
      await sql<{ id: string }>(
        `SELECT id FROM customers WHERE email LIKE ? UNION SELECT id FROM leads WHERE ref_no LIKE ? UNION SELECT id FROM mail_suppressions WHERE email LIKE ? UNION SELECT ?`,
        [like, like, like, adminId],
      )
    ).map((r) => r.id);
    await sql('DELETE FROM mail_campaigns WHERE created_by = ?', [adminId]);
    await sql('DELETE FROM mail_suppressions WHERE email LIKE ?', [like]);
    await sql('DELETE FROM email_queue WHERE to_email = ?', [ADMIN_EMAIL]);
    await sql('DELETE FROM customers WHERE email LIKE ?', [like]);
    await sql('DELETE FROM leads WHERE ref_no LIKE ?', [like]);
    if (rowIds.length) await sql('DELETE FROM audit_logs WHERE row_id IN (?) OR actor_id = ?', [rowIds, adminId]);
    await sql('DELETE FROM users WHERE id = ?', [adminId]);
  });

  it('yetki: anonim/üye/satış/servis panel RPC çağıramaz; INVOKER istatistik yetkisize boş', async () => {
    await expect(call(anon, 'save_mail_campaign', { p: campaign() })).rejects.toMatchObject({ code: '42501', status: 401 });
    for (const r of ['member', 'sales', 'editor', 'viewer']) {
      await expect(call(role(r), 'save_mail_campaign', { p: campaign() })).rejects.toMatchObject(fail('42501', /yetki yok/));
      await expect(call(role(r), 'mail_audience_preview', { p: AUDIENCE })).rejects.toMatchObject(fail('42501', /yetki yok/));
      await expect(call(role(r), 'enqueue_test_email', { p_template_key: 'lead.received', p_locale: 'tr' })).rejects.toMatchObject(fail('42501', /yetki yok/));
      expect(await call(role(r), 'mail_campaign_stats')).toEqual([]);
    }
    await expect(call(service, 'start_mail_campaign', { p_id: '00000000-0000-4000-8000-000000000000' })).rejects.toMatchObject(fail('42501', /yetki yok/));
    await expect(call(anon, 'mail_campaign_stats')).rejects.toMatchObject({ code: '42501' });
    await expect(call(admin, 'delete_mail_campaign', { p_id: 'yok' })).rejects.toMatchObject({ code: '22P02' });
  });

  it('kitle: kurumsal + izinli birey + izinli talep + onaylı elle liste; tekrar, pasif, izinsiz, bozuk, test alanı ve engelli adres girmez', async () => {
    const p = (await call(admin, 'mail_audience_preview', { p: AUDIENCE })) as { total: number; sample: { email: string; source: string; name: string | null; company: string | null }[] };
    expect(p).toMatchObject({ total: 4, suppressed: 1, customer: 2, lead: 1, manual: 1 });
    expect(p.sample.map((s) => `${s.email}:${s.source}`)).toEqual([`elle@${D}:manual`, `izinli@${D}:customer`, `kurumsal@${D}:customer`, `talep-izinli@${D}:lead`]);
    expect(p.sample.find((s) => s.email === `kurumsal@${D}`)).toMatchObject({ name: 'Ayşe Yetkili', company: 'Kurumsal A.Ş.' }); // müşteri kaydı önce gelir
    expect(await call(admin, 'mail_audience_preview', { p: { ...AUDIENCE, manual_attested: false } })).toMatchObject({ total: 3, manual: 0 });
    // İl TAM eşleşme: harmanlama 'izmir' = 'İzmir' derdi
    expect(await call(admin, 'mail_audience_preview', { p: { segments: AUDIENCE.segments, city: CITY_LOWER } })).toMatchObject({ total: 1, customer: 1 });
    expect(await call(admin, 'mail_audience_preview', { p: { segments: ['leads'], city: CITY_B } })).toMatchObject({ total: 1, lead: 1 });
    await expect(call(admin, 'mail_audience_preview', { p: { manual: [{ email: 'x'.repeat(270_000) }] } })).rejects.toMatchObject(fail('22023', /çok büyük/));
    const cities = ((await call(admin, 'mail_audience_cities')) as string[]).filter((c) => c.includes(TAG));
    expect(cities).toHaveLength(3);
    expect(cities[0]).toBe(CITY_B);
    expect(cities).toEqual(expect.arrayContaining([CITY, CITY_LOWER]));
  });

  it('taslak kaydet → başlat: alıcılar dondurulur; taslak dışı düzenlenmez/silinmez; duraklat · sürdür · iptal · yeniden dene', async () => {
    const id = (await call(admin, 'save_mail_campaign', { p: campaign() })) as string;
    expect(await call(admin, 'save_mail_campaign', { p: campaign({ id, subject: '  Güncel konu ' }) })).toBe(id);
    expect(await one('SELECT subject, status, created_by FROM mail_campaigns WHERE id = ?', [id])).toEqual({ subject: 'Güncel konu', status: 'draft', created_by: adminId });
    await expect(call(admin, 'save_mail_campaign', { p: campaign({ id: '00000000-0000-4000-8000-000000000000' }) })).rejects.toMatchObject(fail('P0002', /kampanya yok/));

    const empty = (await call(admin, 'save_mail_campaign', { p: { name: 'Boş', audience: { segments: [] } } })) as string;
    await expect(call(admin, 'start_mail_campaign', { p_id: empty })).rejects.toMatchObject(fail('22023', /konu ve metin/));
    const noOne = (await call(admin, 'save_mail_campaign', { p: campaign({ audience: { segments: [] } }) })) as string;
    await expect(call(admin, 'start_mail_campaign', { p_id: noOne })).rejects.toMatchObject(fail('22023', /alıcı yok/));
    await expect(call(admin, 'save_mail_campaign', { p: campaign({ cta_url: 'http://guvensiz.local' }) })).rejects.toMatchObject({ code: '23514' });
    await expect(call(admin, 'save_mail_campaign', { p: campaign({ audience: { manual: Array.from({ length: 2001 }, () => ({ email: 'a@b.local' })) } }) })).rejects.toMatchObject(fail('22023', /2000/));
    expect(await call(admin, 'delete_mail_campaign', { p_id: empty })).toBeNull();
    expect(await count('SELECT COUNT(*) AS n FROM mail_campaigns WHERE id = ?', [empty])).toBe(0);

    expect(await call(admin, 'start_mail_campaign', { p_id: id })).toBe(4);
    expect(await one('SELECT status, started_by, scheduled_at FROM mail_campaigns WHERE id = ?', [id])).toEqual({ status: 'sending', started_by: adminId, scheduled_at: null });
    await expect(call(admin, 'save_mail_campaign', { p: campaign({ id, subject: 'Sonradan' }) })).rejects.toMatchObject(fail('22023', /yalnız taslak düzenlenir/));
    await expect(call(admin, 'delete_mail_campaign', { p_id: id })).rejects.toMatchObject(fail('22023', /yalnız taslak silinir/));
    await expect(call(admin, 'start_mail_campaign', { p_id: id })).rejects.toMatchObject(fail('22023', /yalnız taslak başlatılır/));
    expect(await call(admin, 'set_mail_campaign_state', { p_id: id, p_action: 'pause' })).toBe('paused');
    expect(await call(admin, 'set_mail_campaign_state', { p_id: id, p_action: 'resume' })).toBe('sending');
    await expect(call(admin, 'set_mail_campaign_state', { p_id: id, p_action: 'retry' })).rejects.toMatchObject(fail('22023', /başarısız alıcı yok/));
    await expect(call(admin, 'set_mail_campaign_state', { p_id: id, p_action: 'bogus' })).rejects.toMatchObject(fail('22023', /bogus bu durumda \(sending\) uygulanamaz/));
    expect(await call(admin, 'mail_campaign_stats', { p_ids: [id] })).toEqual([{ campaign_id: id, total: 4, pending: 4, sent: 0, failed: 0, skipped: 0, unsubscribed: 0 }]);
    expect(await call(admin, 'mail_campaign_stats', { p_ids: [] })).toEqual([]);
    expect((await call(admin, 'mail_campaign_stats')) as unknown[]).toEqual(expect.arrayContaining([expect.objectContaining({ campaign_id: id, total: 4 })]));

    // İşçinin yazdığı sonuçları taklit et, sonra yeniden dene ve iptal
    await sql("UPDATE mail_campaign_recipients SET status = 'failed', error = 'smtp 550' WHERE campaign_id = ? AND email = ?", [id, `elle@${D}`]);
    await sql("UPDATE mail_campaign_recipients SET status = 'sent', sent_at = UTC_TIMESTAMP(6) WHERE campaign_id = ? AND email = ?", [id, `izinli@${D}`]);
    expect(await call(admin, 'set_mail_campaign_state', { p_id: id, p_action: 'retry' })).toBe('sending');
    expect(await count("SELECT COUNT(*) AS n FROM mail_campaign_recipients WHERE campaign_id = ? AND status = 'pending'", [id])).toBe(3);
    expect(await call(admin, 'set_mail_campaign_state', { p_id: id, p_action: 'cancel' })).toBe('cancelled');
    expect(await count("SELECT COUNT(*) AS n FROM mail_campaign_recipients WHERE campaign_id = ? AND status = 'skipped' AND error = 'cancelled'", [id])).toBe(3);
    expect(await count("SELECT COUNT(*) AS n FROM mail_campaign_recipients WHERE campaign_id = ? AND status = 'sent'", [id])).toBe(1);
    expect(await count('SELECT COUNT(*) AS n FROM mail_campaigns WHERE id = ? AND finished_at IS NOT NULL', [id])).toBe(1);
    await expect(call(admin, 'set_mail_campaign_state', { p_id: id, p_action: 'resume' })).rejects.toMatchObject(fail('22023', /uygulanamaz/));

    // Zamanlama: ileri tarih → scheduled; kopya → yeni taslak
    const copy = (await call(admin, 'duplicate_mail_campaign', { p_id: id, p_name: ' Eylül duyurusu (kopya) ' })) as string;
    expect(await one('SELECT status, name, created_by FROM mail_campaigns WHERE id = ?', [copy])).toEqual({ status: 'draft', name: 'Eylül duyurusu (kopya)', created_by: adminId });
    await expect(call(admin, 'duplicate_mail_campaign', { p_id: '00000000-0000-4000-8000-000000000000', p_name: 'x kopya' })).rejects.toMatchObject(fail('P0002', /kampanya yok/));
    const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
    await expect(call(admin, 'start_mail_campaign', { p_id: copy, p_at: inDays(200) })).rejects.toMatchObject(fail('22023', /90 gün/));
    expect(await call(admin, 'start_mail_campaign', { p_id: copy, p_at: inDays(2) })).toBe(4);
    expect(await count("SELECT COUNT(*) AS n FROM mail_campaigns WHERE id = ? AND status = 'scheduled' AND scheduled_at > UTC_TIMESTAMP(6)", [copy])).toBe(1);
    expect(await call(admin, 'set_mail_campaign_state', { p_id: copy, p_action: 'pause' })).toBe('paused');
    expect(await call(admin, 'set_mail_campaign_state', { p_id: copy, p_action: 'resume' })).toBe('scheduled');
    expect(await call(admin, 'set_mail_campaign_state', { p_id: copy, p_action: 'cancel' })).toBe('cancelled');
  });

  it('listeden çık: anahtarla engel kaydı + izinler geri alınır; bilinmeyen anahtar false; kişinin kendi isteği panelden kaldırılamaz', async () => {
    const id = (await call(admin, 'save_mail_campaign', { p: campaign({ name: 'Çıkış testi' }) })) as string;
    await call(admin, 'start_mail_campaign', { p_id: id });
    const token = async (email: string) => (await one<{ token: string }>('SELECT token FROM mail_campaign_recipients WHERE campaign_id = ? AND email = ?', [id, email])).token;
    const leadToken = await token(`talep-izinli@${D}`);
    const customerToken = await token(`izinli@${D}`);

    expect(await call(anon, 'mail_unsubscribe', { p_token: '00000000-0000-4000-8000-000000000000' })).toBe(false);
    expect(await call(anon, 'mail_unsubscribe', { p_token: null })).toBe(false);
    expect(await call(anon, 'mail_unsubscribe', { p_token: leadToken })).toBe(true);
    expect(await call(anon, 'mail_unsubscribe', { p_token: leadToken })).toBe(true); // ikinci tık zararsız
    expect(await call(anon, 'mail_unsubscribe', { p_token: customerToken })).toBe(true);

    expect(await count("SELECT COUNT(*) AS n FROM mail_suppressions WHERE reason = 'unsubscribed' AND campaign_id = ?", [id])).toBe(2);
    const own = await one<{ id: string }>('SELECT id FROM mail_suppressions WHERE email = ?', [`talep-izinli@${D}`]);
    expect(await count("SELECT COUNT(*) AS n FROM audit_logs WHERE table_name = 'mail_suppressions' AND row_id = ?", [own.id])).toBe(1); // ikinci tık denetim satırı yazmaz
    expect(await one('SELECT consent_marketing AS c FROM leads WHERE ref_no = ?', [`${TAG}-1`])).toEqual({ c: 0 });
    expect(await one('SELECT marketing_consent AS c FROM customers WHERE email = ?', [`izinli@${D}`])).toEqual({ c: 0 });
    expect(await count('SELECT COUNT(*) AS n FROM mail_campaign_recipients WHERE campaign_id = ? AND unsubscribed_at IS NOT NULL', [id])).toBe(2);
    expect(await call(admin, 'mail_campaign_stats', { p_ids: [id] })).toEqual([expect.objectContaining({ unsubscribed: 2 })]);
    // Çıkan adres bir sonraki kitleye girmez (izin de geri alındığı için engelli sayılmaz, hiç gelmez)
    expect(await call(admin, 'mail_audience_preview', { p: AUDIENCE })).toMatchObject({ total: 2, suppressed: 1 });

    // Kendi isteğiyle çıkan kayıt silinemez; bounce kaydı silinir
    await expect(call(admin, 'remove_mail_suppression', { p_id: own.id })).rejects.toMatchObject(fail('22023', /kişinin kendi isteği/));
    const bounced = await one<{ id: string }>('SELECT id FROM mail_suppressions WHERE email = ?', [`cikmis@${D}`]);
    expect(await call(admin, 'add_mail_suppression', { p_email: ` CIKMIS@${D} `, p_reason: 'manual' })).toBe(bounced.id); // var olan kayıt döner
    expect(await call(admin, 'remove_mail_suppression', { p_id: bounced.id })).toBeNull();
    expect(await count('SELECT COUNT(*) AS n FROM mail_suppressions WHERE email = ?', [`cikmis@${D}`])).toBe(0);
    await expect(call(admin, 'add_mail_suppression', { p_email: 'adres degil', p_reason: 'manual' })).rejects.toMatchObject(fail('22023', /e-posta/));
    await expect(call(admin, 'add_mail_suppression', { p_email: `a@${D}`, p_reason: 'unsubscribed' })).rejects.toMatchObject(fail('22023', /neden/));
    const added = (await call(admin, 'add_mail_suppression', { p_email: `Yeni@${D}`, p_reason: 'complaint', p_note: '  telefonla  ' })) as string;
    expect(await one('SELECT email, reason, note, created_by FROM mail_suppressions WHERE id = ?', [added])).toEqual({ email: `yeni@${D}`, reason: 'complaint', note: 'telefonla', created_by: adminId });
  });

  it('test e-postası: yöneticinin adresine öncelikli kuyruk satırı (gönderim yok)', async () => {
    const qid = (await call(admin, 'enqueue_test_email', { p_template_key: 'lead.received', p_locale: null })) as string;
    const row = await one<{ to_email: string; locale: string; priority: number; related_type: string; payload: { email: string; ref_no: string } }>(
      'SELECT to_email, locale, priority, related_type, payload FROM email_queue WHERE id = ?',
      [qid],
    );
    expect(row).toMatchObject({ to_email: ADMIN_EMAIL, locale: 'tr', priority: 1, related_type: 'test', payload: { email: ADMIN_EMAIL, ref_no: 'TLP-TEST-0001' } });
    await sql('DELETE FROM email_queue WHERE id = ?', [qid]);
    await expect(call({ kind: 'user', userId: '00000000-0000-4000-8000-0000000000ab', role: 'admin' }, 'enqueue_test_email', { p_template_key: 'x' })).rejects.toMatchObject(fail('22023', /e-posta yok/));
  });

  it('K-104: "listeden çık" eşiği aşılınca P0429', async () => {
    // veritabanı sayacı (throttle): bu pencerede hakkı doldur, aşan çağrı reddedilir; sonra pencereyi temizle
    const start = 'FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(UTC_TIMESTAMP(6)) / 600) * 600)';
    await sql(`INSERT INTO throttle (\`key\`, window_start, hits) VALUES ('unsub:global', ${start}, 300) ON DUPLICATE KEY UPDATE hits = 300`);
    await expect(call(anon, 'mail_unsubscribe', { p_token: '00000000-0000-4000-8000-000000000000' })).rejects.toMatchObject(fail('P0429', /rate_limited/));
    await sql("DELETE FROM throttle WHERE `key` = 'unsub:global'");
  });
});
