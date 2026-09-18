/** Etiket sözlüğü: veri yazıldığında `revalidateTag` ile hangi önbelleğin düşeceği buradan bilinir. Tablo adıyla birebir. */
export const CACHE_TAGS = {
  menus: 'menus',
  siteSettings: 'site_settings',
  whatsapp: 'whatsapp_settings',
  staticPages: 'static_pages',
  media: 'media_library',
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
