import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anon, as, cannotWrite, count, createTestDb, seedUsers, user, type TestUsers } from './helpers/db';

let db: PGlite;
let users: TestUsers;
let token: string;

beforeAll(async () => {
  db = await createTestDb();
  users = await seedUsers(db);
  await db.query(`insert into public.leads (source, full_name, email, consent_kvkk_at, user_id) values
                    ('quote_form', 'Üye Bir', 'bir@example.com', now(), $1), ('quote_form', 'Üye İki', 'iki@example.com', now(), $2),
                    ('contact_form', 'Misafir', 'misafir@example.com', now(), null)`, [users.ids.member, users.otherMember]);
  await db.exec(`insert into public.lead_notes (lead_id, body) select id, 'İÇ NOT: pazarlık payı var' from public.leads;
                 insert into public.lead_replies (lead_id, subject, body) select id, 'Yanıt', 'Teklifiniz ektedir' from public.leads;`);
  const cfg = await db.query<{ public_token: string }>(`
    insert into public.configurations (user_id, owner_email, params, estimated_price, name) values
      ($1, null, '{"w":20,"l":40}', 1500000, 'Üyenin deposu'), ($2, null, '{"w":30,"l":60}', 3200000, 'Diğer üyenin deposu'),
      (null, 'anonim@example.com', '{"w":12,"l":24}', 800000, 'Anonim kayıt')
    returning public_token`, [users.ids.member, users.otherMember]);
  token = cfg.rows[2]!.public_token;
}, 120_000);
afterAll(async () => { await db.close(); });

describe('üye — yalnız KENDİ kayıtları', () => {
  it('kendi talebini görür; başkasınınkini ve misafirinkini GÖRMEZ', async () => {
    const names = await as(db, user(users.ids.member), async (tx) => (await tx.query<{ full_name: string }>('select full_name from public.leads')).rows.map((r) => r.full_name));
    expect(names).toEqual(['Üye Bir']);
  });

  it('kendi talebine yazılan cevabı görür ama İÇ NOTU asla', async () => {
    await as(db, user(users.ids.member), async (tx) => {
      expect(await count(tx, 'select 1 from public.lead_replies')).toBe(1);
      expect(await count(tx, 'select 1 from public.lead_notes')).toBe(0);
    });
  });

  it('talebini DEĞİŞTİREMEZ (durumu "kazanıldı" yapamaz)', async () => {
    expect(await as(db, user(users.ids.member), (tx) => cannotWrite(tx, `update public.leads set status = 'won'`))).toBe(true);
  });

  it('kendi konfigürasyonunu görür, düzenler, siler; başkasınınkine dokunamaz', async () => {
    await as(db, user(users.ids.member), async (tx) => {
      expect((await tx.query<{ name: string }>('select name from public.configurations')).rows.map((r) => r.name)).toEqual(['Üyenin deposu']);
      expect(await cannotWrite(tx, `update public.configurations set name = 'yeni ad' where name = 'Üyenin deposu'`)).toBe(false);
      expect(await cannotWrite(tx, `update public.configurations set name = 'ele geçirildi' where name = 'Diğer üyenin deposu'`)).toBe(true);
      expect(await cannotWrite(tx, `delete from public.configurations where name = 'Diğer üyenin deposu'`)).toBe(true);
    });
  });

  it("başkası ADINA kayıt açamaz (with check: user_id = auth.uid())", async () => {
    expect(await as(db, user(users.ids.member), (tx) => cannotWrite(tx, `insert into public.configurations (user_id, params) values ('${users.otherMember}', '{}')`))).toBe(true);
  });

  it('kendi konfigürasyonunu başkasına DEVREDEMEZ', async () => {
    expect(await as(db, user(users.ids.member), (tx) => cannotWrite(tx, `update public.configurations set user_id = '${users.otherMember}' where name = 'Üyenin deposu'`))).toBe(true);
  });

  it('fiyat üyeye açık, anonime KAPALI (K-29)', async () => {
    await db.exec(`insert into public.material_prices (code, name, category, unit, unit_price) values ('TEST', '{"tr":"Test"}', 'steel', 'kg', 1)`);
    expect(await as(db, user(users.ids.member), (tx) => count(tx, 'select 1 from public.material_prices'))).toBe(1);
    expect(await as(db, anon, (tx) => cannotWrite(tx, 'select 1 from public.material_prices'))).toBe(true);
  });
});

