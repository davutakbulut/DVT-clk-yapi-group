import { expect, test } from '@playwright/test';

// K-88: kutu profil sayfası — seçim (grup/ölçü/et/kalite/boy/adet) → ağırlık; tablo satırı → seçim; sepete nitelikli kalem.
test.describe('ürün seçici (kutu profil)', () => {
  test('seçim → ağırlık hesabı; tablo filtre/arama/satır seçimi; sepete kalite ve boy ile eklenir', async ({ page }) => {
    await page.goto('/tr/urunler/kutu-profil');
    await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
    const cfg = page.locator('.pcfg');
    if ((await cfg.count()) === 0) test.skip(true, 'kutu-profil ürünü bu veritabanında yok');
    await expect(page.locator('.product-facts')).toContainText('331 ölçü');
    // Prototip örneği: dikdörtgen 100×50×3, 6 m, 10 adet → 6,60 kg/m, 39,60 kg/boy, 396 kg
    await cfg.getByRole('group', { name: 'Kesit tipi' }).getByRole('button', { name: 'Dikdörtgen' }).click();
    await cfg.getByRole('combobox', { name: 'Ölçü', exact: true }).selectOption('100×50');
    await cfg.getByRole('group', { name: 'Et kalınlığı (mm)' }).getByRole('button', { name: '3', exact: true }).click();
    await expect(page.getByTestId('pcfg-code')).toHaveText('KP-100X50X3');
    await expect(page.getByTestId('pcfg-total')).toHaveText('396 kg');
    await cfg.getByLabel('Boy (m)').selectOption('12');
    await cfg.getByLabel(/^Miktar/).fill('100');
    await expect(page.getByTestId('pcfg-total')).toHaveText(/7,92 t/);
    // Tablo: kalınlık filtresi + arama + satır seçimi
    await page.getByRole('group', { name: 'Et kalınlığına göre filtrele' }).getByRole('button', { name: '2 mm', exact: true }).click();
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
});
