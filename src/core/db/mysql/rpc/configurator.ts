// Konfigürasyon kaydı ve paylaşım RPC'leri (0030/0052 → K-116). Hepsi SECURITY DEFINER'dı: kural yok, sahiplik burada
// (üye → user_id, anonim → token, K-30). Kapı düştü; boyut ve eşik (K-104) aynen.
import type { PoolConnection } from 'mysql2/promise';
import type { Actor } from '../pool';
import { at, elements, left, textAt } from './contentHelpers';
import { btrim, denied, exec, invalid, isObject, jsonSize, lower, nullif, select, toBool, toInt, toNumeric, toUuid, txt, uid, type Row } from './pgCast';
import { throttle, type RpcHandler } from './registry';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const B = (e: string) => `IF(${e}, JSON_EXTRACT('true', '$'), JSON_EXTRACT('false', '$'))`;

const getConfigurationByToken: RpcHandler = async (conn, _actor, args) => {
  const token = toUuid(args['p_token']);
  if (token == null) return null;
  const [row] = await select<{ r: unknown }>(
    conn,
    `SELECT JSON_OBJECT(
       'id', c.id, 'ref_code', c.ref_code, 'name', c.name, 'params', JSON_EXTRACT(c.params, '$'), 'version', c.current_version,
       'tonnage_kg', c.tonnage_kg, 'locale', c.locale, 'updated_at', DATE_FORMAT(c.updated_at, '%Y-%m-%dT%H:%i:%s.%f+00:00'), 'status', c.status,
       'share_price', ${B('c.share_price')}, 'is_member', ${B('c.user_id IS NOT NULL')},
       'estimated_price', IF(c.share_price, c.estimated_price, NULL), 'currency', IF(c.share_price, c.currency, NULL),
       'versions', (SELECT COUNT(*) FROM configuration_versions v WHERE v.configuration_id = c.id),
       'items', COALESCE((SELECT JSON_ARRAYAGG(JSON_OBJECT('element_group', i.element_group, 'profile_code', i.profile_code_snapshot, 'piece_count', i.piece_count,
                                                            'total_length_m', i.total_length_m, 'total_area_m2', i.total_area_m2, 'total_weight_kg', i.total_weight_kg) ORDER BY i.sort_order)
                            FROM configuration_items i JOIN configuration_versions v ON v.id = i.configuration_version_id
                           WHERE v.configuration_id = c.id AND v.version = c.current_version), JSON_ARRAY())) AS r
       FROM configurations c WHERE c.public_token = ?`,
    [token],
  );
  if (!row) return null;
  return typeof row.r === 'string' ? JSON.parse(row.r) : row.r;
};

