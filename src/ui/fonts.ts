import { Archivo, Geist, Geist_Mono } from 'next/font/google';

// Tipografi (K-72): başlık Archivo (değişken; `wdth` ekseniyle geniş kesim → endüstriyel, net), gövde Geist, etiketler Geist Mono.
// Üçü de Türkçe glifleri (ş ğ İ ı ç ö ü) tam ve tutarlı çizer; değişken font → ağırlık başına ayrı dosya yok.
//
// display: 'block' — BİLİNÇLİ. Google alt kümeleri ayrı dosyalardır: `latin` ve Türkçe harflerin bulunduğu `latin-ext`.
//  · 'optional': latin-ext ilk ~100 ms'de yetişmezse o görünümde Türkçe harfler YEDEK fontla kalıyordu (karışık "inşa").
//  · 'swap': önce yedek font görünüp sonra marka fontuna DÖNÜYORDU — ürün sahibi bu görünür değişimi istemedi.
//  · 'block': metin font gelene kadar (en çok ~3 sn) görünmez bekler, sonra doğru fontla çıkar; yedek→marka sıçraması yok.
// İlk girişte SiteLoader fontları (Türkçe glifler dahil) açıkça yükleyip öyle kapanır; sonraki sayfalarda font önbellektedir.
// İkisi de ön yüklenir; next/font'un metrik uyumlu yedeği olası geç geçişte kaymayı (CLS) önler.
// Seçenekler derleme zamanında okunur → değişken/spread KULLANILAMAZ, hepsi sabit yazılır.
export const fontHeading = Archivo({ subsets: ['latin', 'latin-ext'], axes: ['wdth'], variable: '--font-heading', display: 'block' });
export const fontBody = Geist({ subsets: ['latin', 'latin-ext'], variable: '--font-body', display: 'block' });
// Mono yalnız küçük etiketlerde: ön yüklenmez, kritik yolu meşgul etmez.
export const fontMono = Geist_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-mono', display: 'block', preload: false });

export const fontClassNames = `${fontHeading.variable} ${fontBody.variable} ${fontMono.variable}`;
