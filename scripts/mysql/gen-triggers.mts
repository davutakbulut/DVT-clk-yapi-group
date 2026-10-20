// PostgreSQL tetikleyicilerinin MariaDB karşılığını üretir (K-116): pg-inventory.json'daki her tetikleyici → db/migrations/0002_triggers.sql
//   node scripts/mysql/gen-triggers.mts
// Fonksiyon gövdeleri supabase/migrations'taki son app_private tanımlarından elle çevrildi; TG_ARGV alan genel fonksiyonlar tablo başına açılır.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Col = { t: string; c: string; udt: string };
type Trg = { t: string; name: string; timing: 'BEFORE' | 'AFTER'; ev: string; stmt: string };
const inv = JSON.parse(readFileSync(join(import.meta.dirname, 'pg-inventory.json'), 'utf8')) as { columns: Col[]; triggers: Trg[] };
const cols = (t: string) => inv.columns.filter((c) => c.t === t);
const has = (t: string, c: string) => cols(t).some((x) => x.c === c);
const need = (t: string, ...cs: string[]) => { for (const c of cs) if (!has(t, c)) throw new Error(`${t}.${c} yok`); };

// Oturum değişkenleri pool.ts'te bağlantı başına yazılır. Aktörsüz bağlantı (göç, içe aktarma, betik) güvenilir sayılır:
// PostgreSQL'de JWT'siz doğrudan bağlantı da is_trusted_context() = true idi.
const TRUSTED = "(COALESCE(@app_kind, 'service') = 'service')";
const hasRole = (...r: string[]) => `COALESCE(@app_role IN (${r.map((x) => `'${x}'`).join(', ')}), FALSE)`;
const NOT_IMPORT = 'NOT (@app_import <=> 1)';
const ACTOR = '(SELECT p.id FROM profiles p WHERE p.id = @app_uid)';
const q = (c: string) => `\`${c}\``;
const changed = (c: string) => `NOT (OLD.${q(c)} <=> NEW.${q(c)})`;

type Out = { t: string; timing: string; ev: string; name: string; body: string };
const out: Out[] = [];
const add = (t: string, timing: string, ev: string, name: string, body: string) => out.push({ t, timing, ev, name, body });
const evs = (s: string) => s.split(',').map((e) => e.trim()).sort((a, b) => ['INSERT', 'UPDATE', 'DELETE'].indexOf(a) - ['INSERT', 'UPDATE', 'DELETE'].indexOf(b));
const suffix = (timing: string, ev: string) => `${timing[0]!.toLowerCase()}${ev[0]!.toLowerCase()}`;

/** to_jsonb(row) karşılığı: sütunlar açıkça; boolean true/false, zaman ISO-8601 UTC, JSON gömülü kalır. */
function rowJson(t: string, r: 'NEW' | 'OLD'): string {
  return `JSON_OBJECT(${cols(t).map(({ c, udt }) => {
    const v = `${r}.${q(c)}`;
    const e = udt === 'bool' ? `IF(${v} IS NULL, NULL, ${v} IS TRUE)`
      : udt === 'timestamptz' ? `DATE_FORMAT(${v}, '%Y-%m-%dT%H:%i:%s.%f+00:00')`
      : ['jsonb', 'json', '_text', '_uuid', '_numeric'].includes(udt) ? `JSON_EXTRACT(${v}, '$')` : v;
    return `'${c}', ${e}`;
  }).join(', ')})`;
}

/** next_document_no(prefix, at): yıllık sayaç; upsert satırı kilitler, eşzamanlı iki kayıt aynı numarayı alamaz. */
const docNo = (target: string, prefix: string, at: string) => `BEGIN
    DECLARE v_no INT;
    INSERT INTO document_counters (prefix, \`year\`, last_no) VALUES ('${prefix}', YEAR(${at}), 1) ON DUPLICATE KEY UPDATE last_no = last_no + 1;
    SELECT last_no INTO v_no FROM document_counters WHERE prefix = '${prefix}' AND \`year\` = YEAR(${at});
    SET ${target} = CONCAT('${prefix}-', YEAR(${at}), '-', LPAD(v_no, 4, '0'));
  END`;

const COST: Record<string, string[]> = { sales: ['total_cost', 'gross_profit', 'margin_pct'], sale_items: ['unit_cost', 'line_cost', 'line_profit'] };