async function saveConfigurationImpl(conn: PoolConnection, actor: Actor, p: Row): Promise<Row> {
  const userId = uid(actor);
  const t = (k: string) => txt(p, k);
  const emailRaw = t('owner_email');
  const email = emailRaw == null ? null : nullif(lower(btrim(emailRaw)));
  const name = left(nullif(btrim(t('name') ?? '')) ?? '', 120)!;
  const locale = t('locale') ?? 'tr';
  const params = p['params'];
  const existing = toUuid(nullif(t('configuration_id')));
  const token = toUuid(nullif(t('token')));
  if (locale !== 'tr' && locale !== 'en') throw invalid('save_configuration: locale');
  // jsonb_typeof(null) <> 'object' NULL'dır → yükseltilmez; eksik params ekleme/güncellemede NOT NULL hatası verir (aynı)
  if (params !== undefined && !isObject(params)) throw invalid('save_configuration: params');
  if (userId == null) {
    if (email == null || !EMAIL_RE.test(email)) throw invalid('save_configuration: email');
    if (toBool(t('consent_kvkk')) !== true) throw invalid('save_configuration: consent');
  }
  const items = p['items'];
  if (Array.isArray(items) && items.length > 100) throw invalid('save_configuration: items');
  const paramsJson = params === undefined ? null : JSON.stringify(params);
  const tonnage = toNumeric(nullif(t('tonnage_kg')));
  const price = toNumeric(nullif(t('estimated_price')));
  const currency = nullif(t('currency'));

  let id: string;
  let ref: string;
  let publicToken: string;
  let version: number;
  if (existing != null) {
    const [own] = await select<{ id: string; ref_code: string; public_token: string; v: number }>(
      conn,
      `SELECT id, ref_code, public_token, current_version + 1 AS v FROM configurations
        WHERE id = ? AND ((? IS NOT NULL AND user_id = ?) OR (user_id IS NULL AND ? IS NOT NULL AND public_token = ?))`,
      [existing, userId, userId, token, token],
    );
    if (!own) throw denied(actor, 'save_configuration: forbidden');
    ({ id, ref_code: ref, public_token: publicToken, v: version } = own);
    await exec(
      conn,
      `UPDATE configurations SET params = ?, current_version = ?, tonnage_kg = ?, estimated_price = ?, currency = COALESCE(?, currency),
              name = IF(CHAR_LENGTH(?) > 0, ?, name), locale = ? WHERE id = ?`,
      [paramsJson, version, tonnage, price, currency, name, name, locale, id],
    );
  } else {
    const [row] = await select<{ id: string; ref_code: string; public_token: string; current_version: number }>(
      conn,
      `INSERT INTO configurations (name, user_id, owner_email, params, tonnage_kg, estimated_price, currency, locale, ip_masked)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, ref_code, public_token, current_version`,
      [name, userId, userId == null ? email : null, paramsJson, tonnage, price, currency ?? 'TRY', locale, nullif(t('ip_masked'))],
    );
    ({ id, ref_code: ref, public_token: publicToken, current_version: version } = row!);
  }

  const snapshot = at(p, 'price_snapshot');
  const note = t('note');
  const [ver] = await select<{ id: string }>(
    conn,
    'INSERT INTO configuration_versions (configuration_id, version, params, tonnage_kg, estimated_price, price_snapshot, note) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
    [id, version, paramsJson, tonnage, price, JSON.stringify(snapshot === undefined ? {} : snapshot), note == null ? null : nullif(btrim(note))],
  );

  if (Array.isArray(items) && items.length) {
    const rows = elements(items).map((item, i) => {
      const it = (k: string) => textAt(item, k);
      const code = it('profile_code');
      return [ver!.id, left(it('element_group') ?? 'other', 40), code, code, nullif(code), toInt(nullif(it('piece_count'))), toNumeric(nullif(it('total_length_m'))),
        toNumeric(nullif(it('total_area_m2'))), toNumeric(nullif(it('total_weight_kg'))), toNumeric(nullif(it('line_price'))), i + 1];
    });
    // steel_profiles.code harmanlaması büyük/küçük harf duyarsız: tam eşleşme için ikili karşılaştırma
    await exec(
      conn,
      `INSERT INTO configuration_items (configuration_version_id, element_group, steel_profile_id, profile_code_snapshot, piece_count, total_length_m, total_area_m2, total_weight_kg, line_price, sort_order)
       VALUES ${rows.map(() => '(?, ?, (SELECT sp.id FROM steel_profiles sp WHERE sp.code = ? AND BINARY sp.code = ?), ?, ?, ?, ?, ?, ?, ?)').join(', ')}`,
      rows.flat(),
    );
  }
  return { id, ref_code: ref, public_token: publicToken, version };
}

const saveConfiguration: RpcHandler = async (conn, actor, args) => {
  const p = args['p'];
  if (jsonSize(p) > 65536) throw invalid('save_configuration: gövde çok büyük');
  await throttle(conn, 'config:global', 300, 600);
  return saveConfigurationImpl(conn, actor, isObject(p) ? p : {});
};

const setConfigurationSharing: RpcHandler = async (conn, actor, args) => {
  await throttle(conn, 'share:global', 300, 600);
  const token = toUuid(args['p_token']);
  const share = args['p_share_price'];
  const res = await exec(conn, 'UPDATE configurations SET share_price = ?, is_shared = TRUE WHERE public_token = ? AND (user_id = ? OR user_id IS NULL)', [
    share == null ? null : share === true || toBool(String(share)) === true,
    token,
    uid(actor),
  ]);
  return res.affectedRows > 0;
};

export const CONFIGURATOR_RPCS: Readonly<Record<string, RpcHandler>> = {
  get_configuration_by_token: getConfigurationByToken,
  save_configuration: saveConfiguration,
  set_configuration_sharing: setConfigurationSharing,
};
