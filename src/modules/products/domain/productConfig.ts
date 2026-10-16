import { isLocalizedText, pickLocale, type LocalizedText } from '@/lib/localized';

/**
 * Kesit türü → 2B çizim + 3B dış hat (K-90). K-114: yapı malzemeleri için `block` (tuğla/gazbeton/bims), `mesh` (çelik hasır),
 * `rebar` (nervürlü demir), `sandwich` (sandviç panel). Levha modu (kg/m² × ebat): plate · block · mesh · sandwich.
 */
export const DRAW_KINDS = ['box', 'pipe', 'I', 'Itaper', 'U', 'L', 'T', 'flat', 'trap', 'plate', 'block', 'mesh', 'rebar', 'sandwich'] as const;
export type DrawKind = (typeof DRAW_KINDS)[number];
export const PLATE_DRAWS: readonly DrawKind[] = ['plate', 'block', 'mesh', 'sandwich'];
export const isPlateDraw = (d: DrawKind | null): boolean => d !== null && PLATE_DRAWS.includes(d);
/** 3B görünüm yalnız çelik kesitlerde (K-90); yapı malzemelerinde ve renkli levhalarda (ahşap, alçı) yok. */
export const DRAWS_3D: readonly DrawKind[] = ['box', 'pipe', 'I', 'Itaper', 'U', 'L', 'T', 'flat', 'trap', 'plate'];
export const SURFACE_KEYS = ['black', 'galv', 'red', 'raw', 'alu', 'ss'] as const;
export type SurfaceKey = (typeof SURFACE_KEYS)[number];
/** Yüzey örnek renkleri (CSS `background`); etiketler next-intl `Products.surf.*`. */
export const SURFACE_SWATCH: Record<SurfaceKey, string> = {
  black: '#34373c',
  galv: 'linear-gradient(135deg,#dfe4ea,#aab3bd)',
  red: '#8e2f22',
  raw: 'linear-gradient(135deg,#c7ccd2,#8f979f)',
  alu: 'linear-gradient(135deg,#eef1f4,#bfc6ce)',
  ss: 'linear-gradient(135deg,#f1f3f5,#aeb6bf)',
};

export interface ProductGroup {
  readonly code: string;
  readonly label: LocalizedText;
  /** K-114: üst aile (çelik hasır Q/R/TR); null → ailesiz. */
  readonly family: string | null;
  /** Alan modu: miktar m² girilir → adet + palet (tuğla/bims/gazbeton). */
  readonly area: boolean;
  /** Yalnız teklif: hesap yok, teklif kutusu (asmolen, lento…). */
  readonly quoteOnly: boolean;
}
export interface ProductFamily {
  readonly code: string;
  readonly label: LocalizedText;
}
/** Ek seçim (sandviç panelde hadve, sac kalınlıkları): sepete nitelik olarak gider; `hadve` çizimi etkiler. */
export interface ProductExtra {
  readonly id: string;
  readonly label: LocalizedText;
  readonly options: readonly string[];
  readonly optionsByGroup: Readonly<Record<string, readonly string[]>>;
  readonly note: LocalizedText;
  readonly family: string | null;
}
/** Tablo sütunu (örnek sayfaların `cols`): k · v · s · lbl · dim · kg · kgm2 · _g (grup) · _bar (kg × stok boyu) · d.<geometri> · <dims anahtarı>. */
export interface TableCol {
  readonly key: string;
  readonly label: LocalizedText;
  readonly decimals: number | null;
  readonly hidden: boolean;
}
/** Seçicide "teknik değerler" kutusuna giden ek değer (dims'ten): ör. inşaat demirinde kesit alanı (mm²). */
export interface ValueProp {
  readonly key: string;
  readonly label: LocalizedText;
  readonly unit: string;
  readonly decimals: number;
}
/** Hesaplayıcısı olmayan ürünlerde (taş/cam yünü) form kartları: başlık · form · kullanım. */
export interface ProductForm {
  readonly title: LocalizedText;
  readonly form: LocalizedText;
  readonly use: LocalizedText;
}
export interface PlateFormat {
  readonly w: number;
  readonly l: number;
}