describe('anonim konfigürasyon — tabloya değil, parametreli RPC ye', () => {
  it('anonim tabloyu OKUYAMAZ (filtreyi kaldırıp tüm tabloyu çekemez)', async () => {
    expect(await as(db, anon, (tx) => cannotWrite(tx, 'select * from public.configurations'))).toBe(true);
  });

  it('doğru token → kayıt gelir; e-posta, IP ve (izin yoksa) FİYAT gelmez', async () => {
    const result = await as(db, anon, async (tx) => (await tx.query<{ c: Record<string, unknown> }>('select public.get_configuration_by_token($1) as c', [token])).rows[0]!.c);
    expect(result.name).toBe('Anonim kayıt');
    expect(result.params).toEqual({ w: 12, l: 24 });
    expect(result.estimated_price).toBeNull();
    expect(Object.keys(result)).not.toEqual(expect.arrayContaining(['owner_email', 'ip_masked', 'user_id', 'public_token']));
  });

  it('sahibi izin verince paylaşımda fiyat görünür', async () => {
    await db.query(`update public.configurations set share_price = true where public_token = $1`, [token]);
    const result = await as(db, anon, async (tx) => (await tx.query<{ c: Record<string, unknown> }>('select public.get_configuration_by_token($1) as c', [token])).rows[0]!.c);
    expect(Number(result.estimated_price)).toBe(800000);
  });

  it('yanlış token → null', async () => {
    const result = await as(db, anon, async (tx) => (await tx.query<{ c: unknown }>(`select public.get_configuration_by_token(gen_random_uuid()) as c`)).rows[0]!.c);
    expect(result).toBeNull();
  });
});

describe('profiller — yetki yükseltme', () => {
  it('kayıt olan herkes `member` başlar; meta veriyle rol İSTEYEMEZ', async () => {
    // İki ayrı ifade: tetikleyicinin ürettiği profil satırı, onu üreten ifadenin anlık görüntüsünde görünmez.
    const created = await db.query<{ id: string }>(`insert into auth.users (email, raw_user_meta_data) values ('hacker@test.local', '{"role":"super_admin","full_name":"H"}') returning id`);
    const { rows } = await db.query<{ role: string }>('select role from public.profiles where id = $1', [created.rows[0]!.id]);
    expect(rows[0]!.role).toBe('member');
  });

  it('üye kendi adını günceller ama rolünü YÜKSELTEMEZ', async () => {
    await as(db, user(users.ids.member), async (tx) => {
      expect(await cannotWrite(tx, `update public.profiles set full_name = 'Yeni Ad' where id = '${users.ids.member}'`)).toBe(false);
      expect(await cannotWrite(tx, `update public.profiles set role = 'super_admin' where id = '${users.ids.member}'`)).toBe(true);
    });
  });

  it('admin bile rol DEĞİŞTİREMEZ — yalnız super_admin (kullanıcı yönetimi)', async () => {
    const sql = `update public.profiles set role = 'admin' where id = '${users.ids.editor}'`;
    expect(await as(db, user(users.ids.admin), (tx) => cannotWrite(tx, sql))).toBe(true);
    expect(await as(db, user(users.ids.super_admin), (tx) => cannotWrite(tx, sql))).toBe(false);
  });

  it('son aktif super_admin devre dışı bırakılamaz (sistem sahipsiz kalmaz)', async () => {
    await expect(as(db, user(users.ids.super_admin), (tx) => tx.query(`update public.profiles set is_active = false where id = $1`, [users.ids.super_admin]))).rejects.toThrow(/Son aktif super_admin/);
  });

  it('üye başka üyeleri GÖRMEZ; satış personeli yalnız personeli görür; admin herkesi', async () => {
    expect(await as(db, user(users.ids.member), (tx) => count(tx, 'select 1 from public.profiles'))).toBe(1);
    expect(await as(db, user(users.ids.sales), (tx) => count(tx, `select 1 from public.profiles where role = 'member'`))).toBe(0);
    expect(await as(db, user(users.ids.sales), (tx) => count(tx, `select 1 from public.profiles where role <> 'member'`))).toBe(5);
    expect(await as(db, user(users.ids.admin), (tx) => count(tx, `select 1 from public.profiles where role = 'member'`))).toBeGreaterThanOrEqual(2);
  });
});

describe('bildirimler — kullanıcı VEYA rol hedefli', () => {
  it('rol hedefli bildirim yalnız o role düşer; okundu işareti kişiye özeldir ve payload değiştirilemez', async () => {
    await db.exec(`insert into public.notifications (target_role, type, payload) values ('sales', 'lead.created', '{"ref":"TLP-1"}')`);
    expect(await as(db, user(users.ids.editor), (tx) => count(tx, 'select 1 from public.notifications'))).toBe(0);
    await as(db, user(users.ids.sales), async (tx) => {
      const { rows } = await tx.query<{ id: string }>('select id from public.notifications');
      expect(rows).toHaveLength(1);
      expect(await cannotWrite(tx, `update public.notifications set payload = '{"ref":"sahte"}'`)).toBe(true);
      const marked = await tx.query<{ n: number }>('select public.mark_notifications_read($1) as n', [[rows[0]!.id]]);
      expect(marked.rows[0]!.n).toBe(1);
      expect((await tx.query<{ n: number }>('select public.mark_notifications_read($1) as n', [[rows[0]!.id]])).rows[0]!.n).toBe(0);
    });
  });
});
