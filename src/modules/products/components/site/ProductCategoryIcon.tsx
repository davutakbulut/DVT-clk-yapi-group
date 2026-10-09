import { BrickWall, Columns3, Grid3x3, Layers, Package, PanelTop, Rows3, SquareStack, Thermometer, Waves, type LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';
import type { ProductCategoryIconKey } from '../../domain/categoryIcons';

/** Kategori ikon anahtarı → çizgisel ikon (ServiceIcon ile aynı set/kalınlık). Bilinmeyen anahtar → genel kutu. */
const ICONS: Readonly<Record<ProductCategoryIconKey, ComponentType<LucideProps>>> = {
  profile: Columns3,
  sheet: Waves,
  rebar: Grid3x3,
  panel: PanelTop,
  insulation: Thermometer,
  board: SquareStack,
  drywall: Rows3,
  wall: BrickWall,
  cement: Package,
  generic: Layers,
};

export function ProductCategoryIcon({ name, size = 24, className }: { readonly name: string | null; readonly size?: number; readonly className?: string }) {
  const Icon = (name && name in ICONS ? ICONS[name as ProductCategoryIconKey] : ICONS.generic);
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" focusable="false" className={className} />;
}