/** Ürün seçim seçenekleri (products.options, K-88 + K-90). */
export interface ProductOptions {
  readonly grades: readonly string[];
  readonly gradesByGroup: Readonly<Record<string, readonly string[]>>;
  readonly lengthsM: readonly number[];
  readonly customLength: boolean;
  readonly unit: string | null;
  readonly draw: DrawKind | null;
  readonly pattern: 'tear' | null;
  readonly groups: readonly ProductGroup[];
  readonly groupLabel: LocalizedText;
  readonly sizeLabel: LocalizedText;
  readonly variantLabel: LocalizedText;
  readonly gradeLabel: LocalizedText;
  readonly lengthLabel: LocalizedText;
  readonly oneLabel: LocalizedText;
  readonly tableNote: LocalizedText;
  readonly sizeUi: 'chips' | 'select';
  readonly qtyDefault: number | null;
  readonly formats: Readonly<Record<string, readonly PlateFormat[]>>;
  readonly surfaces: readonly SurfaceKey[];
  readonly surfacesByGroup: Readonly<Record<string, readonly SurfaceKey[]>>;
  // ── K-114 (yapı malzemeleri örnek sayfaları)
  readonly families: readonly ProductFamily[];
  readonly familyLabel: LocalizedText;
  readonly defaultFamily: string | null;
  readonly defaultGroupByFamily: Readonly<Record<string, string>>;
  /** Kalınlık/varyant çipleri hangi ailede: null → ilk aile; '*' → hepsi; liste → bu aileler. Ailesiz üründe hep. */
  readonly variantFamily: '*' | readonly string[] | null;
  readonly defaultGroup: string | null;
  readonly defaultSize: string | null;
  readonly variantSuffix: string | null;
  readonly hideGrade: boolean;
  readonly gradeNote: LocalizedText;
  readonly extras: readonly ProductExtra[];
  readonly palletMode: boolean;
  readonly areaDefault: number | null;
  readonly quoteNote: LocalizedText;
  /** Grup → levha/çizim rengi; çekirdek rengi (sandviç); kalite (RAL) → yüzey rengi. Yalnız #rrggbb. */
  readonly swatches: Readonly<Record<string, string>>;
  readonly coreColors: Readonly<Record<string, string>>;
  readonly ralColors: Readonly<Record<string, string>>;
  readonly corrugated: boolean;
  /** Çizim panelinde önce ürün görseli (ilk galeri görseli), "Kesit" ile çizime geçilir. */
  readonly drawingPhoto: boolean;
  readonly cols: readonly TableCol[];
  readonly valueProps: readonly ValueProp[];
  readonly forms: readonly ProductForm[];
  readonly formsCta: { readonly title: LocalizedText; readonly text: LocalizedText };
}
export const EMPTY_OPTIONS: ProductOptions = {
  grades: [], gradesByGroup: {}, lengthsM: [], customLength: false, unit: null, draw: null, pattern: null, groups: [],
  groupLabel: {}, sizeLabel: {}, variantLabel: {}, gradeLabel: {}, lengthLabel: {}, oneLabel: {}, tableNote: {},
  sizeUi: 'select', qtyDefault: null, formats: {}, surfaces: [], surfacesByGroup: {},
  families: [], familyLabel: {}, defaultFamily: null, defaultGroupByFamily: {}, variantFamily: null, defaultGroup: null, defaultSize: null, variantSuffix: null,
  hideGrade: false, gradeNote: {}, extras: [], palletMode: false, areaDefault: null, quoteNote: {}, swatches: {}, coreColors: {}, ralColors: {}, corrugated: false,
  drawingPhoto: false, cols: [], valueProps: [], forms: [], formsCta: { title: {}, text: {} },
};

const strList = (v: unknown, max = 40): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim().slice(0, 120)).slice(0, max) : []);
const numList = (v: unknown): number[] => (Array.isArray(v) ? v.map(Number).filter((n) => Number.isFinite(n) && n > 0).slice(0, 20) : []);
const surfList = (v: unknown): SurfaceKey[] => strList(v).filter((s): s is SurfaceKey => (SURFACE_KEYS as readonly string[]).includes(s));
const obj = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const byGroup = <T>(v: unknown, map: (x: unknown) => T[]): Record<string, T[]> => Object.fromEntries(Object.entries(obj(v)).map(([k, x]) => [k, map(x)]).filter(([, list]) => (list as T[]).length > 0));
const lt = (v: unknown): LocalizedText => (isLocalizedText(v) ? v : {});
const code = (s: string): string => s.trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 12);
const hex = (v: unknown): string | null => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim().toLocaleLowerCase('en') : null);
const hexMap = (v: unknown, keyMax = 120): Record<string, string> => Object.fromEntries(Object.entries(obj(v)).map(([k, x]) => [k.trim().slice(0, keyMax), hex(x)]).filter((e): e is [string, string] => Boolean(e[0]) && e[1] !== null).slice(0, 60));
const str = (v: unknown, max = 60): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const posNum = (v: unknown): number | null => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
const colKey = (s: unknown): string | null => (typeof s === 'string' && /^(_?[A-Za-z][A-Za-z0-9]{0,11}|d\.[A-Za-z][A-Za-z0-9]{0,11})$/.test(s) ? s : null);

