import { IBM_Plex_Mono, IBM_Plex_Sans, Syne } from 'next/font/google';

// 01-DESIGN-SYSTEM › Türkçe glif zorunluluğu: `latin-ext` olmadan ş ğ İ ı ç ö ü kutu (tofu) çıkar.
// next/font self-host eder: harici istek yok, preload edilir, CLS oluşmaz.
// Seçenekler derleme zamanında okunur → değişken/spread KULLANILAMAZ, hepsi sabit yazılır.
export const fontHeading = Syne({ subsets: ['latin', 'latin-ext'], weight: ['600', '700', '800'], variable: '--font-heading', display: 'swap' });
export const fontBody = IBM_Plex_Sans({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600'], variable: '--font-body', display: 'swap' });
export const fontMono = IBM_Plex_Mono({ subsets: ['latin', 'latin-ext'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });

export const fontClassNames = `${fontHeading.variable} ${fontBody.variable} ${fontMono.variable}`;
