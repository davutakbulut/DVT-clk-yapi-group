/**
 * Malzeme tanımları (K-110): motor Three.js'siz çalışır; malzeme yalnız veridir, sahne `MeshStandardMaterial`a çevirir.
 * Kategori renkleri tüm konfigüratörlerde aynıdır (orijinal prototip paleti); lejant aynı hex'leri kullanır.
 */
export interface MaterialDesc {
  readonly key: string;
  readonly color: number;
  readonly roughness?: number;
  readonly metalness?: number;
  readonly transparent?: boolean;
  readonly opacity?: number;
  readonly doubleSide?: boolean;
  readonly depthWrite?: boolean;
  readonly flatShading?: boolean;
  readonly wireframe?: boolean;
}
const mat = (key: string, color: number, o: Partial<MaterialDesc> = {}): MaterialDesc => ({ key, color, roughness: 0.5, metalness: 0.35, ...o });

export const MAT = {
  column: mat('column', 0x6B4FA0),
  beam: mat('beam', 0x3F8F5F),
  truss: mat('truss', 0x2F7A4F, { metalness: 0.4 }),
  secondary: mat('secondary', 0x2F9E93, { metalness: 0.3 }),
  brace: mat('brace', 0x3E6FA8, { roughness: 0.55 }),
  plate: mat('plate', 0xB9BEC2, { roughness: 0.45, metalness: 0.4 }),
  bolt: mat('bolt', 0x2A2E31, { roughness: 0.35, metalness: 0.7, flatShading: true }),
  door: mat('door', 0xC99A3B, { metalness: 0.4 }),
  wall: mat('wall', 0xEDEAE3, { roughness: 0.75, metalness: 0.05, doubleSide: true, transparent: true, opacity: 0.92 }),
  roof: mat('roof', 0x4A5761, { roughness: 0.55, doubleSide: true, transparent: true, opacity: 0.94 }),
  concrete: mat('concrete', 0x8E918C, { roughness: 0.92, metalness: 0 }),
  deck: mat('deck', 0x8C969E, { roughness: 0.5, metalness: 0.5, doubleSide: true }),
  glass: mat('glass', 0x8FB8C9, { roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.25, doubleSide: true, depthWrite: false }),
  galv: mat('galv', 0xA9B2B8, { roughness: 0.4, metalness: 0.6 }),
} as const;

/** Uygulamaya özel malzeme (ör. kaplama rengi): anahtar benzersiz olmalı; aynı anahtar aynı tanımı verir. */
export const customMat = mat;
export const hex = (m: MaterialDesc): string => `#${m.color.toString(16).padStart(6, '0')}`;