export function readOptions(raw: unknown): ProductOptions {
  const o = obj(raw);
  if (Object.keys(o).length === 0) return EMPTY_OPTIONS;
  const draw = typeof o['draw'] === 'string' && (DRAW_KINDS as readonly string[]).includes(o['draw']) ? (o['draw'] as DrawKind) : null;
  const groups = Array.isArray(o['groups'])
    ? o['groups'].map((g) => obj(g)).map((g) => ({ code: code(String(g['code'] ?? '')), label: lt(g['label']), family: str(g['family'], 12), area: g['area'] === true, quoteOnly: g['quote_only'] === true })).filter((g) => g.code).slice(0, 120)
    : [];
  const families = Array.isArray(o['families']) ? o['families'].map((f) => obj(f)).map((f) => ({ code: code(String(f['code'] ?? '')), label: lt(f['label']) })).filter((f) => f.code).slice(0, 12) : [];
  const vf = o['variant_family'];
  const extras = Array.isArray(o['extras'])
    ? o['extras'].map((e) => obj(e)).map((e) => ({ id: code(String(e['id'] ?? '')), label: lt(e['label']), options: strList(e['options']), optionsByGroup: byGroup(e['options_by_group'], (x) => strList(x)), note: lt(e['note']), family: str(e['family'], 12) })).filter((e) => e.id && (e.options.length || Object.keys(e.optionsByGroup).length)).slice(0, 8)
    : [];
  const cols = Array.isArray(o['cols'])
    ? o['cols'].map((c) => obj(c)).map((c) => ({ key: colKey(c['key']), label: lt(c['label']), decimals: Number.isInteger(c['decimals']) ? Math.min(Math.max(Number(c['decimals']), 0), 4) : null, hidden: c['hidden'] === true })).filter((c): c is TableCol => c.key !== null).slice(0, 16)
    : [];
  const valueProps = Array.isArray(o['value_props'])
    ? o['value_props'].map((c) => obj(c)).map((c) => ({ key: colKey(c['key']) ?? '', label: lt(c['label']), unit: str(c['unit'], 12) ?? '', decimals: Number.isInteger(c['decimals']) ? Math.min(Math.max(Number(c['decimals']), 0), 4) : 2 })).filter((c) => c.key && !c.key.startsWith('_')).slice(0, 12)
    : [];
  const forms = Array.isArray(o['forms']) ? o['forms'].map((f) => obj(f)).map((f) => ({ title: lt(f['title']), form: lt(f['form']), use: lt(f['use']) })).filter((f) => f.title['tr']).slice(0, 6) : [];
  const cta = obj(o['forms_cta']);
  const formats = byGroup(o['formats'], (list) => (Array.isArray(list) ? list.map((f) => obj(f)).map((f) => ({ w: Number(f['w']), l: Number(f['l']) })).filter((f) => f.w > 0 && f.l > 0).slice(0, 12) : []));
  return {
    grades: strList(o['grades']),
    gradesByGroup: byGroup(o['grades_by_group'], strList),
    lengthsM: numList(o['lengths_m']),
    customLength: o['custom_length'] === true,
    unit: typeof o['unit'] === 'string' && o['unit'].trim() ? o['unit'].trim().slice(0, 20) : null,
    draw,
    pattern: o['pattern'] === 'tear' ? 'tear' : null,
    groups,
    groupLabel: lt(o['group_label']),
    sizeLabel: lt(o['size_label']),
    variantLabel: lt(o['variant_label']),
    gradeLabel: lt(o['grade_label']),
    lengthLabel: lt(o['length_label']),
    oneLabel: lt(o['one_label']),
    tableNote: lt(o['table_note']),
    sizeUi: o['size_ui'] === 'chips' ? 'chips' : 'select',
    qtyDefault: Number.isFinite(Number(o['qty_default'])) && Number(o['qty_default']) > 0 ? Math.floor(Number(o['qty_default'])) : null,
    formats,
    surfaces: surfList(o['surfaces']),
    surfacesByGroup: byGroup(o['surfaces_by_group'], surfList),
    families,
    familyLabel: lt(o['family_label']),
    defaultFamily: str(o['default_family'], 12),
    defaultGroupByFamily: Object.fromEntries(Object.entries(obj(o['default_group_by_family'])).map(([k, x]) => [k, str(x, 12)]).filter((e): e is [string, string] => e[1] !== null)),
    variantFamily: vf === '*' ? '*' : Array.isArray(vf) ? strList(vf, 12) : typeof vf === 'string' && vf.trim() ? [vf.trim()] : null,
    defaultGroup: str(o['default_group'], 12),
    defaultSize: str(o['default_size'], 60),
    variantSuffix: typeof o['variant_suffix'] === 'string' ? o['variant_suffix'].slice(0, 8) : null,
    hideGrade: o['hide_grade'] === true,
    gradeNote: lt(o['grade_note']),
    extras,
    palletMode: o['pallet_mode'] === true,
    areaDefault: posNum(o['area_default']),
    quoteNote: lt(o['quote_note']),
    swatches: hexMap(o['swatches'], 12),
    coreColors: hexMap(o['core_colors'], 12),
    ralColors: hexMap(o['ral_colors']),
    corrugated: o['corrugated'] === true,
    drawingPhoto: o['drawing_photo'] === true,
    cols,
    valueProps,
    forms,
    formsCta: { title: lt(cta['title']), text: lt(cta['text']) },
  };
}
/** Panelin "gelişmiş seçici ayarları" (JSON) alanındaki anahtarlar — temel alanlar ayrı form öğeleriyle yönetilir. */
export const ADVANCED_OPTION_KEYS = ['families', 'family_label', 'default_family', 'default_group_by_family', 'variant_family', 'default_group', 'default_size', 'variant_suffix', 'hide_grade', 'extras', 'pallet_mode', 'area_default', 'swatches', 'core_colors', 'ral_colors', 'corrugated', 'drawing_photo', 'cols', 'value_props', 'group_flags'] as const;
export function writeOptions(o: ProductOptions): Record<string, unknown> {
  const nonEmpty = (t: LocalizedText) => (Object.values(t).some(Boolean) ? t : undefined);
  const out: Record<string, unknown> = {
    grades: [...o.grades], lengths_m: [...o.lengthsM], custom_length: o.customLength, unit: o.unit,
    draw: o.draw, pattern: o.pattern, size_ui: o.sizeUi, qty_default: o.qtyDefault,
    groups: o.groups.map((g) => ({ code: g.code, label: g.label })),
    grades_by_group: o.gradesByGroup, formats: o.formats, surfaces: [...o.surfaces], surfaces_by_group: o.surfacesByGroup,
    group_label: nonEmpty(o.groupLabel), size_label: nonEmpty(o.sizeLabel), variant_label: nonEmpty(o.variantLabel), grade_label: nonEmpty(o.gradeLabel),
    length_label: nonEmpty(o.lengthLabel), one_label: nonEmpty(o.oneLabel), table_note: nonEmpty(o.tableNote),
  };
  // K-114: grup bayrakları grup satırında; diğer gelişmiş anahtarlar yalnız doluysa yazılır
  out['groups'] = o.groups.map((g) => ({ code: g.code, label: g.label, ...(g.family ? { family: g.family } : {}), ...(g.area ? { area: true } : {}), ...(g.quoteOnly ? { quote_only: true } : {}) }));
  if (o.families.length) out['families'] = o.families.map((f) => ({ code: f.code, label: f.label }));
  out['family_label'] = nonEmpty(o.familyLabel);
  out['default_family'] = o.defaultFamily;
  if (Object.keys(o.defaultGroupByFamily).length) out['default_group_by_family'] = o.defaultGroupByFamily;
  out['variant_family'] = o.variantFamily === null ? null : o.variantFamily === '*' ? '*' : [...o.variantFamily];
  out['default_group'] = o.defaultGroup;
  out['default_size'] = o.defaultSize;
  out['variant_suffix'] = o.variantSuffix;
  if (o.hideGrade) out['hide_grade'] = true;
  out['grade_note'] = nonEmpty(o.gradeNote);
  if (o.extras.length) out['extras'] = o.extras.map((e) => ({ id: e.id, label: e.label, ...(e.options.length ? { options: [...e.options] } : {}), ...(Object.keys(e.optionsByGroup).length ? { options_by_group: e.optionsByGroup } : {}), ...(nonEmpty(e.note) ? { note: e.note } : {}), ...(e.family ? { family: e.family } : {}) }));
  if (o.palletMode) out['pallet_mode'] = true;
  out['area_default'] = o.areaDefault;
  out['quote_note'] = nonEmpty(o.quoteNote);
  if (Object.keys(o.swatches).length) out['swatches'] = o.swatches;
  if (Object.keys(o.coreColors).length) out['core_colors'] = o.coreColors;
  if (Object.keys(o.ralColors).length) out['ral_colors'] = o.ralColors;
  if (o.corrugated) out['corrugated'] = true;
  if (o.drawingPhoto) out['drawing_photo'] = true;
  if (o.cols.length) out['cols'] = o.cols.map((c) => ({ key: c.key, label: c.label, ...(c.decimals !== null ? { decimals: c.decimals } : {}), ...(c.hidden ? { hidden: true } : {}) }));
  if (o.valueProps.length) out['value_props'] = o.valueProps.map((c) => ({ key: c.key, label: c.label, unit: c.unit, decimals: c.decimals }));
  if (o.forms.length) out['forms'] = o.forms.map((f) => ({ title: f.title, form: f.form, use: f.use }));
  if (nonEmpty(o.formsCta.title) || nonEmpty(o.formsCta.text)) out['forms_cta'] = { title: o.formsCta.title, text: o.formsCta.text };
  for (const k of Object.keys(out)) if (out[k] === undefined || out[k] === null) delete out[k];
  return out;
}
/**
 * Panel ↔ gelişmiş ayarlar (JSON): aileler, ek seçimler, renkler, tablo sütunları, alan/palet modu, grup bayrakları
 * (`group_flags`: {"KOD": {"family": "Q", "area": true, "quote_only": true}}). Okuma `readOptions` ile doğrulanır; bilinmeyen anahtar atılır.
 */