for (const tr of inv.triggers) {
  const m = /^EXECUTE FUNCTION app_private\.([a-z_]+)\((.*)\)$/.exec(tr.stmt);
  if (!m) throw new Error(`Çözülemeyen tetikleyici: ${tr.t}.${tr.name}`);
  const [, fn, rawArg] = m;
  const arg = rawArg ? rawArg.replace(/^'|'$/g, '') : null;
  const { t } = tr;
  switch (fn) {
    case 'set_updated_at': break; // 0001'de ON UPDATE CURRENT_TIMESTAMP(6)
    case 'assign_sort_order': {
      need(t, 'sort_order', ...(arg ? [arg] : []));
      add(t, 'BEFORE', 'INSERT', tr.name, `IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM ${t}${arg ? ` WHERE ${q(arg)} <=> NEW.${q(arg)}` : ''});
  END IF;`);
      break;
    }
    case 'assign_menu_item_sort_order':
      add(t, 'BEFORE', 'INSERT', tr.name, `IF NEW.sort_order IS NULL THEN
    SET NEW.sort_order = (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM menu_items WHERE menu_id = NEW.menu_id AND parent_id <=> NEW.parent_id);
  END IF;`);
      break;
    case 'record_slug_change': {
      need(t, 'slug', 'id');
      // PostgreSQL: AFTER UPDATE OF slug WHEN (old.slug IS DISTINCT FROM new.slug)
      const loc = (l: string) => `IF JSON_VALUE(OLD.slug, '$.${l}') IS NOT NULL AND NOT (JSON_VALUE(OLD.slug, '$.${l}') <=> JSON_VALUE(NEW.slug, '$.${l}')) THEN
      INSERT INTO slug_history (entity_type, entity_id, locale, old_slug) VALUES ('${arg}', OLD.id, '${l}', JSON_VALUE(OLD.slug, '$.${l}'))
        ON DUPLICATE KEY UPDATE entity_id = VALUES(entity_id), created_at = CURRENT_TIMESTAMP(6);
    END IF;
    -- Yeniden kullanılan slug geçmişten düşer; yoksa sayfa kendine 308 verip döngüye girer.
    DELETE FROM slug_history WHERE entity_type = '${arg}' AND locale = '${l}' AND old_slug = JSON_VALUE(NEW.slug, '$.${l}');`;
      add(t, 'AFTER', 'UPDATE', tr.name, `IF ${NOT_IMPORT} AND NOT (OLD.slug <=> NEW.slug) THEN
    ${loc('tr')}
    ${loc('en')}
  END IF;`);
      break;
    }
    case 'audit_row': {
      need(t, 'id');
      for (const ev of evs(tr.ev)) {
        let cond = NOT_IMPORT;
        // profiles: sepet/son görülme/updated_at tek başına değişince denetim kaydı yazılmaz (0052); metin ikili karşılaştırılır (ai_ci 'Ali' = 'ali' sayar)
        if (tr.name === 'audit_row_update') cond += ` AND NOT (${cols(t).filter((c) => !['saved_basket', 'last_seen_at', 'updated_at'].includes(c.c)).map((c) => `OLD.${q(c.c)} <=> NEW.${q(c.c)}${c.udt === 'text' ? ' COLLATE utf8mb4_bin' : ''}`).join(' AND ')})`;
        add(t, 'AFTER', ev, tr.name, `IF ${cond} THEN
    INSERT INTO audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
    VALUES (${ACTOR}, '${ev}', '${t}', ${ev === 'DELETE' ? 'OLD' : 'NEW'}.id, ${ev === 'INSERT' ? 'NULL' : rowJson(t, 'OLD')}, ${ev === 'DELETE' ? 'NULL' : rowJson(t, 'NEW')});
  END IF;`);
      }
      break;
    }
    case 'assign_lead_ref_no':
      add(t, 'BEFORE', 'INSERT', tr.name, `IF NEW.ref_no IS NULL THEN
  ${docNo('NEW.ref_no', 'TLP', 'CURRENT_DATE')};
  END IF;`);
      break;
    case 'assign_sale_no':
      add(t, 'BEFORE', 'INSERT', tr.name, `IF NEW.sale_no IS NULL OR NEW.sale_no = '' THEN
  ${docNo('NEW.sale_no', 'SAT', 'NEW.sale_date')};
  END IF;`);
      break;
    case 'assign_proforma_no':
      add(t, 'BEFORE', 'INSERT', tr.name, `IF NEW.type = 'proforma' AND (NEW.invoice_no IS NULL OR NEW.invoice_no = '') THEN
  ${docNo('NEW.invoice_no', 'PRF', 'COALESCE(NEW.issue_date, CURRENT_DATE)')};
  END IF;`);
      break;
    case 'record_material_price_change':
      // PostgreSQL: BEFORE UPDATE OF unit_price, currency WHEN (birim fiyat veya para birimi değişti)
      add(t, 'BEFORE', 'UPDATE', tr.name, `IF ${NOT_IMPORT} AND (${changed('unit_price')} OR ${changed('currency')}) THEN
    INSERT INTO material_price_history (material_price_id, unit_price, currency, valid_from, valid_until, changed_by)
    VALUES (OLD.id, OLD.unit_price, OLD.currency, OLD.valid_from, CURRENT_DATE, ${ACTOR});
    IF NEW.valid_from = OLD.valid_from THEN SET NEW.valid_from = CURRENT_DATE; END IF;
  END IF;`);
      break;
    case 'touch_price_guide':
      if (t === 'price_guide_rows') {
        for (const ev of evs(tr.ev)) add(t, 'AFTER', ev, tr.name, `IF ${NOT_IMPORT} THEN
    UPDATE price_guides SET prices_updated_at = CURRENT_TIMESTAMP(6) WHERE id = ${ev === 'DELETE' ? 'OLD' : 'NEW'}.price_guide_id;
  END IF;`);
      } else if (t === 'material_prices') {
        // shortcut: PostgreSQL "UPDATE OF unit_price, currency" SET listesine bakar; MariaDB bunu bilemez, değer değişimine bakılır
        add(t, 'AFTER', 'UPDATE', tr.name, `IF ${NOT_IMPORT} AND (${changed('unit_price')} OR ${changed('currency')}) THEN
    UPDATE price_guides g SET prices_updated_at = CURRENT_TIMESTAMP(6)
     WHERE EXISTS (SELECT 1 FROM price_guide_rows r WHERE r.price_guide_id = g.id AND r.material_price_id = NEW.id);
  END IF;`);
      } else throw new Error(`touch_price_guide: beklenmeyen tablo ${t}`);
      break;
    case 'enforce_single_level_reply':
      // PostgreSQL güncellemede yalnız "UPDATE OF parent_id"ta çalışıyordu; her güncellemede denetlemek geçerli satırı reddetmez
      for (const ev of evs(tr.ev)) add(t, 'BEFORE', ev, tr.name, `IF NEW.parent_id IS NOT NULL AND EXISTS (SELECT 1 FROM post_comments c WHERE c.id = NEW.parent_id AND (c.parent_id IS NOT NULL OR c.post_id <> NEW.post_id)) THEN
    SIGNAL SQLSTATE '23514' SET MESSAGE_TEXT = 'Yorum yanıtları tek seviyedir ve aynı yazıya ait olmalıdır';
  END IF;`);
      break;
    case 'guard_profile_privileges':
      add(t, 'BEFORE', 'UPDATE', tr.name, `IF ${changed('role')} OR ${changed('is_active')} THEN
    IF NOT (${TRUSTED} OR ${hasRole('super_admin')}) THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Rol ve aktiflik yalnız super_admin tarafından değiştirilebilir';
    END IF;
    IF OLD.role = 'super_admin' AND OLD.is_active AND (NEW.role <> 'super_admin' OR NOT NEW.is_active)
       AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.role = 'super_admin' AND p.is_active AND p.id <> OLD.id) THEN
      SIGNAL SQLSTATE '23514' SET MESSAGE_TEXT = 'Son aktif super_admin devre dışı bırakılamaz';
    END IF;
  END IF;`);
      break;
    case 'guard_sales_write': {
      const cost = COST[t];
      if (!cost) throw new Error(`guard_sales_write: beklenmeyen tablo ${t}`);
      need(t, ...cost);
      for (const ev of evs(tr.ev)) {
        const lines = [`IF NOT ${hasRole('sales')} THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Satış kaydı yazma yetkiniz yok';
    END IF;`];
        if (ev === 'DELETE' && t === 'sales') lines.push(`SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Satış kaydını yalnız yönetici silebilir';`);
        if (ev !== 'DELETE') for (const c of cost) lines.push(`IF NEW.${c} IS NOT NULL${ev === 'UPDATE' ? ` AND ${changed(c)}` : ''} THEN
      SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Maliyet ve kâr alanlarını yalnız yönetici yazabilir (${c})';
    END IF;`);
        add(t, 'BEFORE', ev, tr.name, `IF NOT (${TRUSTED} OR ${hasRole('super_admin', 'admin')}) THEN
    ${lines.join('\n    ')}
  END IF;`);
      }
      break;
    }
    default: throw new Error(`Çevrilmemiş tetikleyici fonksiyonu: ${fn} (${t}.${tr.name})`);
  }
}

