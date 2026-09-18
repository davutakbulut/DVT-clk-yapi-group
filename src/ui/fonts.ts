import { IBM_Plex_Mono, IBM_Plex_Sans, Syne } from 'next/font/google';

// 01-DESIGN-SYSTEM › Türkçe glif zorunluluğu: `latin-ext` olmadan ş ğ İ ı ç ö ü kutu (tofu) çıkar.
// next/font self-host eder: harici istek yok, preload edilir, metrik uyumlu yedekle CLS oluşmaz.
// Seçenekler derleme zamanında okunur → değişken/spread KULLANILAMAZ, hepsi sabit yazılır.
//
// display: 'optional' — Faz 4 Lighthouse ölçümü: 'swap' ile h1 önce yedek fontla boyanıyor, marka fontu yavaş 4G'de
// ~3,7 sn'de gelince yeniden boyanıyor ve LCP oraya kayıyordu. 'optional' ile font kısa blok süresinde gelmezse o
// sayfa görünümünde yedek kalır (FOUT yok), font önbelleğe alınır ve sonraki sayfalarda marka fontu görünür.
export const fontHeading = Syne({ subsets: ['latin', 'latin-ext'], weight: ['700', '800'], variable: '--font-heading', display: 'optional' });
export const fontBody = IBM_Plex_Sans({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600'], variable: '--font-body', display: 'optional' });
// Mono yalnız küçük etiketlerde: ön yüklenmez, kritik yolu meşgul etmez.
export const fontMono = IBM_Plex_Mono({ subsets: ['latin', 'latin-ext'], weight: ['400'], variable: '--font-mono', display: 'optional', preload: false });

export const fontClassNames = `${fontHeading.variable} ${fontBody.variable} ${fontMono.variable}`;
