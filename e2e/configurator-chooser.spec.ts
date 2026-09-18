import { expect, test } from '@playwright/test';
import { openConfiguratorPanel } from './support/configuratorPanel';



// K-80: menüdeki "Konfigüratör" önce tür seçtirir; eski paylaşım bağlantıları hol konfigüratörüne yönlenir; çok katlı konfigüratör hesaplar.
test.describe('konfigüratör seçimi', () => {
  test('/tr/konfigurator: iki tür kartı; 3D tuval yok; kartlar doğru sayfalara gider', async ({ page }) => {
    await page.goto('/tr/konfigurator');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hangi yapıyı tasarlamak istiyorsunuz?');
    await expect(page.locator('canvas')).toHaveCount(0);
    const cards = page.locator('.configurator-type');
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toHaveAttribute('href', '/tr/konfigurator/hol');
    await expect(cards.nth(1)).toHaveAttribute('href', '/tr/konfigurator/cok-katli');
    await cards.nth(1).click();
    await expect(page).toHaveURL(/\/tr\/konfigurator\/cok-katli/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Çok katlı çelik yapı');
  });

  test('eski bağlantı ?w=&l=… → /konfigurator/hol (parametreler korunur)', async ({ page }) => {
    await page.goto('/tr/konfigurator?w=24&l=60&e=7&r=9&b=6');
    await expect(page).toHaveURL(/\/tr\/konfigurator\/hol\?.*w=24/);
    await expect(page.getByTestId('footprint')).toHaveText(/1\.440 m²/);
  });

  test('çok katlı: varsayılan 20×30, 5 kat → 35 kolon, radye 70 cm; kat 3 → 50 cm; URL paylaşılabilir', async ({ page }) => {
    await page.goto('/tr/konfigurator/cok-katli?w=20&l=30&h=3.2&n=5');
    await expect(page.locator('.configurator-bar a').first()).toHaveAttribute('href', '/tr/konfigurator');
    await openConfiguratorPanel(page);
    await expect(page.getByTestId('ms-footprint')).toHaveText('600 m²');
    await expect(page.getByTestId('ms-columns')).toHaveText('35');
    await expect(page.getByTestId('ms-raft')).toContainText('70 cm');
    await page.locator('#ms-floors').fill('3');
    await expect(page.getByTestId('ms-raft')).toContainText('50 cm');
    await expect(page).toHaveURL(/n=3/);
    await expect(page.getByRole('table')).toContainText('HEB300');
  });

  test('EN: /en/configurator kartları ve çok katlı sayfa', async ({ page }) => {
    await page.goto('/en/configurator');
    await expect(page.locator('.configurator-type').nth(1)).toHaveAttribute('href', '/en/configurator/multi-storey');
    await page.goto('/en/configurator/multi-storey');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Multi-storey steel building');
  });
});

// K-81: mobilde tuval tam ekran; ayrıntılar sağdan açılan panelde — kapalıyken gizli, Esc ile kapanır; seçim sayfasında geri → ana sayfa
test.describe('konfigüratör mobil paneli', () => {
  test('panel kapalı başlar, düğmeyle açılır, Esc ile kapanır; masaüstünde hep açık', async ({ page }, testInfo) => {
    await page.goto('/tr/konfigurator/hol?w=18&l=53&e=6&r=8&b=6');
    const heading = page.getByRole('heading', { level: 2, name: 'Ölçüler' });
    const toggle = page.getByRole('button', { name: 'Ölçüler ve metraj' });
    if (testInfo.project.name === 'desktop') {
      await expect(heading).toBeVisible();
      await expect(toggle).toBeHidden();
      return;
    }
    await expect(heading).toBeHidden();
    await expect(page.locator('.configurator-summary')).toContainText('18 × 53 m');
    await toggle.click();
    await expect(heading).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(heading).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test('seçim sayfasında geri bağlantısı ana sayfaya gider', async ({ page }) => {
    await page.goto('/tr/konfigurator');
    await expect(page.locator('.configurator-bar a').first()).toHaveAttribute('href', '/tr');
  });
});
