// İçerik / arama / analitik / konfigüratör RPC'lerinin MariaDB bütünleşik testi (K-116). MYSQL_TEST_URL yoksa atlanır.
// Davranış tanımı supabase/tests (services, products, projects, solutions, blog, price-guides, configurator-pages,
// slug-resolution, search, analytics, errors, system, abuse, rls-members).
//   MYSQL_URL=$MYSQL_TEST_URL npx vitest run src/core/db/mysql/__tests__/rpc-content.int.test.ts
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const enabled = !!process.env['MYSQL_URL'] && process.env['MYSQL_URL'] === process.env['MYSQL_TEST_URL'];
const TAG = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}\+00:00$/;
// Yanıt PostgREST'teki gibi tipsiz JSON (testte derin alan erişimi için)
type Wire = ReturnType<typeof JSON.parse>;

describe.skipIf(!enabled)('MariaDB RPC: içerik, arama, analitik, konfigüratör', { timeout: 90_000 }, async () => {
  const { withConnection, withTransaction } = await import('../pool');
  type Actor = Parameters<typeof withConnection>[0];
  const { mapError } = await import('../rest/engine');
  const { RpcError } = await import('../rpc/registry');
  const { CONTENT_RPCS, searchSnippet, searchNorm } = await import('../rpc/content');
  const { ANALYTICS_RPCS } = await import('../rpc/analytics');
  const { CONFIGURATOR_RPCS } = await import('../rpc/configurator');
  const RPCS = { ...CONTENT_RPCS, ...ANALYTICS_RPCS, ...CONFIGURATOR_RPCS };

  const service: Actor = { kind: 'service' };
  const anon: Actor = { kind: 'anon' };
  const memberId = randomUUID();
  const user = (role: string, id = randomUUID()): Actor => ({ kind: 'user', userId: id, role });
  const member: Actor = { kind: 'user', userId: memberId, role: 'member' };
  const editor = user('editor');
  const viewer = user('viewer');
  const admin = user('admin');

  /** RPC'yi tek transaction'da çağırır; PostgREST'in döndüreceği { data, code } biçimi (JSON gidiş-dönüşüyle). */
  async function call(actor: Actor, name: string, args: Record<string, unknown> = {}): Promise<{ data: Wire; code: string | null; message: string | null }> {
    const res = await withTransaction(actor, (conn) => RPCS[name]!(conn, actor, args));
    if (res.ok) return { data: JSON.parse(JSON.stringify(res.data ?? null)), code: null, message: null };
    const c = res.error.cause;
    const e = c instanceof RpcError ? { code: c.code, message: c.message } : mapError(c);
    return { data: null, code: e.code, message: e.message };
  }
  const ok = async (actor: Actor, name: string, args: Record<string, unknown> = {}) => {
    const r = await call(actor, name, args);
    expect(r.code, String(r.message)).toBeNull();
    return r.data;
  };
  async function sql<T = Record<string, Wire>>(query: string, params: unknown[] = []): Promise<T[]> {
    const res = await withConnection(service, async (conn) => (await conn.query(query, params))[0] as T[]);
    if (!res.ok) throw res.error.cause;
    return res.data;
  }
  /** Satır ekler (nesne/dizi → JSON), id döndürür. */
  async function ins(table: string, row: Record<string, unknown>): Promise<string> {
    const cols = Object.keys(row);
    const vals = cols.map((c) => (row[c] !== null && typeof row[c] === 'object' ? JSON.stringify(row[c]) : row[c]));
    const [r] = await sql<{ id: string }>(`INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) RETURNING id`, vals);
    return r!.id;
  }
  const winStart = (w: number) => `FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(UTC_TIMESTAMP(6)) / ${w}) * ${w})`;
  /** Eşiği sınıra doldurur: sıradaki çağrı P0429 almalı. */
  const fillThrottle = (key: string, limit: number, w = 600) =>
    sql(`INSERT INTO throttle (\`key\`, window_start, hits) VALUES (?, ${winStart(w)}, ?) ON DUPLICATE KEY UPDATE hits = VALUES(hits)`, [key, limit]);
  const THROTTLE_KEYS = ['redirect:global', 'error:global', 'analytics:global', 'config:global', 'share:global'];

  const tr = (s: string) => ({ tr: s });
  const pub = { status: 'published', published_locales: ['tr'] };
  const id: Record<string, string> = {};
  const created: [string, string][] = []; // [tablo, id] — silme sırası tersten
  const add = async (key: string, table: string, row: Record<string, unknown>) => {
    id[key] = await ins(table, row);
    created.push([table, id[key]!]);
    return id[key]!;
  };
  let configuratorKey: string | null = null;
  const sid = randomUUID();
  const pvid = randomUUID();
  const DAY = '2001-03-04';

  beforeAll(async () => {
    await sql('INSERT INTO users (id, email) VALUES (?, ?)', [memberId, `${TAG}-member@test.local`]);
    await add('media', 'media_library', { storage_path: `${TAG}/a.jpg`, file_name: 'a.jpg', mime_type: 'image/jpeg', size_bytes: 10, width: 800, height: 600, alt: tr('Kapak'), variants: { w400: 'x' } });
    await add('service', 'services', {
      ...pub, slug: tr(`${TAG}-hizmet`), title: tr('Çelik Hizmet'), body: tr('Gövde'),
      process_steps: [{ title: tr('Keşif ve ön proje'), description: tr('Yerinde') }, { title: { en: 'Only EN' } }],
    });
    await add('cat', 'product_categories', { slug: tr(`${TAG}-kat`), name: tr('Kategori'), is_active: 1 });
    await add('product', 'products', {
      ...pub, slug: tr(`${TAG}-kutu-profil`), name: tr('Kutu Profil Kalınlık'), short_description: tr('Kare ve dikdörtgen kesitli soğuk şekillendirilmiş profiller'),
      description: tr('Çelik karkas ve çatı aşıklarında kullanılır.'), category_id: id['cat'], service_id: id['service'], cover_image_id: id['media'], is_featured: 1, published_at: '2026-01-02 03:04:05.000000',
    });
    await add('variant', 'product_variants', { product_id: id['product'], size_label: '40×40×2', stock_code: `ARAMA-${TAG}-40X40X2`, is_active: 1, variant_group: { code: 'kare' } });
    await add('spec', 'product_specs', { product_id: id['product'], name: tr('Et kalınlığı'), value: tr('2'), unit: 'mm' });
    await add('pimg', 'product_images', { product_id: id['product'], media_id: id['media'], alt: tr('') });
    await add('pfaq', 'faqs', { ...pub, entity_type: 'product', entity_id: id['product'], question: tr('Kesim var mı?'), answer: tr('Evet.') });
    await add('pfaqEn', 'faqs', { ...pub, entity_type: 'service', entity_id: id['service'], question: { tr: 'Süre?', en: 'How long?' }, answer: { tr: 'Projeye göre.', en: 'Depends.' } });
    await add('draft', 'products', { status: 'draft', published_locales: ['tr'], slug: tr(`${TAG}-taslak`), name: tr('Taslak Şekillendirilmiş'), category_id: id['cat'] });
    await add('en', 'products', {
      status: 'published', published_locales: ['tr', 'en'], translation_meta: { en: { reviewed: true } }, slug: { tr: `${TAG}-iki-dil`, en: `${TAG}-two-lang` },
      name: { tr: 'İki dil', en: 'Two languages' }, category_id: id['cat'],
    });
    await add('project', 'projects', { ...pub, slug: tr(`${TAG}-proje`), title: tr('Depo'), location: tr('Kocaeli'), area_m2: 2400, started_on: '2025-01-01', body: tr('Proje gövdesi') });
    await sql('INSERT INTO service_projects (service_id, project_id) VALUES (?, ?)', [id['service'], id['project']]);
    await add('solution', 'solutions', {
      ...pub, slug: tr(`${TAG}-cozum`), title: tr('Çözüm'), service_id: id['service'],
      comparison: { alternative: tr('Betonarme'), rows: [{ criterion: tr('Süre'), steel: tr('Hızlı'), alternative: tr('Yavaş') }, { criterion: { en: 'x' } }] },
      advantages: [{ title: tr('Hafif'), description: tr('Az yük') }], cta: { title: tr('Teklif alın'), button: tr('Gönder') },
    });
    await add('tm', 'team_members', { ...pub, full_name: 'Ayşe Yılmaz', position: tr('Mühendis'), photo_id: id['media'] });
    await add('bcat', 'blog_categories', { slug: tr(`${TAG}-bkat`), name: tr('Rehber'), is_active: 1 });
    await add('tag', 'blog_tags', { slug: tr(`${TAG}-etiket`), name: tr('Çelik') });
    await add('post', 'blog_posts', { ...pub, slug: tr(`${TAG}-yazi`), title: tr('Yazı'), body: tr('Metin'), reading_minutes: tr('5'), category_id: id['bcat'], author_id: id['tm'], allow_comments: 1 });
    await sql('INSERT INTO blog_post_tags (post_id, tag_id) VALUES (?, ?)', [id['post'], id['tag']]);
    await add('mp', 'material_prices', { code: `${TAG}-mp`, name: tr('Sac'), category: 'steel', unit: 'kg', unit_price: 100 });
    await add('guide', 'price_guides', { ...pub, slug: tr(`${TAG}-fiyat`), title: tr('Fiyat Rehberi'), disclaimer: tr('Fiyatlar tahminidir.'), service_id: id['service'] });
    await add('row1', 'price_guide_rows', { price_guide_id: id['guide'], system_type: tr('Çatı'), material_price_id: id['mp'], min_factor: 1, max_factor: 1.555 });
    await add('row2', 'price_guide_rows', { price_guide_id: id['guide'], system_type: tr('Duvar'), min_factor: 1, max_factor: 2 });
    await add('faq', 'faqs', { ...pub, question: tr(`Kesim yapıyor musunuz ${TAG}?`), answer: tr(`Evet, ${TAG} ölçüye kesim yapılır.`) });
    const used = (await sql<{ k: string }>('SELECT configurator_key AS k FROM configurator_pages')).map((r) => r.k);
    configuratorKey = ['hall', 'multi_storey', 'cladding', 'mezzanine', 'fence', 'drywall'].find((k) => !used.includes(k)) ?? null;
    if (configuratorKey) {
      await add('cpage', 'configurator_pages', {
        ...pub, configurator_key: configuratorKey, slug: tr(`${TAG}-hal`), title: tr('Hal'),
        benefits: [{ title: tr('Hızlı'), description: tr('d') }], steps: [{ title: tr('Ölç') }], faqs: [{ question: tr('S?'), answer: tr('C.') }, { question: tr('Cevapsız') }], cta: { title: tr('Başla') },
      });
    }
  });

  afterAll(async () => {
    await sql('DELETE FROM blog_post_tags WHERE post_id = ?', [id['post'] ?? '']);
    await sql('DELETE FROM service_projects WHERE service_id = ?', [id['service'] ?? '']);
    await sql('DELETE FROM slug_history WHERE entity_id IN (?, ?)', [id['product'] ?? '', id['service'] ?? '']);
    for (const [table, rowId] of [...created].reverse()) await sql(`DELETE FROM \`${table}\` WHERE id = ?`, [rowId]);
    await sql('DELETE FROM redirects WHERE source_path LIKE ?', [`/${TAG}%`]);
    await sql('DELETE FROM error_logs WHERE module LIKE ?', [`${TAG}%`]);
    await sql('DELETE FROM analytics_sessions WHERE id = ?', [sid]);
    await sql('DELETE FROM heatmap_aggregates WHERE path LIKE ?', [`/${TAG}%`]);
    await sql('DELETE FROM scroll_depth_aggregates WHERE path LIKE ?', [`/${TAG}%`]);
    await sql('DELETE FROM form_analytics WHERE form_key = ?', [TAG]);
    await sql('DELETE FROM configurations WHERE owner_email LIKE ? OR user_id = ?', [`${TAG}%`, memberId]);
    await sql('DELETE FROM users WHERE id = ?', [memberId]);
    await sql(`DELETE FROM throttle WHERE \`key\` IN (${THROTTLE_KEYS.map(() => '?').join(', ')})`, THROTTLE_KEYS);
  });

  // ---------------------------------------------------------------- slug ile detay

  it('ürün: içerik, boolean/zaman/JSON biçimi, ilişkiler, görsel alt yedeği; EN slug yok; taslak anonime görünmez, editöre görünür', async () => {
    const p = await ok(anon, 'get_product_by_slug', { p_locale: 'tr', p_slug: `${TAG}-kutu-profil` });
    expect(p).toMatchObject({ id: id['product'], slug: `${TAG}-kutu-profil`, name: 'Kutu Profil Kalınlık', is_featured: true, published_at: '2026-01-02T03:04:05.000000+00:00' });
    expect(p.updated_at).toMatch(ISO);
    expect(p.seo).toEqual({ title: null, description: null, canonical_url: null, noindex: false, og_image: null });
    expect(p.alternates).toEqual({ tr: `${TAG}-kutu-profil`, en: null });
    expect(p.cover).toEqual({ bucket: expect.any(String), path: `${TAG}/a.jpg`, width: 800, height: 600, alt: 'Kapak', blur: null, variants: { w400: 'x' } });
    expect(p.category).toEqual({ id: id['cat'], slug: `${TAG}-kat`, name: 'Kategori' });
    expect(p.service).toEqual({ slug: `${TAG}-hizmet`, title: 'Çelik Hizmet' });
    expect(p.images).toHaveLength(1);
    expect(p.images[0].alt).toBe('Kapak'); // boş görsel alt'ı → medya alt'ı
    expect(p.specs).toEqual([{ group: null, name: 'Et kalınlığı', value: '2', unit: 'mm' }]);
    expect(p.variants[0]).toMatchObject({ size_label: '40×40×2', stock_code: `ARAMA-${TAG}-40X40X2`, variant_group: 'kare' });
    expect(p.documents).toEqual([]);
    expect(p.projects).toEqual([{ slug: `${TAG}-proje`, title: 'Depo' }]);
    expect(p.faqs).toEqual([{ question: 'Kesim var mı?', answer: 'Evet.' }]);
    expect((await call(anon, 'get_product_by_slug', { p_locale: 'en', p_slug: `${TAG}-kutu-profil` })).data).toBeNull();
    expect((await call(anon, 'get_product_by_slug', { p_locale: 'TR', p_slug: `${TAG}-kutu-profil` })).data).toBeNull();
    // slug harmanlaması büyük/küçük harf duyarsız olsa da tam eşleşme
    expect((await call(anon, 'get_product_by_slug', { p_locale: 'tr', p_slug: `${TAG}-KUTU-profil` })).data).toBeNull();
    expect((await call(anon, 'get_product_by_slug', { p_locale: 'tr', p_slug: `${TAG}-taslak` })).data).toBeNull();
    expect((await ok(editor, 'get_product_by_slug', { p_locale: 'tr', p_slug: `${TAG}-taslak` }))?.name).toBe('Taslak Şekillendirilmiş');
    const en = await ok(anon, 'get_product_by_slug', { p_locale: 'en', p_slug: `${TAG}-two-lang` });
    expect(en).toMatchObject({ name: 'Two languages', alternates: { tr: `${TAG}-iki-dil`, en: `${TAG}-two-lang` } });
  });

  it('hizmet: süreç adımları o dilde (başlıksız düşer), projeler kapaklı, yalnız-TR SSS EN sayfaya sızmaz', async () => {
    const s = await ok(anon, 'get_service_by_slug', { p_locale: 'tr', p_slug: `${TAG}-hizmet` });
    expect(s.process_steps).toEqual([{ title: 'Keşif ve ön proje', description: 'Yerinde' }]);
    expect(s.projects).toEqual([{ slug: `${TAG}-proje`, title: 'Depo', location: 'Kocaeli', cover: null }]);
    expect(s.faqs).toEqual([{ question: 'Süre?', answer: 'Projeye göre.' }]);
    expect(s.images).toEqual([]);
    expect((await call(anon, 'get_service_by_slug', { p_locale: 'en', p_slug: `${TAG}-hizmet` })).data).toBeNull();
  });

  it('proje, çözüm, blog, fiyat rehberi, konfigüratör sayfası', async () => {
    const pr = await ok(anon, 'get_project_by_slug', { p_locale: 'tr', p_slug: `${TAG}-proje` });
    expect(pr).toMatchObject({ body: 'Proje gövdesi', area_m2: 2400, started_on: '2025-01-01', completed_on: null, services: [{ slug: `${TAG}-hizmet`, title: 'Çelik Hizmet' }], categories: [] });

    const so = await ok(anon, 'get_solution_by_slug', { p_locale: 'tr', p_slug: `${TAG}-cozum` });
    expect(so.comparison).toEqual({ alternative: 'Betonarme', rows: [{ criterion: 'Süre', steel: 'Hızlı', alternative: 'Yavaş' }] });
    expect(so.advantages).toEqual([{ title: 'Hafif', description: 'Az yük' }]);
    expect(so.cta).toEqual({ title: 'Teklif alın', lead: null, button: 'Gönder' });
    expect(so.service).toEqual({ slug: `${TAG}-hizmet`, title: 'Çelik Hizmet' });
    expect(so.projects).toHaveLength(1);

    const b = await ok(anon, 'get_blog_post_by_slug', { p_locale: 'tr', p_slug: `${TAG}-yazi` });
    expect(b).toMatchObject({ reading_minutes: 5, allow_comments: true, is_featured: false, category: { slug: `${TAG}-bkat`, name: 'Rehber' }, tags: [{ slug: `${TAG}-etiket`, name: 'Çelik' }] });
    expect(b.author).toMatchObject({ name: 'Ayşe Yılmaz', position: 'Mühendis', photo: { alt: 'Kapak' } });
    expect(b.seo.focus_keyword).toBeNull();

    // DEFINER: material_prices anonime kapalı ama rehber satırında fiyat görünür
    const g = await ok(anon, 'get_price_guide_by_slug', { p_locale: 'tr', p_slug: `${TAG}-fiyat` });
    expect(g).toMatchObject({ disclaimer: 'Fiyatlar tahminidir.', vat_included: expect.any(Boolean), service: { slug: `${TAG}-hizmet` }, faqs: [] });
    expect(g.rows).toEqual([
      expect.objectContaining({ system_type: 'Çatı', unit_price: 100, min_price: 100, max_price: 155.5, unit: 'kg' }),
      expect.objectContaining({ system_type: 'Duvar', unit_price: null, min_price: null, max_price: null }),
    ]);
    expect(typeof g.is_stale).toBe('boolean');
    await sql("UPDATE price_guides SET status = 'draft' WHERE id = ?", [id['guide']]);
    expect((await call(anon, 'get_price_guide_by_slug', { p_locale: 'tr', p_slug: `${TAG}-fiyat` })).data).toBeNull();

    if (configuratorKey) {
      const c = await ok(anon, 'get_configurator_page_by_slug', { p_locale: 'tr', p_slug: `${TAG}-hal` });
      expect(c).toMatchObject({ configurator_key: configuratorKey, benefits: [{ title: 'Hızlı', description: 'd' }], steps: [{ title: 'Ölç', description: null }], faqs: [{ question: 'S?', answer: 'C.' }], cta: { title: 'Başla', lead: null, button: null } });
      expect((await call(anon, 'get_configurator_page_by_slug', { p_locale: 'en', p_slug: `${TAG}-hal` })).data).toBeNull();
    }
  });

  it("slug değişince resolve_old_slug yeni slug'ı verir; bilinmeyen tür/dil null", async () => {
    await sql(`UPDATE services SET slug = ? WHERE id = ?`, [JSON.stringify(tr(`${TAG}-hizmet-yeni`)), id['service']]);
    expect(await ok(anon, 'resolve_old_slug', { p_entity_type: 'service', p_locale: 'tr', p_old_slug: `${TAG}-hizmet` })).toBe(`${TAG}-hizmet-yeni`);
    expect(await ok(anon, 'resolve_old_slug', { p_entity_type: 'nope', p_locale: 'tr', p_old_slug: `${TAG}-hizmet` })).toBeNull();
    expect(await ok(anon, 'resolve_old_slug', { p_entity_type: 'service', p_locale: 'de', p_old_slug: `${TAG}-hizmet` })).toBeNull();
    await sql(`UPDATE services SET slug = ? WHERE id = ?`, [JSON.stringify(tr(`${TAG}-hizmet`)), id['service']]);
  });

  // ---------------------------------------------------------------- arama

  it('arama: normalizasyon (ş/ı), alan, sıra, ölçü kodu, SSS, taslak/EN/kısa sorgu', async () => {
    const search = async (q: string, locale = 'tr') => (await ok(anon, 'search_site', { p_locale: locale, p_q: q, p_limit: 50 })) as { kind: string; slug: string; field: string; snippet: string; rank: number }[];
    expect(searchNorm('İSTANBUL Çelik ığ')).toBe('istanbul celik ig');
    const mine = (await search('SEKILLENDIRILMIS')).filter((r) => r.slug.startsWith(TAG));
    expect(mine).toEqual([expect.objectContaining({ kind: 'product', slug: `${TAG}-kutu-profil`, field: 'excerpt', rank: 20 })]);
    expect(mine[0]!.snippet).toContain('şekillendirilmiş');
    const title = (await search('kutu profil kalinlik')).find((r) => r.slug === `${TAG}-kutu-profil`);
    expect(title).toMatchObject({ field: 'title', rank: 30 });
    const byCode = (await search(`ARAMA-${TAG}`))[0];
    expect(byCode).toMatchObject({ field: 'variants', rank: 15 });
    expect(byCode!.snippet).toContain(`ARAMA-${TAG}-40X40X2`);
    const faq = (await search(`${TAG} ölçüye kesim`))[0];
    expect(faq).toMatchObject({ kind: 'faq', slug: id['faq'], field: 'body' });
    expect(await search('k')).toEqual([]);
    expect(await search('x'.repeat(61))).toEqual([]);
    expect((await search(TAG, 'en')).filter((r) => r.slug.startsWith(TAG))).toEqual([]);
    expect(searchSnippet('Önce [kutu profil](/tr/urunler/kutu-profil) sonra aşık', 'sonra')).toBe('Önce kutu profil sonra aşık');
    expect(searchSnippet(`${'a'.repeat(100)} hedef ${'b'.repeat(200)}`, 'HEDEF')).toBe(`…${'a'.repeat(59)} hedef ${'b'.repeat(84)}…`); // pos-60'tan 150 karakter
  });

  // ---------------------------------------------------------------- sıralama ve panel

  it('reorder_content: editör sıralar (yer değiştirme benzersiz sırada çakışmaz), değişmeyen sayılmaz; izleyici 0, anonim 42501, izinsiz tablo 22023', async () => {
    // (parent_id, sort_order) benzersiz: kendi üst kategorimizin altında 1 ve 2 bizim
    const parent = await add('rparent', 'product_categories', { slug: tr(`${TAG}-ust`), name: tr('Üst'), is_active: 1 });
    const c1 = await add('rc1', 'product_categories', { slug: tr(`${TAG}-alt1`), name: tr('Alt 1'), is_active: 1, parent_id: parent });
    const c2 = await add('rc2', 'product_categories', { slug: tr(`${TAG}-alt2`), name: tr('Alt 2'), is_active: 1, parent_id: parent });
    const order = async () => (await sql<{ id: string }>('SELECT id FROM product_categories WHERE parent_id = ? ORDER BY sort_order', [parent])).map((r) => r.id);
    expect(await order()).toEqual([c1, c2]);
    expect(await ok(viewer, 'reorder_content', { p_table: 'product_categories', p_ids: [c2, c1] })).toBe(0);
    expect((await call(anon, 'reorder_content', { p_table: 'product_categories', p_ids: [c2, c1] })).code).toBe('42501');
    expect(await ok(editor, 'reorder_content', { p_table: 'product_categories', p_ids: [c2, c1] })).toBe(2);
    expect(await order()).toEqual([c2, c1]);
    expect(await ok(editor, 'reorder_content', { p_table: 'product_categories', p_ids: [c2, c1] })).toBe(0);
    expect((await call(editor, 'reorder_content', { p_table: 'profiles', p_ids: [c1] })).code).toBe('22023');
    expect((await call(editor, 'reorder_content', { p_table: 'product_categories', p_ids: ['bozuk'] })).code).toBe('22P02');
    expect(await ok(editor, 'reorder_menu_items', { p_ids: [] })).toBe(0);
    expect((await call(anon, 'reorder_menu_items', { p_ids: [] })).code).toBe('42501');
  });

  it('admin_dashboard_counts: sayılar; bildirim yalnız kendi okunmamışı; anonim 42501', async () => {
    await add('notif', 'notifications', { user_id: memberId, type: `${TAG}.test`, read_by: [] });
    const c = await ok(member, 'admin_dashboard_counts');
    expect(Object.keys(c).sort()).toEqual(['customers', 'errors_24h', 'leads_open', 'leads_today', 'media', 'members', 'notifications', 'overdue_schedules', 'pending_reviews', 'staff']);
    expect(c.notifications).toBe(1);
    expect(typeof c.media).toBe('number');
    await sql('UPDATE notifications SET read_by = ? WHERE id = ?', [JSON.stringify([memberId]), id['notif']]);
    expect((await ok(member, 'admin_dashboard_counts')).notifications).toBe(0);
    expect((await ok(admin, 'admin_dashboard_counts')).media).toBeGreaterThanOrEqual(1);
    expect((await call(anon, 'admin_dashboard_counts')).code).toBe('42501');
  });

  // ---------------------------------------------------------------- yönlendirme, hata, analitik

  it('record_redirect_hit: aktif olan sayılır, pasif ve uzun yol sayılmaz; eşik P0429', async () => {
    await sql("INSERT INTO redirects (source_path, target_path, status_code) VALUES (?, '/tr/yeni', 308), (?, '/tr', 301)", [`/${TAG}-eski`, `/${TAG}-pasif`]);
    await sql('UPDATE redirects SET is_active = FALSE WHERE source_path = ?', [`/${TAG}-pasif`]);
    expect(await ok(anon, 'record_redirect_hit', { p_path: `/${TAG}-eski` })).toBeNull();
    await ok(anon, 'record_redirect_hit', { p_path: `/${TAG}-pasif` });
    await ok(anon, 'record_redirect_hit', { p_path: `/${TAG}-ESKI` });
    await ok(anon, 'record_redirect_hit', { p_path: `/${'x'.repeat(600)}` });
    const hits = await sql<{ p: string; n: number; at: string | null }>('SELECT source_path AS p, hit_count AS n, last_hit_at AS at FROM redirects WHERE source_path LIKE ? ORDER BY 1', [`/${TAG}%`]);
    expect(hits.map((h) => [h.p, Number(h.n)])).toEqual([[`/${TAG}-eski`, 1], [`/${TAG}-pasif`, 0]]);
    await fillThrottle('redirect:global', 600);
    expect((await call(anon, 'record_redirect_hit', { p_path: `/${TAG}-eski` })).code).toBe('P0429');
  });

  it('report_error: parmak izi gruplar, ziyaretçi sayar, yeniden açılır; büyük gövde 22023, büyük context düşer', async () => {
    const m = `${TAG}-products`;
    expect(await ok(anon, 'report_error', { p: { source: 'client', module: m, message: 'Kayıt 42 bulunamadı', path: '/tr/urunler/x', visitor: 'v1' } })).toMatchObject({ new: true });
    expect(await ok(anon, 'report_error', { p: { source: 'client', module: m, message: 'Kayıt 77 bulunamadı', path: '/tr/urunler/y', visitor: 'v2' } })).toMatchObject({ new: false, reopened: false });
    await ok(anon, 'report_error', { p: { source: 'client', module: `${TAG}-blog`, message: 'Kayıt 42 bulunamadı' } });
    const [row] = await sql<{ id: string; occurrences: number; affected_users: number; path: string; context: { visitors: string[] } }>(
      'SELECT id, occurrences, affected_users, path, context FROM error_logs WHERE module = ?', [m]);
    expect(row).toMatchObject({ occurrences: 2, affected_users: 2, path: '/tr/urunler/y', context: { visitors: ['v1', 'v2'] } });
    await sql('UPDATE error_logs SET resolved_at = UTC_TIMESTAMP(6) WHERE id = ?', [row!.id]);
    expect(await ok(anon, 'report_error', { p: { source: 'client', module: m, message: 'Kayıt 9 bulunamadı', status_code: 404 } })).toEqual({ id: row!.id, new: false, reopened: true });
    expect((await sql<{ r: string | null }>('SELECT resolved_at AS r FROM error_logs WHERE id = ?', [row!.id]))[0]!.r).toBeNull();
    expect((await call(anon, 'report_error', { p: { module: m, message: 'a'.repeat(17_000) } })).code).toBe('22023');
    await ok(anon, 'report_error', { p: { source: 'weird', level: 'x', module: `${TAG}-ctx`, message: '  boyut testi ', context: { blob: 'b'.repeat(5000) } } });
    const [ctx] = await sql<{ context: unknown; source: string; level: string; message: string }>('SELECT context, source, level, message FROM error_logs WHERE module = ?', [`${TAG}-ctx`]);
    expect(ctx).toMatchObject({ source: 'client', level: 'error', message: 'boyut testi', context: { visitors: [], last: {} } });
    expect((await call(anon, 'report_error', { p: { module: m, message: 'x', status_code: 'abc' } })).code).toBe('22P02');
    await fillThrottle('error:global', 600);
    expect((await call(anon, 'report_error', { p: { module: m, message: 'x' } })).code).toBe('P0429');
  });

  const batch = {
    session: { id: sid, visitor: 'v-abc', device: 'mobile', browser: 'Chrome', os: 'Android', locale: 'tr', referrer_host: 'chatgpt.com', referrer_kind: 'ai', utm: { source: 'x' }, landing_path: `/${TAG}`, ip_masked: '10.0.0.0' },
    pageviews: [{ id: pvid, path: `/${TAG}`, locale: 'tr', duration_ms: 1200, max_scroll_pct: 40, viewport_w: 390, viewport_h: 800, viewed_at: `${DAY}T10:00:00Z` }],
    events: [
      { pageview_id: pvid, type: 'click', path: `/${TAG}`, x_pct: 50.5, y_pct: 12.25, selector: 'a.btn', element_text: 'Teklif', occurred_at: `${DAY}T10:00:01Z` },
      { pageview_id: randomUUID(), type: 'rage_click', path: `/${TAG}`, x_pct: 50.5, y_pct: 12.25, occurred_at: `${DAY}T10:00:02Z` },
      { type: 'bogus', path: '' },
    ],
    vitals: [{ path: `/${TAG}`, metric: 'LCP', value: 1800.5, rating: 'good' }, { path: `/${TAG}`, metric: 'XXX', value: 1 }],
    forms: [{ form_key: TAG, field_name: 'email', focus: 1, abandon: 1, time_ms: 4000 }],
  };

  it('ingest_analytics: anonim yazar, kimlik tuzlu özet, bozuk olay/vital düşer, tekrar gelen pageview büyür; hatalı oturum 22023', async () => {
    expect(await ok(anon, 'ingest_analytics', { p: batch })).toEqual({ pageviews: 1, events: 2 });
    const [s] = await sql<{ visitor_hash: string; referrer_kind: string; pageview_count: number; exit_path: string; utm: unknown }>(
      'SELECT visitor_hash, referrer_kind, pageview_count, exit_path, utm FROM analytics_sessions WHERE id = ?', [sid]);
    expect(s!.visitor_hash).toMatch(/^[0-9a-f]{32}$/);
    expect(s).toMatchObject({ referrer_kind: 'ai', pageview_count: 1, exit_path: `/${TAG}`, utm: { source: 'x' } });
    const evs = await sql<{ type: string; pageview_id: string | null; x_pct: number }>('SELECT type, pageview_id, x_pct FROM analytics_events WHERE session_id = ? ORDER BY occurred_at', [sid]);
    expect(evs).toEqual([{ type: 'click', pageview_id: pvid, x_pct: 50.5 }, { type: 'rage_click', pageview_id: null, x_pct: 50.5 }]); // başka oturumun görüntülemesi bağlanmaz
    expect((await sql('SELECT 1 FROM web_vitals WHERE session_id = ?', [sid])).length).toBe(1);
    const [f] = await sql<{ focus_count: number; total_time_ms: number }>('SELECT focus_count, total_time_ms FROM form_analytics WHERE form_key = ?', [TAG]);
    expect(f).toEqual({ focus_count: 1, total_time_ms: 4000 });
    await ok(anon, 'ingest_analytics', { p: { ...batch, pageviews: [{ ...batch.pageviews[0], duration_ms: 9000, max_scroll_pct: 100 }], events: [], vitals: [], forms: [batch.forms[0]] } });
    const [pv] = await sql<{ duration_ms: number; max_scroll_pct: number }>('SELECT duration_ms, max_scroll_pct FROM analytics_pageviews WHERE id = ?', [pvid]);
    expect(pv).toEqual({ duration_ms: 9000, max_scroll_pct: 100 });
    expect((await sql<{ focus_count: number }>('SELECT focus_count FROM form_analytics WHERE form_key = ?', [TAG]))[0]!.focus_count).toBe(2);
    expect((await call(anon, 'ingest_analytics', { p: { session: { id: sid, visitor: 'v', device: 'tv' } } })).code).toBe('22023');
    expect((await call(anon, 'ingest_analytics', { p: { session: { id: sid, device: 'mobile' } } })).message).toMatch(/visitor/);
    expect((await call(anon, 'ingest_analytics', { p: { session: { id: 'bozuk', visitor: 'v', device: 'mobile' } } })).code).toBe('22P02');
    expect((await call(anon, 'ingest_analytics', { p: { ...batch, junk: 'x'.repeat(270_000) } })).code).toBe('22023');
  });

  it('web_vitals_summary: p75 ve derecelendirme sayıları; anonim 42501, üye boş', async () => {
    await sql('UPDATE web_vitals SET recorded_at = ? WHERE session_id = ?', [`${DAY} 12:00:00`, sid]);
    for (const v of [1000, 2000, 3000, 4000]) {
      await sql('INSERT INTO web_vitals (session_id, path, device, metric, value, rating, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [sid, `/${TAG}`, 'desktop', 'INP', v, v <= 2500 ? 'good' : 'needs_improvement', `${DAY} 12:00:00`]);
    }
    const rows = ((await ok(viewer, 'web_vitals_summary', { p_from: DAY, p_to: DAY })) as { path: string; metric: string }[]).filter((r) => r.path === `/${TAG}`);
    expect(rows.find((r) => r.metric === 'INP')).toEqual({ path: `/${TAG}`, metric: 'INP', samples: 4, p75: 3250, good: 2, needs_improvement: 2, poor: 0 });
    expect(rows.find((r) => r.metric === 'LCP')).toMatchObject({ samples: 1, p75: 1800.5 });
    expect((await call(anon, 'web_vitals_summary', { p_from: DAY, p_to: DAY })).code).toBe('42501');
    expect(await ok(member, 'web_vitals_summary', { p_from: DAY, p_to: DAY })).toEqual([]);
    expect((await call(viewer, 'web_vitals_summary', { p_from: 'dün', p_to: DAY })).code).toBe('22007');
  });

  it('aggregate_analytics_day: sıcaklık + scroll satırları; izleyici/anonim reddedilir. purge: yalnız service, özet korunur', async () => {
    expect((await call(viewer, 'aggregate_analytics_day', { p_day: DAY })).code).toBe('42501');
    expect((await call(anon, 'aggregate_analytics_day', { p_day: DAY })).code).toBe('42501');
    const agg = await ok(admin, 'aggregate_analytics_day', { p_day: DAY });
    expect(agg).toEqual({ heatmap_rows: 2, scroll_rows: 1 });
    expect(await ok(service, 'aggregate_analytics_day', { p_day: DAY })).toEqual(agg);
    const heat = await sql<{ kind: string; bucket_x: number; bucket_y: number; hits: number }>('SELECT kind, bucket_x, bucket_y, hits FROM heatmap_aggregates WHERE path = ? ORDER BY kind', [`/${TAG}`]);
    expect(heat).toEqual([{ kind: 'click', bucket_x: 50, bucket_y: 12, hits: 1 }, { kind: 'rage_click', bucket_x: 50, bucket_y: 12, hits: 1 }]);
    const [scroll] = await sql('SELECT views, reached_25, reached_100, device FROM scroll_depth_aggregates WHERE path = ?', [`/${TAG}`]);
    expect(scroll).toEqual({ views: 1, reached_25: 1, reached_100: 1, device: 'mobile' });

    expect((await call(anon, 'purge_old_analytics', { p_keep_days: 60 })).code).toBe('42501');
    expect((await call(admin, 'purge_old_analytics', { p_keep_days: 60 })).code).toBe('42501');
    // paylaşılan test veritabanı: yalnız bu oturumu (1900) kesecek kadar uzun saklama süresi
    await sql("UPDATE analytics_sessions SET started_at = '1900-01-01' WHERE id = ?", [sid]);
    expect(await ok(service, 'purge_old_analytics', { p_keep_days: 36500 })).toBeGreaterThanOrEqual(1);
    expect(await sql('SELECT 1 FROM analytics_pageviews WHERE id = ?', [pvid])).toEqual([]);
    expect(await sql('SELECT 1 FROM web_vitals WHERE session_id = ?', [sid])).toEqual([]);
    expect((await sql('SELECT 1 FROM heatmap_aggregates WHERE path = ?', [`/${TAG}`])).length).toBe(2);
  });

  it('ingest_analytics eşiği P0429', async () => {
    await fillThrottle('analytics:global', 3000);
    expect((await call(anon, 'ingest_analytics', { p: batch })).code).toBe('P0429');
  });

  // ---------------------------------------------------------------- konfigüratör

  it('save_configuration + get_configuration_by_token + set_configuration_sharing: sahiplik, sürüm, fiyat gizliliği', async () => {
    const base = { name: `${TAG} kayıt`, locale: 'tr', params: { w: 12, l: 24 }, owner_email: ` ${TAG}-Anon@Example.com `, consent_kvkk: true, estimated_price: 800000, tonnage_kg: 12.5,
      items: [{ element_group: 'column', profile_code: 'HEA200', piece_count: 4, total_length_m: '24.5', total_weight_kg: 1000 }, { profile_code: '' }] };
    expect((await call(anon, 'save_configuration', { p: { ...base, owner_email: 'yok' } })).message).toMatch(/email/);
    expect((await call(anon, 'save_configuration', { p: { ...base, consent_kvkk: false } })).message).toMatch(/consent/);
    expect((await call(anon, 'save_configuration', { p: { ...base, params: [1] } })).message).toMatch(/params/);
    expect((await call(anon, 'save_configuration', { p: { ...base, locale: 'de' } })).message).toMatch(/locale/);
    expect((await call(anon, 'save_configuration', { p: { ...base, items: Array.from({ length: 101 }, () => ({})) } })).message).toMatch(/items/);
    expect((await call(anon, 'save_configuration', { p: { ...base, blob: 'x'.repeat(70_000) } })).message).toMatch(/büyük/);

    const saved = await ok(anon, 'save_configuration', { p: base });
    expect(saved).toEqual({ id: expect.any(String), ref_code: expect.any(String), public_token: expect.any(String), version: 1 });
    expect((await sql<{ e: string }>('SELECT owner_email AS e FROM configurations WHERE id = ?', [saved.id]))[0]!.e).toBe(`${TAG}-anon@example.com`);
    const shared = await ok(anon, 'get_configuration_by_token', { p_token: saved.public_token });
    expect(shared).toMatchObject({ id: saved.id, name: `${TAG} kayıt`, params: { w: 12, l: 24 }, version: 1, versions: 1, share_price: false, is_member: false, estimated_price: null, currency: null, tonnage_kg: 12.5 });
    expect(shared.updated_at).toMatch(ISO);
    expect(shared.items).toEqual([
      { element_group: 'column', profile_code: 'HEA200', piece_count: 4, total_length_m: 24.5, total_area_m2: null, total_weight_kg: 1000 },
      { element_group: 'other', profile_code: null, piece_count: null, total_length_m: null, total_area_m2: null, total_weight_kg: null },
    ]);
    expect(Object.keys(shared)).not.toEqual(expect.arrayContaining(['owner_email', 'ip_masked', 'user_id', 'public_token']));

    // anonim güncelleme yalnız token ile
    expect((await call(anon, 'save_configuration', { p: { ...base, configuration_id: saved.id } })).code).toBe('42501');
    expect((await call(anon, 'save_configuration', { p: { ...base, configuration_id: saved.id, token: randomUUID() } })).code).toBe('42501');
    const v2 = await ok(anon, 'save_configuration', { p: { ...base, name: '', configuration_id: saved.id, token: saved.public_token, items: [] } });
    expect(v2).toEqual({ ...saved, version: 2 });
    const after = await ok(anon, 'get_configuration_by_token', { p_token: saved.public_token });
    expect(after).toMatchObject({ name: `${TAG} kayıt`, version: 2, versions: 2, items: [] });

    expect(await ok(anon, 'set_configuration_sharing', { p_token: saved.public_token, p_share_price: true })).toBe(true);
    expect(await ok(anon, 'get_configuration_by_token', { p_token: saved.public_token })).toMatchObject({ share_price: true, estimated_price: 800000, currency: 'TRY' });
    expect(await ok(anon, 'set_configuration_sharing', { p_token: randomUUID(), p_share_price: true })).toBe(false);
    expect(await ok(anon, 'get_configuration_by_token', { p_token: randomUUID() })).toBeNull();
    expect((await call(anon, 'get_configuration_by_token', { p_token: 'bozuk' })).code).toBe('22P02');

    // üye: e-posta/onay gerekmez, kaydı yalnız kendisi günceller, başkasının paylaşımını değiştiremez
    const mine = await ok(member, 'save_configuration', { p: { name: `${TAG} üye`, params: { w: 1 } } });
    expect(await ok(anon, 'get_configuration_by_token', { p_token: mine.public_token })).toMatchObject({ is_member: true });
    expect((await call(user('member'), 'save_configuration', { p: { params: { w: 2 }, configuration_id: mine.id } })).code).toBe('42501');
    expect(await ok(anon, 'set_configuration_sharing', { p_token: mine.public_token, p_share_price: true })).toBe(false);
    expect(await ok(member, 'set_configuration_sharing', { p_token: mine.public_token, p_share_price: true })).toBe(true);

    await fillThrottle('config:global', 300);
    expect((await call(anon, 'save_configuration', { p: base })).code).toBe('P0429');
    await fillThrottle('share:global', 300);
    expect((await call(anon, 'set_configuration_sharing', { p_token: saved.public_token, p_share_price: false })).code).toBe('P0429');
  });
});
