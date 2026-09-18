import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

// 0020: submit_lead (anonim, tek transaction: talep + kuyruk + bildirim), reply_lead (personel), şablon seed, heartbeat.
describe('0020 · talep + mail', () => {
  let db: PGlite;
  let users: TestUsers;
  beforeAll(async () => {
    db = await createTestDb();
    users = await seedUsers(db);
    await db.query(`update public.site_settings set value = '"bilgi@example.com"'::jsonb where key = 'contact.email'`);
  });
  afterAll(() => db.close());

  const submit = (p: Record<string, unknown>) => as(db, anon, async (tx) => (await tx.query<{ r: { id: string; ref_no: string } }>('select public.submit_lead($1::jsonb) as r', [JSON.stringify(p)])).rows[0]!.r);

  it('anonim talep: ref_no atanır; müşteri + firma maili kuyrukta; sales ve admin bildirimi', async () => {
    // as() geri alır → kalıcı için doğrudan (RPC security definer, anon rolüyle de aynı yolu izler)
    const { rows } = await db.query<{ r: { id: string; ref_no: string } }>(`select public.submit_lead($1::jsonb) as r`, [JSON.stringify({ source: 'quote_form', full_name: 'Ali Veli', email: 'Ali@Example.com', phone: '+905551112233', message: 'Depo yaptırmak istiyorum', consent_kvkk: true, locale: 'tr' })]);
    const r = rows[0]!.r;
    expect(r.ref_no).toMatch(/^TLP-\d{4}-\d{4}$/);
    const lead = (await db.query<{ email: string; status: string; source: string }>(`select email, status, source from public.leads where id = $1`, [r.id])).rows[0]!;
    expect(lead).toEqual({ email: 'ali@example.com', status: 'new', source: 'quote_form' });
    const queue = (await db.query<{ template_key: string; to_email: string }>(`select template_key, to_email from public.email_queue where related_id = $1 order by template_key`, [r.id])).rows;
    expect(queue).toEqual([
      { template_key: 'lead.received.company', to_email: 'bilgi@example.com' },
      { template_key: 'lead.received.customer', to_email: 'ali@example.com' },
    ]);
    const notes = (await db.query<{ target_role: string }>(`select target_role from public.notifications where type = 'lead.created' and link_path = $1 order by target_role`, ['/admin/leads/' + r.id])).rows;
    expect(notes.map((n) => n.target_role)).toEqual(['admin', 'sales']);
  });

  it('KVKK onayı yoksa, iletişim yoksa, geçersiz kaynak/dil → reddedilir', async () => {
    await expect(submit({ full_name: 'X Y', email: 'x@y.com', consent_kvkk: false })).rejects.toThrow(/consent/);
    await expect(submit({ full_name: 'X Y', consent_kvkk: true })).rejects.toThrow(/contact/);
    await expect(submit({ full_name: 'X Y', email: 'x@y.com', consent_kvkk: true, source: 'manual' })).rejects.toThrow(/source/);
    await expect(submit({ full_name: 'X Y', email: 'x@y.com', consent_kvkk: true, locale: 'de' })).rejects.toThrow(/locale/);
  });

  it('anonim leads/email_queue tablolarını okuyamaz ve doğrudan yazamaz', async () => {
    await expect(as(db, anon, (tx) => tx.query(`select * from public.leads`))).rejects.toThrow(/permission denied/);
    await expect(as(db, anon, (tx) => tx.query(`insert into public.email_queue (template_key, to_email) values ('x', 'a@b.c')`))).rejects.toThrow(/permission denied/);
  });

  it('reply_lead: sales cevap yazar → lead_replies + kuyruk, durum in_review; viewer ve anonim yazamaz', async () => {
    const id = (await db.query<{ r: { id: string } }>(`select public.submit_lead($1::jsonb) as r`, [JSON.stringify({ full_name: 'Ayşe K', email: 'ayse@example.com', consent_kvkk: true })])).rows[0]!.r.id;
    await expect(as(db, user(users.ids.viewer), (tx) => tx.query(`select public.reply_lead($1, 'Konu', 'Merhaba')`, [id]))).rejects.toThrow(/yetki yok/);
    await expect(as(db, anon, (tx) => tx.query(`select public.reply_lead($1, 'Konu', 'Merhaba')`, [id]))).rejects.toThrow();
    const replyId = await as(db, user(users.ids.sales), async (tx) => {
      const r = (await tx.query<{ r: string }>(`select public.reply_lead($1, 'Teklifiniz hazır', 'Ekte teklifimizi bulabilirsiniz.') as r`, [id])).rows[0]!.r;
      const status = (await tx.query<{ status: string }>(`select status from public.leads where id = $1`, [id])).rows[0]!.status;
      const replies = (await tx.query<{ n: number }>(`select count(*)::int as n from public.lead_replies where lead_id = $1`, [id])).rows[0]!.n;
      expect(status).toBe('in_review');
      expect(replies).toBe(1);
      return r;
    });
    expect(replyId).toMatch(/^[0-9a-f-]{36}$/);
    // Kuyruğu yalnız admin okur (0009): admin olarak cevap yazıp kuyruk satırını doğrula
    const queued = await as(db, user(users.ids.admin), async (tx) => {
      const r = (await tx.query<{ r: string }>(`select public.reply_lead($1, 'Konu', 'Gövde metni') as r`, [id])).rows[0]!.r;
      return (await tx.query<{ n: number }>(`select count(*)::int as n from public.email_queue where template_key = 'lead.reply.customer' and related_id = $1`, [r])).rows[0]!.n;
    });
    expect(queued).toBe(1);
  });

  it('şablonlar ve heartbeat seed; yeniden koşunca çoğalmaz', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const sql = readFileSync(join(__dirname, '..', 'migrations', '0020_leads_mail.sql'), 'utf8');
    await db.exec(sql.slice(sql.indexOf('insert into public.email_templates')));
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.email_templates`)).rows[0]!.n).toBe(3);
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.cron_heartbeats where job_key = 'mail_queue'`)).rows[0]!.n).toBe(1);
  });
});