export function formatAdvanced(o: ProductOptions): string {
  const w = writeOptions(o);
  const adv: Record<string, unknown> = {};
  for (const k of ADVANCED_OPTION_KEYS) if (k !== 'group_flags' && w[k] !== undefined) adv[k] = w[k];
  const flags = Object.fromEntries(o.groups.filter((g) => g.family || g.area || g.quoteOnly).map((g) => [g.code, { ...(g.family ? { family: g.family } : {}), ...(g.area ? { area: true } : {}), ...(g.quoteOnly ? { quote_only: true } : {}) }]));
  if (Object.keys(flags).length) adv['group_flags'] = flags;
  return Object.keys(adv).length ? JSON.stringify(adv, null, 2) : '';
}
/** JSON metni → seçenek parçası; geçersiz JSON → null (alan hatası). Grup bayrakları `groups` listesine uygulanır. */
export function parseAdvanced(text: string, groups: readonly { readonly code: string; readonly label: LocalizedText }[]): { readonly patch: Partial<ProductOptions>; readonly groups: ProductGroup[] } | null {
  const trimmed = text.trim();
  let raw: Record<string, unknown> = {};
  if (trimmed) {
    try {
      const v = JSON.parse(trimmed) as unknown;
      if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
      raw = v as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  const flags = obj(raw['group_flags']);
  const withFlags = groups.map((g) => { const f = obj(flags[g.code]); return { code: g.code, label: g.label, ...(str(f['family'], 12) ? { family: str(f['family'], 12) } : {}), ...(f['area'] === true ? { area: true } : {}), ...(f['quote_only'] === true ? { quote_only: true } : {}) }; });
  const picked: Record<string, unknown> = { groups: withFlags };
  for (const k of ADVANCED_OPTION_KEYS) if (k !== 'group_flags' && raw[k] !== undefined) picked[k] = raw[k];
  const r = readOptions(picked);
  const patch: Partial<ProductOptions> = {
    families: r.families, familyLabel: r.familyLabel, defaultFamily: r.defaultFamily, defaultGroupByFamily: r.defaultGroupByFamily, variantFamily: r.variantFamily,
    defaultGroup: r.defaultGroup, defaultSize: r.defaultSize, variantSuffix: r.variantSuffix, hideGrade: r.hideGrade, extras: r.extras, palletMode: r.palletMode,
    areaDefault: r.areaDefault, swatches: r.swatches, coreColors: r.coreColors, ralColors: r.ralColors, corrugated: r.corrugated, drawingPhoto: r.drawingPhoto, cols: r.cols, valueProps: r.valueProps,
  };
  return { patch, groups: [...r.groups] };
}
/** Panel: form kartları "Başlık | Form | Kullanım" (TR/EN satırları sırayla eşleşir). */
export function parseForms(tr: string, en: string): ProductForm[] {
  const split = (t: string) => t.split('\n').map((l) => l.split('|').map((p) => p.trim())).filter((p) => p[0]);
  const a = split(tr);
  const b = split(en);
  return a.slice(0, 6).map((row, i) => {
    const e = b[i];
    const pick = (idx: number): LocalizedText => ({ ...(row[idx] ? { tr: row[idx] } : {}), ...(e?.[idx] ? { en: e[idx] } : {}) });
    return { title: pick(0), form: pick(1), use: pick(2) };
  });
}
export function formatForms(forms: readonly ProductForm[], locale: 'tr' | 'en'): string {
  return forms.map((f) => [f.title[locale] ?? '', f.form[locale] ?? '', f.use[locale] ?? ''].join(' | ').replace(/( \|)+$/, '')).filter((l) => l.replace(/[\s|]/g, '')).join('\n');
}
/** Panel: "S235JRH, S275J0H" ve "6, 12" biçimli alanlardan. */
export function parseList(text: string): string[] {
  return text.split(/[,\n;]/).map((s) => s.trim()).filter(Boolean).slice(0, 20);
}
export function parseNumberList(text: string): number[] {
  return parseList(text).map((s) => Number(s.replace(',', '.'))).filter((n) => Number.isFinite(n) && n > 0);
}
/**
 * Panel: grup bazlı liste. Satır "KOD: a, b" → gruba özel; ':' içermeyen satır(lar) → genel liste.
 * Ör. kaliteler "DKP: DC01, DC03\nHRP: S235JR" ya da düz "S235JR, S275JR".
 */
export function parseGrouped(text: string): { readonly flat: string[]; readonly byGroup: Record<string, string[]> } {
  const flat: string[] = [];
  const byGroup: Record<string, string[]> = {};
  for (const line of text.split('\n')) {
    const m = /^\s*([A-Za-z0-9_-]{1,12})\s*:\s*(.+)$/.exec(line);
    if (m) byGroup[m[1]!] = parseList(m[2]!);
    else flat.push(...parseList(line));
  }
  return { flat: flat.slice(0, 20), byGroup };
}
export function formatGrouped(flat: readonly string[], byGroup: Readonly<Record<string, readonly string[]>>): string {
  return [...(flat.length ? [flat.join(', ')] : []), ...Object.entries(byGroup).map(([g, list]) => `${g}: ${list.join(', ')}`)].join('\n');
}
/** Panel: gruplar "K | Kare | Square" satırları. */
export function parseGroups(text: string): ProductGroup[] {
  return text.split('\n').map((l) => l.split('|').map((p) => p.trim())).filter((p) => p[0]).map((p) => ({ code: code(p[0]!), label: { ...(p[1] ? { tr: p[1] } : {}), ...(p[2] ? { en: p[2] } : {}) }, family: null, area: false, quoteOnly: false })).filter((g) => g.code).slice(0, 120);
}
export function formatGroups(groups: readonly ProductGroup[]): string {
  return groups.map((g) => [g.code, g.label['tr'] ?? '', g.label['en'] ?? ''].join(' | ').replace(/( \|)+$/, '')).join('\n');
}
/** Panel: plaka ebatları "HRP: 1000×2000, 1500×3000" (grup zorunlu; tek gruplu üründe grup kodu yazılır). */
export function parseFormats(text: string): Record<string, PlateFormat[]> {
  const out: Record<string, PlateFormat[]> = {};
  for (const [g, list] of Object.entries(parseGrouped(text).byGroup)) {
    const fs = list.map((s) => /^(\d+)\s*[x×*]\s*(\d+)$/i.exec(s.replace(/\s/g, ''))).filter((m): m is RegExpExecArray => m !== null).map((m) => ({ w: Number(m[1]), l: Number(m[2]) }));
    if (fs.length) out[g] = fs;
  }
  return out;
}
export function formatFormats(formats: Readonly<Record<string, readonly PlateFormat[]>>): string {
  return Object.entries(formats).map(([g, fs]) => `${g}: ${fs.map((f) => `${f.w}×${f.l}`).join(', ')}`).join('\n');
}

/** Başlık altı "kısa gerçekler" şeridi (products.facts): etiket + değer, iki dilli. */
export interface Fact {
  readonly label: LocalizedText;
  readonly value: LocalizedText;
}
export function readFacts(raw: unknown): Fact[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((f): f is { label: unknown; value: unknown } => typeof f === 'object' && f !== null).map((f) => ({ label: isLocalizedText(f.label) ? f.label : {}, value: isLocalizedText(f.value) ? f.value : {} })).filter((f) => f.label['tr'] || f.value['tr']).slice(0, 8);
}
/** Panel satırı: "Etiket | Değer"; TR ve EN satırları sırayla eşleşir. */
export function parseFacts(tr: string, en: string): Fact[] {
  const split = (t: string) => t.split('\n').map((l) => l.split('|').map((p) => p.trim())).filter((p) => p[0] || p[1]);
  const a = split(tr);
  const b = split(en);
  return a.slice(0, 8).map((row, i) => {
    const e = b[i];
    const pick = (idx: number): LocalizedText => ({ ...(row[idx] ? { tr: row[idx] } : {}), ...(e?.[idx] ? { en: e[idx] } : {}) });
    return { label: pick(0), value: pick(1) };
  });
}
export function formatFacts(facts: readonly Fact[], locale: 'tr' | 'en'): string {
  return facts.map((f) => `${f.label[locale] ?? ''} | ${f.value[locale] ?? ''}`).join('\n');
}

/** Kesit değerleri (product_variants.props): sabit anahtar sırası ve birimleri (teknik sabitler; etiketler next-intl). */
export const PROP_KEYS = ['A', 'Ix', 'Iy', 'Wx', 'Wy', 'ix', 'iy', 'I', 'W', 'i', 'iv', 'ey', 'ex', 'e', 'u', 'we', 'coil', 'h', 'p'] as const;
export type PropKey = (typeof PROP_KEYS)[number];
export const PROP_UNITS: Record<PropKey, string> = { A: 'cm²', Ix: 'cm⁴', Iy: 'cm⁴', Wx: 'cm³', Wy: 'cm³', ix: 'cm', iy: 'cm', I: 'cm⁴', W: 'cm³', i: 'cm', iv: 'cm', ey: 'cm', ex: 'cm', e: 'cm', u: 'm²/m', we: 'mm', coil: 'mm', h: 'mm', p: 'mm' };
/** Kesit değeri sütunları (tabloda "kesit değerlerini göster" ile açılır); `u` ve trapez ölçüleri hep görünür. */
export const SECTION_PROP_KEYS: readonly PropKey[] = ['A', 'Ix', 'Iy', 'Wx', 'Wy', 'ix', 'iy', 'I', 'W', 'i', 'iv', 'ey', 'ex', 'e'];
export function propDecimals(key: PropKey, value: number): number {
  if (key === 'u') return 3;
  if (key === 'we' || key === 'coil' || key === 'h') return 0;
  if (key === 'p') return 1;
  return Math.abs(value) >= 100 ? 1 : 2;
}
export function readProps(raw: unknown): Partial<Record<PropKey, number>> {
  if (typeof raw !== 'object' || raw === null) return {};
  const out: Partial<Record<PropKey, number>> = {};
  for (const k of PROP_KEYS) {
    const v = Number((raw as Record<string, unknown>)[k] ?? (k === 'u' ? (raw as Record<string, unknown>)['U'] : undefined));
    if (Number.isFinite(v) && v > 0) out[k] = v;
  }
  return out;
}
/** Kesit geometrisi (mm) + görünen ölçü metni ("dim"); yalnız sayılar ve kısa metinler. */
export type Dims = Readonly<Record<string, number | string>>;
export function readDims(raw: unknown): Dims {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const out: Record<string, number | string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[A-Za-z][A-Za-z0-9]{0,11}$/.test(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'string' && v.trim() && v.length <= 60) out[k] = v.trim();
  }
  return out;
}

/** Seçici için asgari varyant kesiti (sunucu ve istemci ortak). */
export interface SelectableVariant {
  readonly id: string;
  readonly sizeLabel: string;
  readonly sizeKey: string | null;
  readonly widthMm: number | null;
  readonly heightMm: number | null;
  readonly thicknessMm: number | null;
  readonly lengthMm: number | null;
  readonly kgPerM: number | null;
  readonly kgPerM2: number | null;
  readonly stockCode: string | null;
  readonly group: string | null;
  readonly props: Partial<Record<PropKey, number>>;
  readonly dims: Dims;
}

/** Seçici anlamlı mı: ölçü ya da ağırlık bilgisi olan en az bir varyant. */
export function isConfigurable(variants: readonly SelectableVariant[]): boolean {
  return variants.some((v) => v.kgPerM !== null || v.kgPerM2 !== null || (v.widthMm !== null && v.heightMm !== null));
}
export const fmt = (n: number): string => String(Math.round(n * 100) / 100).replace('.', ',');
/** Ölçü anahtarı: kayıtlı `size_key`; yoksa "H×B" (yükseklik × genişlik); ölçüsüz varyantta etiket. */
export function sizeKey(v: SelectableVariant): string {
  if (v.sizeKey) return v.sizeKey;
  return v.heightMm !== null && v.widthMm !== null ? `${fmt(v.heightMm)}×${fmt(v.widthMm)}` : v.sizeLabel;
}
const num = (d: Dims, k: string): number | null => (typeof d[k] === 'number' ? (d[k] as number) : null);
/** Tabloda görünen ölçü metni: kayıtlı `dims.dim`; yoksa kesit türüne göre türetilir. */
export function dimText(v: SelectableVariant, draw: DrawKind | null): string {
  if (typeof v.dims['dim'] === 'string') return v.dims['dim'];
  const d = v.dims;
  switch (draw) {
    case 'pipe':
      return num(d, 'D') !== null ? `Ø${fmt(num(d, 'D')!)}` : v.widthMm !== null ? `Ø${fmt(v.widthMm)}` : v.sizeLabel;
    case 'flat':
      return num(d, 'w') !== null && num(d, 't') !== null ? `${fmt(num(d, 'w')!)} × ${fmt(num(d, 't')!)}` : v.sizeLabel;
    case 'plate':
    case 'sandwich':
      return v.thicknessMm !== null ? `${fmt(v.thicknessMm)} mm` : v.sizeLabel;
    case 'rebar':
      return num(d, 'D') !== null ? `Ø${fmt(num(d, 'D')!)} mm` : v.sizeLabel;
    case 'T':
      return num(d, 'h') !== null && num(d, 'b') !== null && num(d, 't') !== null ? `${fmt(num(d, 'h')!)} × ${fmt(num(d, 'b')!)} × ${fmt(num(d, 't')!)}` : v.sizeLabel;
    default:
      return v.heightMm !== null && v.widthMm !== null ? `${fmt(v.heightMm)} × ${fmt(v.widthMm)}` : v.sizeLabel;
  }
}
export function groupsOf(variants: readonly SelectableVariant[], options?: ProductOptions): string[] {
  const inData = [...new Set(variants.map((v) => v.group).filter((g): g is string => Boolean(g)))];
  if (!options?.groups.length) return inData;
  // Panelde tanımlı sıra; veride olmayan grup gösterilmez
  return [...options.groups.map((g) => g.code).filter((c) => inData.includes(c)), ...inData.filter((c) => !options.groups.some((g) => g.code === c))];
}
export function groupLabel(options: ProductOptions, code: string | null, locale: string): string {
  if (code === null) return '';
  const g = options.groups.find((x) => x.code === code);
  // EN etiketi yoksa Türkçe (kod göstermekten iyidir)
  return g ? pickLocale(g.label, locale, { fallback: 'tr' }) || code : code;
}
export function sizesOf(variants: readonly SelectableVariant[], group: string | null, family: string | null = null): string[] {
  return [...new Set(variants.filter((v) => (group === null || v.group === group) && (family === null || familyOf(v) === family)).map(sizeKey))];
}
/** K-114: varyantın ailesi (`dims.fam`). */
export const familyOf = (v: SelectableVariant): string | null => (typeof v.dims['fam'] === 'string' ? v.dims['fam'] : null);
export function familiesOf(variants: readonly SelectableVariant[], options: ProductOptions): string[] {
  const inData = [...new Set(variants.map(familyOf).filter((f): f is string => Boolean(f)))];
  return [...options.families.map((f) => f.code).filter((c) => inData.includes(c)), ...inData.filter((c) => !options.families.some((f) => f.code === c))];
}
export function familyLabel(options: ProductOptions, code: string | null, locale: string): string {
  if (code === null) return '';
  const f = options.families.find((x) => x.code === code);
  return f ? pickLocale(f.label, locale, { fallback: 'tr' }) || code : code;
}
/** Kalınlık/varyant çipleri bu ailede görünür mü (örnek sayfaların hasV). */
export function variantVisible(options: ProductOptions, family: string | null): boolean {
  if (family === null || options.families.length === 0) return true;
  const vf = options.variantFamily;
  if (vf === '*') return true;
  if (vf === null) return family === (options.families[0]?.code ?? family);
  return vf.includes(family);
}
export function groupInfo(options: ProductOptions, code: string | null): ProductGroup | null {
  return code === null ? null : (options.groups.find((g) => g.code === code) ?? null);
}
/** Ek seçimin listesi: gruba özel, yoksa genel. */
export function extraOptions(e: ProductExtra, group: string | null): readonly string[] {
  return (group !== null && e.optionsByGroup[group]) || e.options;
}
/** Alan modu: m² → adet (yukarı yuvarlanır) + palet + yaklaşık ağırlık (kg/m² yüzey × alan). */
export function areaCalc(args: { readonly areaM2: number; readonly faceM2: number; readonly perPallet: number | null; readonly kgPerM2: number | null }): { readonly perM2: number; readonly pieces: number; readonly pallets: number | null; readonly weight: number | null } {
  const { areaM2, faceM2, perPallet, kgPerM2 } = args;
  if (!(areaM2 > 0) || !(faceM2 > 0)) return { perM2: faceM2 > 0 ? 1 / faceM2 : 0, pieces: 0, pallets: null, weight: null };
  const pieces = Math.ceil(areaM2 / faceM2 - 1e-9);
  return { perM2: 1 / faceM2, pieces, pallets: perPallet ? Math.ceil(pieces / perPallet - 1e-9) : null, weight: kgPerM2 !== null ? kgPerM2 * areaM2 : null };
}
/** Et/kalınlık listesi: plakada grup içindeki tüm kalınlıklar (ölçü adımı yok). */
export function thicknessesOf(variants: readonly SelectableVariant[], group: string | null, size: string, plate = false, family: string | null = null): number[] {
  return [...new Set(variants.filter((v) => (group === null || v.group === group) && (family === null || familyOf(v) === family) && (plate || sizeKey(v) === size) && v.thicknessMm !== null).map((v) => v.thicknessMm!))].sort((a, b) => a - b);
}
export function findVariant(variants: readonly SelectableVariant[], group: string | null, size: string, thickness: number | null, plate = false, family: string | null = null): SelectableVariant | null {
  return variants.find((v) => (group === null || v.group === group) && (family === null || familyOf(v) === family) && (plate || sizeKey(v) === size) && (thickness === null || v.thicknessMm === thickness)) ?? null;
}
export function gradesFor(options: ProductOptions, group: string | null, family: string | null = null): readonly string[] {
  return (group !== null && options.gradesByGroup[group]) || (family !== null && options.gradesByGroup[family]) || options.grades;
}
export function formatsFor(options: ProductOptions, group: string | null): readonly PlateFormat[] {
  return (group !== null && options.formats[group]) || options.formats['*'] || [];
}
/** Yüzey seçenekleri: grup bazlı liste, yoksa genel liste; hiçbiri yoksa seçim gösterilmez. */
export function surfacesFor(options: ProductOptions, group: string | null): readonly SurfaceKey[] {
  return (group !== null && options.surfacesByGroup[group]) || options.surfaces;
}
/** TS EN 10219-2 köşe yarıçapı: t ≤ 6 → 2t; 6 < t ≤ 10 → 2,5t; t > 10 → 3t (dış); iç = dış − t. */
export function cornerRadii(t: number): { readonly outer: number; readonly inner: number } {
  const outer = t <= 6 ? 2 * t : t <= 10 ? 2.5 * t : 3 * t;
  return { outer, inner: Math.max(outer - t, 0) };
}
/** Ağırlık: kg/m × boy (m) × adet. */
export function weightOf(kgPerM: number | null, lengthM: number, qty: number): { readonly perBar: number | null; readonly total: number | null } {
  if (kgPerM === null || !(lengthM > 0) || !(qty > 0)) return { perBar: null, total: null };
  const perBar = kgPerM * lengthM;
  return { perBar, total: perBar * qty };
}
/** Plaka: kg/m² × (genişlik × uzunluk, mm → m²) × adet. */
export function plateWeightOf(kgPerM2: number | null, wMm: number, lMm: number, qty: number): { readonly areaM2: number; readonly perSheet: number | null; readonly total: number | null } {
  const areaM2 = wMm > 0 && lMm > 0 ? (wMm * lMm) / 1e6 : 0;
  if (kgPerM2 === null || areaM2 <= 0 || !(qty > 0)) return { areaM2, perSheet: null, total: null };
  const perSheet = kgPerM2 * areaM2;
  return { areaM2, perSheet, total: perSheet * qty };
}
/**
 * Sıcak daldırma galvaniz payı (≈85 µm, 0,61 kg/m² tek yüz): plakada iki yüz (1,22 kg/m²); profilde boya yüzeyi × 0,61,
 * kapalı kesitte (kutu/boru) iç yüzey de kaplanır → ×2. Galvanizli üretilen gruplarda (GLV) uygulanmaz.
 */
export function galvanizeExtraKg(args: { readonly draw: DrawKind | null; readonly paintAreaM2PerM: number | null; readonly per: number; readonly qty: number }): number {
  const { draw, paintAreaM2PerM, per, qty } = args;
  if (isPlateDraw(draw)) return 1.22 * per * qty;
  if (paintAreaM2PerM === null) return 0;
  return paintAreaM2PerM * 0.61 * (draw === 'box' || draw === 'pipe' ? 2 : 1) * per * qty;
}
/** Arama normalizasyonu: "100x50", "100×50", "100*50" aynı; ondalık virgül → nokta; Ø ve boşluk atılır. */
export function normSearch(s: string): string {
  return s.toLocaleLowerCase('en-US').replace(/[x*×]/g, 'x').replace(/,/g, '.').replace(/[\sø"]/g, '');
}
