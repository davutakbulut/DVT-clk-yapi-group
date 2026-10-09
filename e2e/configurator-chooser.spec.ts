import { expect, test } from '@playwright/test';
import { openConfiguratorPanel } from './support/configuratorPanel';

// K-80: menüdeki "Konfigüratör" önce tür seçtirir; eski paylaşım bağlantıları hol konfigüratörüne yönlenir; çok katlı konfigüratör hesaplar.
test.describe('konfigüratör seçimi', () => {
  test('/tr/konfigurator: altı tür kartı + özellik çipleri; 3D tuval yok; kartlar doğru sayfalara gider', async ({ page }) => {
    await page.goto('/tr/konfigurator');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hangi yapıyı tasarlamak istiyorsunuz?');
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.locator('.configurator-feats li')).toHaveCount(5);
    await expect(page.locator('.configurator-foot')).toContainText('ön metraj');
    const cards = page.locator('.configurator-type');
    await expect(cards).toHaveCount(6);
    await expect(cards.nth(2)).toHaveAttribute('href', '/tr/konfigurator/cati-cephe');
    await expect(cards.nth(5)).toHaveAttribute('href', '/tr/konfigurator/alcipan-duvar');
    await expect(cards.nth(0)).toHaveAttribute('href', '/tr/konfigurator/hol');
    await cards.nth(1).click();
    await expect(page).toHaveURL(/\/tr\/konfigurator\/cok-katli/);
    await openConfiguratorPanel(page); // başlık panelde; mobil/tablet kapalıyken inert
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Çok katlı çelik yapı');
  });

  test('eski bağlantı ?w=&l=… → /konfigurator/hol; çok katlı: 5 kat → 35 kolon, radye 70 cm; 3 kat → 50 cm', async ({ page }) => {
    await page.goto('/tr/konfigurator?w=24&l=60&e=7&r=9&b=6');
    await expect(page).toHaveURL(/\/tr\/konfigurator\/hol\?.*width=24/); // eski kısa anahtarlar motor alan kimliklerine çevrilir
    await page.goto('/tr/konfigurator/cok-katli?width=20&length=30&fh=3.2&floors=5');
    await expect(page.locator('.configurator-bar a').first()).toHaveAttribute('href', '/tr/konfigurator');
    await openConfiguratorPanel(page);
    await expect(page.locator('.engine-kpi').filter({ hasText: 'Kolon adedi' })).toContainText('35');
    await expect(page.locator('.engine-kpi').filter({ hasText: 'Radye temel' })).toContainText('70 cm');
    await page.locator('#n-floors').fill('3');
    await page.locator('#n-floors').press('Enter');
    await expect(page.locator('.engine-kpi').filter({ hasText: 'Radye temel' })).toContainText('50 cm');
    await expect.poll(() => new URL(page.url()).searchParams.get('floors')).toBe('3');
    await expect(page.getByTestId('engine-bom')).toContainText('HEB 300');
  });

  test('EN: /en/configurator kartları ve çok katlı sayfa', async ({ page }) => {
    await page.goto('/en/configurator');
    await expect(page.locator('.configurator-type').nth(1)).toHaveAttribute('href', '/en/configurator/multi-storey');
    await page.goto('/en/configurator/multi-storey');
    await openConfiguratorPanel(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Multi-storey steel building');
  });
});

// K-81: mobilde tuval tam ekran; ayrıntılar sağdan açılan panelde — kapalıyken gizli, Esc ile kapanır; seçim sayfasında geri → ana sayfa
test.describe('konfigüratör mobil paneli', () => {
  test('panel kapalı başlar, düğmeyle açılır, Esc ile kapanır; masaüstünde hep açık', async ({ page }, testInfo) => {
    await page.goto('/tr/konfigurator/hol?width=18&length=53&eave=6&ridge=8&bay=6');
    const heading = page.getByRole('heading', { level: 2, name: 'Ölçüler' });
    const toggle = page.getByRole('button', { name: 'Ölçüler ve metraj' });
    if (testInfo.project.name === 'desktop') {
      await expect(heading).toBeVisible();
      await expect(toggle).toBeHidden();
      return;
    }
    await expect(heading).toBeHidden();
    await expect(page.locator('.configurator-summary').first()).toContainText('18 × 53 m');
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
