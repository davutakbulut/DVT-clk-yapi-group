import { expect, test } from '@playwright/test';

// K-88: kutu profil sayfası — seçim (grup/ölçü/et/kalite/boy/adet) → ağırlık; tablo satırı → seçim; sepete nitelikli kalem.
test.describe('ürün seçici (kutu profil)', () => {
  test('seçim → ağırlık hesabı; tablo filtre/arama/satır seçimi; sepete kalite ve boy ile eklenir', async ({ page }) => {
    await page.goto('/tr/urunler/kutu-profil');
    await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
    const cfg = page.locator('.pcfg');
    if ((await cfg.count()) === 0) test.skip(true, 'kutu-profil ürünü bu veritabanında yok');
    await expect(page.locator('.product-facts')).toContainText('331 ölçü');
    // K-90: açık başlık + aile çubuğu (aynı kategorideki yayındaki ürünler; geçerli sayfa işaretli)
    await expect(page.locator('.page-head')).toHaveCount(0);
    const fams = page.getByRole('navigation', { name: 'Ürün aileleri' });
    await expect(fams.getByRole('link', { name: 'Kutu Profil' })).toHaveAttribute('aria-current', 'page');
    await expect(fams.getByRole('link', { name: 'HEA Profil' })).toBeVisible();
    // Prototip örneği: dikdörtgen 100×50×3, 6 m, 10 adet → 6,60 kg/m, 39,60 kg/boy, 396 kg
    await cfg.getByRole('group', { name: 'Kesit tipi' }).getByRole('button', { name: 'Dikdörtgen' }).click();
    await cfg.getByRole('combobox', { name: 'Ebat (H × B, mm)' }).selectOption('100×50');
    await cfg.getByRole('group', { name: 'Et kalınlığı (mm)' }).getByRole('button', { name: '3', exact: true }).click();
    await expect(page.getByTestId('pcfg-code')).toHaveText('KP-100X50X3');
    await expect(page.getByTestId('pcfg-total')).toHaveText('396 kg');
    await cfg.getByLabel('Boy (m)').selectOption('12');
    await cfg.getByLabel(/^Miktar/).fill('100');
    await expect(page.getByTestId('pcfg-total')).toHaveText(/7,92 t/);
    // Tablo: kalınlık filtresi + arama + satır seçimi
    await page.getByRole('group', { name: 'Et kalınlığına göre filtrele' }).getByRole('button', { name: '2 mm', exact: true }).click();
    // Mobilde arama ikonla açılır (K-93); masaüstünde giriş zaten görünür
    const toggle = page.getByRole('button', { name: 'Aramayı aç' });
    if (await toggle.isVisible()) await toggle.click();
    await page.getByLabel('Ölçü ara, örn. 100×50').fill('40x40');
    await expect(page.locator('.pcfg-table tbody tr')).toHaveCount(1);
    await page.getByRole('button', { name: 'Seç: 40×40×2' }).click();
    await expect(page.getByTestId('pcfg-code')).toHaveText('KP-40X40X2');
    // Sepet: kalite + boy nitelikleriyle
    await cfg.getByLabel('Çelik kalitesi').selectOption('S355J2H');
    await cfg.getByRole('button', { name: 'Teklif sepetine ekle' }).click();
    await expect(cfg.getByRole('status')).toContainText('teklif sepetine eklendi');
    await page.goto('/tr/teklif-sepeti');
    const row = page.getByRole('row').filter({ hasText: 'KP-40X40X2' });
    await expect(row).toContainText('S355J2H');
    await expect(row).toContainText('12 m');
    await expect(page.getByRole('table')).toContainText('Toplam ağırlık');
    await row.getByRole('button', { name: 'Kaldır' }).click();
  });

  test('HEA (chips, kalınlık adımı yok) ve sac (plaka: kg/m² × ebat); 3B yalnız tıklanınca yüklenir', async ({ page }) => {
    await page.goto('/tr/urunler/hea');
    await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
    const cfg = page.locator('.pcfg');
    if ((await cfg.count()) === 0) test.skip(true, 'hea ürünü bu veritabanında yok');
    // Örnek sayfa: HEA 100 → 16,7 kg/m; 12 m × 10 adet = 2,00 t
    await cfg.getByRole('group', { name: 'Profil' }).getByRole('button', { name: 'HEA 100', exact: true }).click();
    await expect(page.getByTestId('pcfg-code')).toHaveText('HEA-100');
    await cfg.getByLabel('Boy (m)').selectOption('12');
    await cfg.getByLabel(/^Miktar/).fill('10');
    await expect(page.getByTestId('pcfg-total')).toHaveText(/2,00 t/);
    await expect(cfg.getByRole('group', { name: 'Et kalınlığı (mm)' })).toHaveCount(0);
    // Galvaniz yüzeyi → kaplama payı notu
    await cfg.getByRole('group', { name: 'Yüzey' }).getByRole('button', { name: 'Galvanizli' }).click();
    await expect(cfg.getByText(/galvaniz kaplama yaklaşık/)).toBeVisible();
    // 3B: three.js parçası yalnız düğmeye basınca iner; canvas oluşur
    const before = await page.evaluate(() => performance.getEntriesByType('resource').filter((r) => /three/i.test(r.name)).length);
    expect(before).toBe(0);
    await cfg.getByRole('group', { name: /3B görünüm/ }).getByRole('button', { name: '3B' }).click();
    await expect(page.locator('.pcfg-v3 canvas')).toBeVisible({ timeout: 20_000 });
    await cfg.getByRole('group', { name: /3B görünüm/ }).getByRole('button', { name: '2B' }).click();
    await expect(page.locator('.pcfg-svg')).toBeVisible();

    await page.goto('/tr/urunler/dkp-sac');
    const plate = page.locator('.pcfg');
    if ((await plate.count()) === 0) test.skip(true, 'dkp-sac ürünü bu veritabanında yok');
    // DKP 0,4 mm: 3,14 kg/m² × 1000×2000 × 2 adet = 13 kg (yuvarlak)
    await plate.getByRole('group', { name: 'Kalınlık (mm)' }).getByRole('button', { name: '0,4', exact: true }).click();
    await plate.getByLabel('Plaka ebadı').selectOption('1000x2000');
    await plate.getByLabel(/^Miktar/).fill('2');
    await expect(page.getByTestId('pcfg-code')).toHaveText('DKP-0.4');
    await expect(page.getByTestId('pcfg-total')).toHaveText('13 kg');
    await plate.getByLabel('Plaka ebadı').selectOption('custom');
    await plate.getByLabel('Genişlik (mm)').fill('500');
    await plate.getByLabel('Uzunluk (mm)').fill('1000');
    await expect(page.getByTestId('pcfg-total')).toHaveText('3 kg');
    await plate.getByRole('button', { name: 'Teklif sepetine ekle' }).click();
    await expect(plate.getByRole('status')).toContainText('teklif sepetine eklendi');
    await page.goto('/tr/teklif-sepeti');
    const row = page.getByRole('row').filter({ hasText: 'DKP-0.4' });
    await expect(row).toContainText('500×1000 mm');
    await row.getByRole('button', { name: 'Kaldır' }).click();
  });
});
