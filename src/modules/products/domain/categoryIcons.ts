/** Ürün kategorisi ikon anahtarları (K-111) — veritabanı CHECK (`app_private.is_category_icon_key`) ile aynı küme. */
export const PRODUCT_CATEGORY_ICON_KEYS = ['profile', 'sheet', 'rebar', 'panel', 'insulation', 'board', 'drywall', 'wall', 'cement', 'generic'] as const;
export type ProductCategoryIconKey = (typeof PRODUCT_CATEGORY_ICON_KEYS)[number];
