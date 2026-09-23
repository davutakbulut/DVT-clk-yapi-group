import type { SocialPlatform } from './socialPlatform';

/** Basit tek renk simgeler (24×24, currentColor) — marka SVG'leri yerine sade çizgi; dış kütüphane yok. */
export function SocialIcon({ platform }: { readonly platform: SocialPlatform }) {
  const p: Record<SocialPlatform, string> = {
    instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM17.5 6.5h.01',
    facebook: 'M14 8h2.5V4.5H14a3.5 3.5 0 0 0-3.5 3.5v2H8v3.5h2.5V21h3.5v-7.5h2.5l.5-3.5h-3V8.5c0-.3.2-.5.5-.5z',
    linkedin: 'M6.5 9.5v10M6.5 6.5h.01M11 19.5v-10M11 13.5c0-2 1.5-4 4-4s3.5 2 3.5 4v6',
    youtube: 'M3.5 12c0-2.2.2-3.7.4-4.6.2-.8.8-1.4 1.6-1.6C7 5.5 9 5.4 12 5.4s5 .1 6.5.4c.8.2 1.4.8 1.6 1.6.2.9.4 2.4.4 4.6s-.2 3.7-.4 4.6c-.2.8-.8 1.4-1.6 1.6-1.5.3-3.5.4-6.5.4s-5-.1-6.5-.4a2.1 2.1 0 0 1-1.6-1.6c-.2-.9-.4-2.4-.4-4.6zM10 9.3v5.4l4.6-2.7z',
    x: 'M4 4l16 16M20 4L4 20',
    tiktok: 'M13.5 4v10.5a3 3 0 1 1-3-3M13.5 4c.3 2.7 2.3 4.5 5 4.7',
    whatsapp: 'M4 20l1.3-3.8A8 8 0 1 1 8.3 19.2zM9 9.5c.3 2.5 2.5 4.7 5 5l1-1.4-1.9-.9-.8.8c-.8-.4-1.4-1-1.8-1.8l.8-.8-.9-1.9z',
    pinterest: 'M12 3a9 9 0 0 0-3.3 17.4l1-4.3a3 3 0 0 1-.3-1.5c0-1.4.8-2.5 1.9-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.9 1.6 1.9 1.9 0 3.3-2 3.3-4.9 0-2.6-1.8-4.4-4.5-4.4A4.7 4.7 0 0 0 7.2 14M9.7 16.1 8.7 21',
    threads: 'M12 3a9 9 0 1 0 0 18c3 0 5.5-1.7 5.5-4.6 0-2.4-1.9-3.8-4.5-3.8-2.3 0-3.7 1.1-3.7 2.6 0 1.2 1 2 2.4 2 1.9 0 3.2-1.5 3.3-4.6 0-2.9-1.6-4.5-3.9-4.5-1.6 0-2.9.7-3.6 1.9',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={p[platform]} />
    </svg>
  );
}
