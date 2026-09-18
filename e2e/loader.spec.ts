import { expect, test } from '@playwright/test';

// İlk giriş yükleyicisi (K-74): otomasyonda varsayılan KAPALI (E2E/Lighthouse etkilenmez); ?clk_loader=1 ile zorlanır.
test.describe('site yükleyicisi', () => {
  test('otomasyonda çıkmaz; içerik hemen erişilebilir', async ({ page }) => {
    await page.goto('/tr');
    await expect(page.locator('html')).not.toHaveClass(/clk-loading/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('zorlanınca: durum bölgesi görünür, ilerler, kapanır, oturuma işaret yazar; içerik altta DOM\'da', async ({ page }) => {
    await page.goto('/tr?clk_loader=1');
    const loader = page.getByRole('status', { name: 'Sayfa yükleniyor' });
    await expect(loader).toBeVisible();
    // içerik katmanın altında render edilmiş (SSR): h1 DOM'da
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(loader).toHaveCount(0, { timeout: 12000 });
    await expect(page.locator('html')).not.toHaveClass(/clk-loading/);
    expect(await page.evaluate(() => sessionStorage.getItem('clk:loaded'))).toBe('1');
    // kaydırma kilidi kalktı
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');
  });

  test('hero videosu scrub modunda tamamen indirilip blob olarak bağlanır', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', 'yalnız desktop');
    await page.goto('/tr');
    const video = page.locator('.hero video');
    test.skip((await page.locator('.hero-scrub, .hero-static').count()) === 0, 'Veritabanı yok (CI)');
    await expect(video).toHaveAttribute('src', /^blob:/, { timeout: 20000 });
  });
});
