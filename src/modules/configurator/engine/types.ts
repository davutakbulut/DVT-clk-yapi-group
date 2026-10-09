import type { Catalog, FamilyKey, Profile } from './catalog';

/** Konfigüratör durumu: alan kimliği → değer (sayı, metin, anahtar). Profil alanları katalog kodunu tutar. */
export type AppState = Record<string, number | string | boolean>;

export type FieldType = 'range' | 'seg' | 'toggle' | 'select';
export interface FieldOption {
  readonly value: string | number;
  /** Mesaj anahtarı (Engine.<app>.options.<id>.<value>) */
  readonly labelKey: string;
}
export interface FieldDef {
  readonly id: string;
  readonly type: FieldType;
  /** Mesaj anahtarı (Engine.<app>.fields.<id>) */
  readonly labelKey: string;
  readonly unit?: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly value: number | string | boolean;
  readonly options?: readonly FieldOption[];
  /** Alan yalnız bu koşulda gösterilir (saf, durumdan okur) */
  readonly show?: (s: AppState) => boolean;
}
export interface SectionDef {
  readonly titleKey: string;
  readonly fields: readonly FieldDef[];
}
export interface ProfileFieldDef {
  readonly id: string;
  readonly labelKey: string;
  readonly families: readonly FamilyKey[];
  /** Varsayılan katalog kodu (ASCII) */
  readonly value: string;
  /** Lejant / kart rengi (hex) */
  readonly color: string;
  readonly show?: (s: AppState) => boolean;
}

/** Metraj satırı: `name` ve `spec` çevrilmiş metindir (build çevirmeni çağırır); `key` kararlı kalem kimliğidir (fiyat/sepet eşlemesi). */
export interface BomRow {
  readonly key?: string;
  readonly name: string;
  readonly spec?: string;
  /** Kullanılan profil kodu (varsa) — kayıt kalemine yazılır */
  readonly profile?: string;
  readonly qty?: number;
  readonly amount?: number;
  readonly unit?: string;
  readonly unit2?: string;
  readonly amountDec?: number;
  readonly kg?: number;
  readonly steel?: boolean;
}
export interface BomGroup { readonly group: string }
export type BomItem = BomRow | BomGroup;
export const isGroup = (r: BomItem): r is BomGroup => 'group' in r;

export interface Kpi { readonly label: string; readonly value: string; readonly highlight?: boolean }
export interface Legend { readonly color: string; readonly label: string }
export interface BuildResult {
  readonly kpis: readonly Kpi[];
  readonly flag: string;
  /** Tuval üstündeki özet çipi: kalın kısım + devamı */
  readonly chip: { readonly strong: string; readonly rest: string };
  readonly bom: readonly BomItem[];
  readonly legend: readonly Legend[];
  readonly groundY?: number;
}

/** Çeviri ve biçimlendirme: build fonksiyonu metni kendisi üretmez, bu bağlamı kullanır (sıfır statik metin). */
export interface BuildContext {
  readonly t: (key: string, values?: Record<string, string | number>) => string;
  readonly fmt: (v: number, decimals?: number) => string;
  readonly fmtAuto: (v: number) => string;
  readonly catalog: Catalog;
  readonly profile: (code: string) => Profile;
}

export interface AppDef {
  readonly id: string;
  /** Görünüm yönleri (iso vb.) ve ön görünüş yönü — sahne okur */
  readonly views?: Readonly<Record<string, readonly [number, number, number]>>;
  readonly frontDir?: readonly [number, number, number];
  readonly sections: readonly SectionDef[];
  readonly profiles: readonly ProfileFieldDef[];
  /** Not paragrafı mesaj anahtarları (Engine.<app>.notes.<n>) — veritabanından gelen notlar bunların önüne geçer */
  readonly noteKeys: readonly string[];
  /** Alan değişince durum düzeltmesi (ör. mahya ≥ saçak, yük sınıfına göre profil önerisi). `changed` null → ilk yükleme. */
  readonly normalize?: (s: AppState, changed: string | null, ctx: BuildContext) => void;
  readonly build: (s: AppState, kit: import('./kit').Kit, ctx: BuildContext) => BuildResult;
}

export { BOLT_D, PLATE_T } from './constants';
