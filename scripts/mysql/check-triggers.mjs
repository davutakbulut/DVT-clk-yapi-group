#!/usr/bin/env node
// 0002_triggers.sql öz denetimi (K-116): her tetikleyici ailesini TEST veritabanında dener.
//   set -a; . ./.env.local; set +a; node scripts/mysql/check-triggers.mjs
// Yalnız MYSQL_TEST_URL'e bağlanır; her şey tek transaction'da yapılır ve sonda ROLLBACK edilir (sayaçlar dahil iz kalmaz).
import mysql from 'mysql2/promise';
import { randomUUID as uuid } from 'node:crypto';

const url = process.env.MYSQL_TEST_URL;
if (!url) { console.error('MYSQL_TEST_URL gerekli (ana veritabanına bağlanılmaz)'); process.exit(1); }
const db = await mysql.createConnection({ uri: url, timezone: 'Z', dateStrings: true, decimalNumbers: true });
// pool.ts ile aynı oturum: katı kip, NOT NULL ref_no gibi alanları tetikleyicinin doldurabildiği de burada sınanır
await db.query("SET time_zone = '+00:00', sql_mode = 'STRICT_ALL_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");

let failed = 0;
const check = (name, cond, detail = '') => { if (!cond) failed++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${!cond && detail ? `  → ${detail}` : ''}`); };
const run = async (sql, params = []) => (await db.query(sql, params))[0];
const one = async (sql, params = []) => (await run(sql, params))[0];
const as = (kind, role = null, uid = null) => run('SET @app_kind = ?, @app_role = ?, @app_uid = ?', [kind, role, uid]);
/** Beklenen SIGNAL: SQLSTATE ve mesaj parçası tutmalı. */
async function rejects(name, sql, params, state, msg) {
  try { await run(sql, params); check(name, false, 'hata beklenirken geçti'); }
  catch (e) { check(name, e.sqlState === state && e.message.includes(msg), `${e.sqlState} ${e.message}`); }
}
async function passes(name, sql, params) {
  try { await run(sql, params); check(name, true); } catch (e) { check(name, false, `${e.sqlState} ${e.message}`); }
}
// mysql2 JSON sütunlarını çoğunlukla ayrıştırılmış döndürür
const js = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
const auditCount = async (t, id, action) => (await one('SELECT COUNT(*) n FROM audit_logs WHERE table_name = ? AND row_id = ? AND action = ?', [t, id, action])).n;

const [{ n: trgCount }] = await run('SELECT COUNT(*) n FROM information_schema.triggers WHERE trigger_schema = DATABASE()');
check('0002 uygulanmış (98 tetikleyici)', trgCount === 98, `${trgCount}`);

await db.beginTransaction();
try {
  await run('SET @app_import = NULL');
  await as('service');
  const year = (await one('SELECT YEAR(CURRENT_DATE) y')).y;
  const today = (await one('SELECT CURRENT_DATE d')).d;

  // ── Kullanıcı → profil, yapılandırma sahiplenme (auth.users tetikleyicileri)
  const uAdmin = uuid(), uSuper = uuid(), uNew = uuid(), confId = uuid();
  const mail = `trg-${uNew.slice(0, 8)}@example.test`;
  await run('INSERT INTO users (id, email) VALUES (?, ?), (?, ?)', [uAdmin, `a-${uAdmin}@example.test`, uSuper, `s-${uSuper}@example.test`]);
  await run("UPDATE profiles SET role = 'admin' WHERE id = ?", [uAdmin]);
  const supers = (await one("SELECT COUNT(*) n FROM profiles WHERE role = 'super_admin' AND is_active")).n;
  await run("UPDATE profiles SET role = 'super_admin' WHERE id = ?", [uSuper]);
  await run("INSERT INTO configurations (id, owner_email, params) VALUES (?, ?, '{}')", [confId, mail]);
  await run(`INSERT INTO users (id, email, meta) VALUES (?, ?, '{"full_name":"Deneme Kişi"}')`, [uNew, mail.toUpperCase()]);
  check('users ekleme → profil oluşur, ad meta.full_name', (await one('SELECT full_name f FROM profiles WHERE id = ?', [uNew]))?.f === 'Deneme Kişi');
  check('onaysız kullanıcı yapılandırmayı sahiplenmez', (await one('SELECT user_id u FROM configurations WHERE id = ?', [confId])).u === null);
  await run('UPDATE users SET email_confirmed_at = CURRENT_TIMESTAMP(6) WHERE id = ?', [uNew]);
  const conf = await one('SELECT user_id u, owner_email e, claimed_at c FROM configurations WHERE id = ?', [confId]);
  check('e-posta onayı → yapılandırma sahiplenilir (büyük harfli e-posta)', conf.u === uNew && conf.e === null && conf.c !== null, JSON.stringify(conf));

  // ── Sıra numarası (assign_sort_order, assign_menu_item_sort_order)
  const catA = uuid(), catB = uuid(), catC = uuid(), catD = uuid();
  const base = (await one('SELECT COALESCE(MAX(sort_order), 0) m FROM product_categories WHERE parent_id IS NULL')).m;
  const cat = (id, parent, sort = null) => run(`INSERT INTO product_categories (id, slug, name, parent_id, sort_order) VALUES (?, JSON_OBJECT('tr', ?), '{"tr":"Kategori"}', ?, ?)`, [id, `trg-${id.slice(0, 8)}`, parent, sort]);
  await cat(catA, null); await cat(catB, null); await cat(catC, catA); await cat(catD, catA, 50);
  const so = async (id) => (await one('SELECT sort_order s FROM product_categories WHERE id = ?', [id])).s;
  check('sort_order boşsa max+1 (kök)', (await so(catA)) === base + 1 && (await so(catB)) === base + 2);
  check('sort_order üst kayda göre ayrı sayılır (parent_id)', (await so(catC)) === 1);
  check('verilen sort_order korunur', (await so(catD)) === 50);
  const menuId = uuid(), mi1 = uuid(), mi2 = uuid(), mi3 = uuid();
  await run("INSERT INTO menus (id, `key`) VALUES (?, 'mobile_extra')", [menuId]);
  const mi = (id, parent) => run(`INSERT INTO menu_items (id, menu_id, parent_id, label, link_type) VALUES (?, ?, ?, '{"tr":"Öğe"}', 'none')`, [id, menuId, parent]);
  await mi(mi1, null); await mi(mi2, null); await mi(mi3, mi1);
  const ms = async (id) => (await one('SELECT sort_order s FROM menu_items WHERE id = ?', [id])).s;
  check('menü öğesi sırası menü + üst öğeye göre', (await ms(mi1)) === 1 && (await ms(mi2)) === 2 && (await ms(mi3)) === 1);

  // ── Belge numaraları (TLP / SAT / PRF)
  const lead = async (ref = null) => { const id = uuid(); await run("INSERT INTO leads (id, ref_no, source, full_name, email, consent_kvkk_at) VALUES (?, ?, 'manual', 'Deneme', 'lead@example.test', CURRENT_TIMESTAMP(6))", [id, ref]); return (await one('SELECT ref_no r FROM leads WHERE id = ?', [id])).r; };
  const r1 = await lead(), r2 = await lead();
  await run("INSERT INTO leads (source, full_name, email, consent_kvkk_at) VALUES ('manual', 'Deneme', 'lead-omit@example.test', CURRENT_TIMESTAMP(6))");
  check('talep ref_no sütun hiç verilmeden de dolar (katı kip)', /^TLP-/.test((await one("SELECT ref_no r FROM leads WHERE email = 'lead-omit@example.test'")).r));
  check('talep ref_no TLP-yıl-0000 ve ardışık', new RegExp(`^TLP-${year}-\\d{4}$`).test(r1) && Number(r2.slice(-4)) === Number(r1.slice(-4)) + 1, `${r1} ${r2}`);
  check('verilen ref_no korunur', (await lead('ELLE-1')) === 'ELLE-1');
  const custId = uuid();
  await run("INSERT INTO customers (id, full_name) VALUES (?, 'Deneme Müşteri')", [custId]);
  const s1 = uuid(), s2 = uuid();
  await run('INSERT INTO sales (id, customer_id) VALUES (?, ?)', [s1, custId]);
  await run("INSERT INTO sales (id, customer_id, sale_date) VALUES (?, ?, '2024-05-01')", [s2, custId]);
  const sNo = async (id) => (await one('SELECT sale_no n FROM sales WHERE id = ?', [id])).n;
  check('satış no SAT-yıl-0000 (bugün)', new RegExp(`^SAT-${year}-\\d{4}$`).test(await sNo(s1)), await sNo(s1));
  check('satış no satış tarihinin yılından', /^SAT-2024-\d{4}$/.test(await sNo(s2)), await sNo(s2));
  const inv = async (type, no = null) => { const id = uuid(); await run('INSERT INTO invoices (id, invoice_no, sale_id, customer_id, type, base_amount, vat_amount, total_amount, collectable_amount) VALUES (?, ?, ?, ?, ?, 100, 20, 120, 120)', [id, no, s1, custId, type]); return (await one('SELECT invoice_no n FROM invoices WHERE id = ?', [id])).n; };
  check('proforma no PRF-yıl-0000', new RegExp(`^PRF-${year}-\\d{4}$`).test(await inv('proforma')));
  check('e-fatura numarası otomatik verilmez', (await inv('e_invoice')) === null);

  // ── Satış yazma koruması
  await as('user', 'editor', uAdmin);
  await rejects('satış: yetkisiz rol reddedilir', 'INSERT INTO sales (customer_id) VALUES (?)', [custId], '42501', 'Satış kaydı yazma yetkiniz yok');
  await as('anon');
  await rejects('satış: anonim reddedilir', 'INSERT INTO sales (customer_id) VALUES (?)', [custId], '42501', 'Satış kaydı yazma yetkiniz yok');
  await as('user', 'sales', uAdmin);
  await rejects('satış: sales rolü maliyet yazamaz', 'INSERT INTO sales (customer_id, total_cost) VALUES (?, 10)', [custId], '42501', 'yalnız yönetici yazabilir (total_cost)');
  await passes('satış: sales rolü maliyetsiz ekler', 'INSERT INTO sales (customer_id) VALUES (?)', [custId]);
  const itemId = uuid();
  await passes('satış kalemi: sales rolü ekler', "INSERT INTO sale_items (id, sale_id, description, quantity, unit, unit_price, line_total) VALUES (?, ?, 'Kalem', 2, 'adet', 10, 20)", [itemId, s1]);
  await rejects('satış kalemi: sales rolü maliyet güncelleyemez', 'UPDATE sale_items SET unit_cost = 5, line_cost = 10, line_profit = 10 WHERE id = ?', [itemId], '42501', 'yalnız yönetici yazabilir (unit_cost)');
  await passes('satış kalemi: sales rolü maliyet dışı alanı günceller', "UPDATE sale_items SET description = 'Kalem 2' WHERE id = ?", [itemId]);
  await rejects('satış: sales rolü silemez', 'DELETE FROM sales WHERE id = ?', [s2], '42501', 'Satış kaydını yalnız yönetici silebilir');
  await as('user', 'admin', uAdmin);
  await passes('satış kalemi: admin maliyet yazar', 'UPDATE sale_items SET unit_cost = 5, line_cost = 10, line_profit = 10 WHERE id = ?', [itemId]);
  await passes('satış: admin siler', 'DELETE FROM sales WHERE id = ?', [s2]);

  // ── Denetim kaydı (audit_row) + içe aktarma susması
  const aud = await one("SELECT actor_id a, old_data o, new_data n FROM audit_logs WHERE table_name = 'sale_items' AND row_id = ? AND action = 'UPDATE' ORDER BY created_at DESC LIMIT 1", [itemId]);
  const audNew = aud && js(aud.n);
  check('denetim: güncelleme kaydı, aktör @app_uid', aud?.a === uAdmin && audNew.unit_cost === 5 && js(aud.o).unit_cost === null, JSON.stringify(aud));
  check('denetim: zaman ISO-8601 UTC', /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}\+00:00$/.test(audNew?.created_at ?? ''), audNew?.created_at);
  check('denetim: silme kaydı yalnız old_data', (await one("SELECT COUNT(*) n FROM audit_logs WHERE table_name = 'sales' AND row_id = ? AND action = 'DELETE' AND new_data IS NULL AND old_data IS NOT NULL", [s2])).n === 1);
  const ins = await one("SELECT new_data n FROM audit_logs WHERE table_name = 'customers' AND row_id = ? AND action = 'INSERT'", [custId]);
  check('denetim: ekleme, boolean true/false olarak', ins && js(ins.n).is_active === true && js(ins.n).marketing_consent === false, JSON.stringify(ins?.n));
  await as('service');
  await run("UPDATE profiles SET last_seen_at = CURRENT_TIMESTAMP(6), saved_basket = '[1]' WHERE id = ?", [uNew]);
  check('denetim: profil yalnız sepet/son görülme değişince yazılmaz', (await auditCount('profiles', uNew, 'UPDATE')) === 0);
  await run("UPDATE profiles SET full_name = 'deneme kişi' WHERE id = ?", [uNew]);
  check('denetim: profil adında yalnız büyük/küçük harf değişimi yazılır', (await auditCount('profiles', uNew, 'UPDATE')) === 1);
  await run('SET @app_import = 1');
  const custImp = uuid();
  await run("INSERT INTO customers (id, full_name) VALUES (?, 'İçe Aktarılan')", [custImp]);
  check('içe aktarma: denetim kaydı yazılmaz', (await auditCount('customers', custImp, 'INSERT')) === 0);
  await run('SET @app_import = NULL');

  // ── Profil yetki koruması
  await as('user', 'admin', uAdmin);
  await rejects('profil: admin rol değiştiremez', "UPDATE profiles SET role = 'editor' WHERE id = ?", [uNew], '42501', 'Rol ve aktiflik yalnız super_admin tarafından değiştirilebilir');
  await rejects('profil: admin aktifliği değiştiremez', 'UPDATE profiles SET is_active = FALSE WHERE id = ?', [uNew], '42501', 'Rol ve aktiflik');
  await passes('profil: admin rol dışı alanı günceller', "UPDATE profiles SET phone = '1' WHERE id = ?", [uNew]);
  await as('user', 'super_admin', uSuper);
  await passes('profil: super_admin rol değiştirir', "UPDATE profiles SET role = 'editor' WHERE id = ?", [uNew]);
  if (supers === 0) await rejects('profil: son aktif super_admin düşürülemez', "UPDATE profiles SET role = 'admin' WHERE id = ?", [uSuper], '23514', 'Son aktif super_admin devre dışı bırakılamaz');
  else console.log('SKIP  profil: son super_admin (test veritabanında başka super_admin var)');

  // ── Yorum: tek seviye yanıt
  await as('service');
  const post = async () => { const id = uuid(); await run(`INSERT INTO blog_posts (id, slug, title) VALUES (?, JSON_OBJECT('tr', ?), '{"tr":"Yazı"}')`, [id, `trg-${id.slice(0, 8)}`]); return id; };
  const p1 = await post(), p2 = await post();
  const cm = (id, postId, parent) => run("INSERT INTO post_comments (id, post_id, parent_id, author_name, body) VALUES (?, ?, ?, 'Okur', 'Merhaba')", [id, postId, parent]);
  const cA = uuid(), cB = uuid();
  await cm(cA, p1, null);
  await passes('yorum: üst yoruma yanıt', "INSERT INTO post_comments (id, post_id, parent_id, author_name, body) VALUES (?, ?, ?, 'Okur', 'Merhaba')", [cB, p1, cA]);
  await rejects('yorum: yanıta yanıt reddedilir', "INSERT INTO post_comments (post_id, parent_id, author_name, body) VALUES (?, ?, 'Okur', 'Merhaba')", [p1, cB], '23514', 'Yorum yanıtları tek seviyedir');
  await rejects('yorum: başka yazının yorumuna yanıt reddedilir', "INSERT INTO post_comments (post_id, parent_id, author_name, body) VALUES (?, ?, 'Okur', 'Merhaba')", [p2, cA], '23514', 'aynı yazıya ait olmalıdır');
  await rejects('yorum: güncellemeyle yanıta bağlama reddedilir', 'UPDATE post_comments SET parent_id = ? WHERE id = ?', [cB, cA], '23514', 'tek seviyedir');

  // ── Slug geçmişi
  const prod = uuid(), s0 = `trg-${prod.slice(0, 8)}`;
  await run(`INSERT INTO products (id, slug, name) VALUES (?, JSON_OBJECT('tr', ?), '{"tr":"Ürün"}')`, [prod, s0]);
  const hist = () => run("SELECT locale l, old_slug s FROM slug_history WHERE entity_type = 'product' AND entity_id = ? ORDER BY old_slug", [prod]);
  await run(`UPDATE products SET slug = JSON_OBJECT('tr', ?, 'en', ?) WHERE id = ?`, [`${s0}-yeni`, `${s0}-en`, prod]);
  let h = await hist();
  check('slug: eski tr slug geçmişe yazılır (en yeni eklendi, yazılmaz)', h.length === 1 && h[0].l === 'tr' && h[0].s === s0, JSON.stringify(h));
  await run(`UPDATE products SET slug = JSON_OBJECT('tr', ?, 'en', ?) WHERE id = ?`, [s0, `${s0}-en`, prod]);
  h = await hist();
  check('slug: yeniden kullanılan slug geçmişten düşer', h.length === 1 && h[0].s === `${s0}-yeni`, JSON.stringify(h));
  await run("UPDATE products SET status = 'archived' WHERE id = ?", [prod]);
  check('slug: slug değişmeyince yazılmaz', (await hist()).length === 1);
  await run('SET @app_import = 1');
  await run(`UPDATE products SET slug = JSON_OBJECT('tr', ?) WHERE id = ?`, [`${s0}-ice`, prod]);
  check('içe aktarma: slug geçmişi yazılmaz', (await hist()).length === 1);
  await run('SET @app_import = NULL');

  // ── Malzeme fiyatı geçmişi + fiyat rehberi dokunuşu
  const mp = uuid(), pg = uuid();
  await run(`INSERT INTO material_prices (id, code, name, category, unit, unit_price, valid_from) VALUES (?, ?, '{"tr":"Profil"}', 'steel', 'kg', 10, '2020-01-01')`, [mp, `TRG-${mp.slice(0, 8)}`]);
  await run(`INSERT INTO price_guides (id, slug, title, disclaimer) VALUES (?, JSON_OBJECT('tr', ?), '{"tr":"Rehber"}', '{"tr":"Not"}')`, [pg, `trg-${pg.slice(0, 8)}`]);
  check('fiyat rehberi: başlangıçta prices_updated_at boş', (await one('SELECT prices_updated_at t FROM price_guides WHERE id = ?', [pg])).t === null);
  await run(`INSERT INTO price_guide_rows (price_guide_id, system_type, material_price_id) VALUES (?, '{"tr":"Sistem"}', ?)`, [pg, mp]);
  check('fiyat rehberi: satır ekleme prices_updated_at doldurur', (await one('SELECT prices_updated_at t FROM price_guides WHERE id = ?', [pg])).t !== null);
  await run("UPDATE price_guides SET prices_updated_at = '2000-01-01' WHERE id = ?", [pg]);
  await run("UPDATE material_prices SET note = 'not' WHERE id = ?", [mp]);
  check('fiyat: fiyat dışı değişiklik geçmiş yazmaz', (await one('SELECT COUNT(*) n FROM material_price_history WHERE material_price_id = ?', [mp])).n === 0);
  await as('user', 'admin', uAdmin);
  await run('UPDATE material_prices SET unit_price = 12 WHERE id = ?', [mp]);
  const ph = await one('SELECT unit_price p, currency c, valid_from f, valid_until u, changed_by b FROM material_price_history WHERE material_price_id = ?', [mp]);
  check('fiyat: eski fiyat geçmişe yazılır', ph?.p === 10 && ph.c === 'TRY' && ph.f === '2020-01-01' && ph.u === today && ph.b === uAdmin, JSON.stringify(ph));
  check('fiyat: valid_from bugüne çekilir', (await one('SELECT valid_from f FROM material_prices WHERE id = ?', [mp])).f === today);
  check('fiyat rehberi: malzeme fiyatı değişince güncellenir', !(await one('SELECT prices_updated_at t FROM price_guides WHERE id = ?', [pg])).t.startsWith('2000'));
} catch (e) {
  failed++;
  console.log(`FAIL  beklenmeyen hata: ${e.sqlState ?? ''} ${e.message}`);
} finally {
  await db.rollback();
  await run('SET @app_kind = NULL, @app_role = NULL, @app_uid = NULL, @app_import = NULL');
}
const left = (await one("SELECT (SELECT COUNT(*) FROM users WHERE email LIKE '%@example.test') + (SELECT COUNT(*) FROM material_prices WHERE code LIKE 'TRG-%') n")).n;
check('temizlik: test kayıtları geri alındı', left === 0, `${left}`);
await db.end();
console.log(failed ? `\n${failed} denetim başarısız` : '\nTüm denetimler geçti');
process.exit(failed ? 1 : 0);