// auth.users tetikleyicileri (envanter yalnız public şemasını okur): on_auth_user_created, on_auth_user_confirmed
const claim = `UPDATE configurations SET user_id = NEW.id, owner_email = NULL, claimed_at = CURRENT_TIMESTAMP(6)
       WHERE user_id IS NULL AND owner_email = LOWER(NEW.email) COLLATE utf8mb4_bin;`;
add('users', 'AFTER', 'INSERT', 'on_auth_user_created', `IF ${NOT_IMPORT} THEN
    INSERT INTO profiles (id, full_name) VALUES (NEW.id, NULLIF(JSON_VALUE(NEW.meta, '$.full_name'), '')) ON DUPLICATE KEY UPDATE id = id;
    IF NEW.email_confirmed_at IS NOT NULL AND NEW.email IS NOT NULL THEN
      ${claim}
    END IF;
  END IF;`);
add('users', 'AFTER', 'UPDATE', 'on_auth_user_confirmed', `IF ${NOT_IMPORT} AND OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL AND NEW.email IS NOT NULL THEN
      ${claim}
  END IF;`);

// PostgreSQL aynı olaydaki tetikleyicileri ada göre sırayla çalıştırır → FOLLOWS ile aynı sıra
out.sort((a, b) => a.t.localeCompare(b.t) || a.timing.localeCompare(b.timing) || a.ev.localeCompare(b.ev) || a.name.localeCompare(b.name));
const sql: string[] = [
  '-- K-116 · PostgreSQL tetikleyicilerinin MariaDB karşılığı. Üretici: scripts/mysql/gen-triggers.mts — elle düzenlemeyin.',
  '-- migrate.mjs dosyayı tek çok-ifadeli sorgu olarak gönderir; DELIMITER gerekmez (BEGIN … END; sunucuda tek ifade olarak ayrışır).',
  '-- Oturum: @app_uid (auth.uid), @app_role (user_role), @app_kind (service = güvenilir; boş = doğrudan bağlantı, güvenilir),',
  '-- @app_import = 1 iken yan kayıt yazan tetikleyiciler (denetim, slug geçmişi, fiyat geçmişi, touch, profil) susar.',
  '-- set_updated_at tetikleyicileri 0001\'de ON UPDATE CURRENT_TIMESTAMP(6) olarak var.',
  'SET NAMES utf8mb4;',
  '',
];
const seen = new Set<string>();
let prev: { key: string; name: string } | null = null;
for (const o of out) {
  const name = `${o.t}_${o.name.startsWith(o.t) ? o.name.slice(o.t.length + 1) : o.name}_${suffix(o.timing, o.ev)}`;
  if (name.length > 64 || seen.has(name)) throw new Error(`Tetikleyici adı uygun değil: ${name}`);
  seen.add(name);
  const key = `${o.t} ${o.timing} ${o.ev}`;
  sql.push(`CREATE TRIGGER ${name} ${o.timing} ${o.ev} ON ${o.t} FOR EACH ROW${prev?.key === key ? ` FOLLOWS ${prev.name}` : ''}\nBEGIN\n  ${o.body}\nEND;`, '');
  prev = { key, name };
}
writeFileSync(join(import.meta.dirname, '..', '..', 'db', 'migrations', '0002_triggers.sql'), sql.join('\n'));
const fam = out.reduce<Record<string, number>>((a, o) => ({ ...a, [o.name]: (a[o.name] ?? 0) + 1 }), {});
console.log(`${out.length} MariaDB tetikleyicisi`, fam);
