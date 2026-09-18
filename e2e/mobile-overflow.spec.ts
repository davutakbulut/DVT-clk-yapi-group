import { expect, test } from '@playwright/test';

// Mobilde yatay taşma denetimi: belge genişliği görünüm alanını aşmamalı (sayfa sağa kaymaz, sağda boş şerit oluşmaz).
// Tablolar kendi kaydırma kutusunda taşabilir; belge taşamaz. Yeni sayfa eklenince listeye yazılır.
const PAGES = ['/tr', '/tr/hizmetler', '/tr/cozumler', '/tr/urunler', '/tr/urunler/kutu-profil-karkas', '/tr/urunler/alcipan-bolme-duvar-ve-asma-tavan', '/tr/urunler/hafif-celik-yapi-sistemi', '/tr/urunler/celik-korkasa', '/tr/projeler', '/tr/blog', '/tr/blog/celik-yapi-tasariminda-temel-mevzuat', '/tr/hakkimizda', '/tr/sss', '/tr/iletisim', '/tr/teklif-al', '/tr/teklif-sepeti', '/tr/fiyatlar', '/tr/yorumlar', '/tr/kariyer', '/tr/gizlilik-politikasi', '/tr/kvkk-aydinlatma-metni', '/tr/site-haritasi', '/tr/giris', '/tr/konfigurator', '/en', '/en/products/box-section-steel-framing', '/tr/olmayan-sayfa'];

test.describe('mobil yatay taşma', () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'mobile', 'yalnız mobil');
  });
  for (const path of PAGES) {
    test(`taşma yok: ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const m = await page.evaluate(() => {
        const d = document.documentElement;
        const vw = d.clientWidth;
        // Belgeyi genişleten öğeler: kaydırma kutusu içinde olmayan ve sağdan taşanlar (teşhis için ilk 5)
        const offenders: string[] = [];
        for (const el of Array.from(document.querySelectorAll('body *'))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.right <= vw + 1 || getComputedStyle(el).position === 'fixed') continue;
          let clipped = false;
          for (let p = el.parentElement; p; p = p.parentElement) {
            const o = getComputedStyle(p).overflowX;
            if ((o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') && getComputedStyle(p).position !== 'static') clipped = true;
            if ((o === 'hidden' || o === 'clip') && !clipped) clipped = true;
            if (clipped) break;
          }
          if (!clipped) offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} right=${Math.round(r.right)}`);
        }
        return { scrollWidth: d.scrollWidth, clientWidth: vw, offenders: offenders.slice(0, 5) };
      });
      expect(m.offenders, `belge ${m.scrollWidth}px > görünüm ${m.clientWidth}px`).toEqual([]);
      expect(m.scrollWidth).toBeLessThanOrEqual(m.clientWidth + 1);
    });
  }
});
