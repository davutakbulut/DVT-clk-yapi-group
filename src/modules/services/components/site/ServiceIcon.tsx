import { Building2, Factory, Hammer, Layers, Ruler, Warehouse, Wrench, type LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

/** Admin'de seçilen ikon anahtarı → SVG (emoji yok; tek ikon seti). Bilinmeyen anahtar → null. */
const ICONS: Readonly<Record<string, ComponentType<LucideProps>>> = {
  building: Building2,
  factory: Factory,
  warehouse: Warehouse,
  roof: Layers,
  hammer: Hammer,
  ruler: Ruler,
  layers: Layers,
  wrench: Wrench,
};

export const SERVICE_ICON_KEYS = Object.keys(ICONS);

export function ServiceIcon({ name, size = 28, className }: { readonly name: string | null; readonly size?: number; readonly className?: string }) {
  const Icon = name ? ICONS[name] : undefined;
  if (!Icon) return null;
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" focusable="false" className={className} />;
}
