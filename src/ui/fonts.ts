import { Archivo, Geist, Geist_Mono } from 'next/font/google';

// Tipografi (K-72): başlık Archivo (değişken; `wdth` ekseniyle geniş kesim → endüstriyel, net), gövde Geist, etiketler Geist Mono.
// Üçü de Türkçe glifleri (ş ğ İ ı ç ö ü) tam ve tutarlı çizer; değişken font → ağırlık başına ayrı dosya yok.
//
// display: 'swap' — BİLİNÇLİ. Google alt kümeleri ayrı dosyalardır: `latin` ve Türkçe harflerin bulunduğu `latin-ext`.
// 'optional' ile latin-ext ilk ~100 ms'de yetişmezse o sayfa görünümünde Türkçe harfler YEDEK fontla, geri kalanı marka
// fontuyla çiziliyordu (karışık "inşa"). 'swap' ile geç gelen alt küme her zaman yerine oturur; next/font'un metrik uyumlu
// yedeği (adjustFontFallback) sayesinde geçişte kayma (CLS) olmaz. İkisi de ön yüklenir.
// Seçenekler derleme zamanında okunur → değişken/spread KULLANILAMAZ, hepsi sabit yazılır.
export const fontHeading = Archivo({ subsets: ['latin', 'latin-ext'], axes: ['wdth'], variable: '--font-heading', display: 'swap' });
export const fontBody = Geist({ subsets: ['latin', 'latin-ext'], variable: '--font-body', display: 'swap' });
// Mono yalnız küçük etiketlerde: ön yüklenmez, kritik yolu meşgul etmez.
export const fontMono = Geist_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-mono', display: 'swap', preload: false });

export const fontClassNames = `${fontHeading.variable} ${fontBody.variable} ${fontMono.variable}`;
