/** Etiket sözlüğü: veri yazıldığında `revalidateTag` ile hangi önbelleğin düşeceği buradan bilinir. Tablo adıyla birebir. */
export const CACHE_TAGS = {
  menus: 'menus',
  siteSettings: 'site_settings',
  whatsapp: 'whatsapp_settings',
  staticPages: 'static_pages',
  media: 'media_library',
  hero: 'hero_media',
  about: 'about_content',
  services: 'services',
  projects: 'projects',
  blog: 'blog_posts',
  products: 'products',
  solutions: 'solutions',
  pricing: 'price_guides',
  testimonials: 'testimonials',
  corporate: 'corporate',
  faqs: 'faqs',
  translations: 'ui_translations',
  redirects: 'redirects',
  configurator: 'configurator_rules',
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
