import { expect, test } from '@playwright/test';
import { openConfiguratorPanel } from './support/configuratorPanel';

// K-100: dört basit konfigüratör — sayfa açılır, 2B şema var (canvas/Three.js yok), hesap URL ile paylaşılır, sepete satır eklenir
test.describe('basit konfigüratörler', () => {
  test('çatı & cephe: 20×40 %15 → 809 m² çatı; levha satırı sepete girer', async ({ page }) => {
    await page.goto('/tr/konfigurator/cati-cephe?w=20&l=40&s=15&h=6&o=0&rt=trapez&wt=trapez');
    await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Çatı & cephe kaplama');
    // 3B varsayılan (diğer konfigüratörler gibi); 2B şema geçişle
    await expect(page.locator('canvas')).toHaveCount(1, { timeout: 20_000 });
    await page.getByRole('group', { name: 'Görünüm' }).getByRole('button', { name: '2B' }).click();
    await expect(page.locator('.simple-drawing')).toBeVisible();
    await openConfiguratorPanel(page);
    await expect(page.getByTestId('sc-roofArea')).toHaveText('809 m²');
    await expect(page.getByRole('table')).toContainText('Çatı levhaları');
    await page.locator('#sc-cladding-width').fill('30');
    await expect(page).toHaveURL(/w=30/);
    await expect(page.getByTestId('sc-roofArea')).not.toHaveText('809 m²');
    await page.getByRole('button', { name: 'Tümünü teklif sepetine ekle' }).click();
    await expect(page.locator('.pcfg-toast')).toHaveText(/sepetine eklendi/);
  });
  test('ara kat: varsayılan 12×24 → 15 kolon, IPE 300; çit: 23 direk; alçıpan: 19 levha', async ({ page }) => {
    await page.goto('/tr/konfigurator/ara-kat');
    await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
    await openConfiguratorPanel(page);
    await expect(page.getByTestId('sc-columns')).toHaveText('15');
    await expect(page.getByRole('table')).toContainText('IPE 300');
    await page.goto('/tr/konfigurator/cit-korkuluk');
    await openConfiguratorPanel(page);
    await expect(page.getByTestId('sc-posts')).toHaveText('23');
    await page.goto('/tr/konfigurator/alcipan-duvar');
    await openConfiguratorPanel(page);
    await expect(page.getByTestId('sc-boards')).toHaveText('19');
  });
  test('EN sayfalar açılır', async ({ page }) => {
    await page.goto('/en/configurator/fence');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fence & railing');
  });
});
