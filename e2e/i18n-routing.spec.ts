import { expect, test } from '@playwright/test';

test.describe('locale yönlendirme', () => {
  test('/ her zaman /tr — Accept-Language: en olsa bile (localeDetection kapalı)', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US', extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' } });
    const page = await context.newPage();
    await page.goto('/');

    await expect(page).toHaveURL(/\/tr$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await context.close();
  });

  test('<html lang> ve hreflang kümesi iki yönlü tutarlı', async ({ page }) => {
    for (const locale of ['tr', 'en'] as const) {
      await page.goto(`/${locale}`);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`/${locale}$`));
      for (const [hreflang, path] of [['tr', '/tr'], ['en', '/en'], ['x-default', '/tr']] as const) {
        await expect(page.locator(`link[rel="alternate"][hreflang="${hreflang}"]`)).toHaveAttribute('href', new RegExp(`${path}$`));
      }
    }
  });

  test('yayın öncesi site indeks dışı: X-Robots-Tag + robots.txt', async ({ request }) => {
    expect((await request.get('/tr')).headers()['x-robots-tag']).toContain('noindex');
    expect(await (await request.get('/robots.txt')).text()).toMatch(/Disallow: \/\s*$/m);
  });
});

test.describe('404', () => {
  test('/tr/olmayan → dilli 404, gezinme yerinde, durum kodu gerçek 404', async ({ page }) => {
    const response = await page.goto('/tr/olmayan-sayfa');

    expect(response?.status()).toBe(404);
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    // Başlık admin'den (static_pages.error-404); build ortamında veritabanı yoksa messages'taki nötr metin
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^(Bu kat henüz inşa edilmedi|Sayfa bulunamadı)$/);
    await expect(page.getByRole('banner')).toBeVisible();
  });

  test('/en/missing → İngilizce 404', async ({ page }) => {
    const response = await page.goto('/en/missing-page');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  });

  test('locale önekisiz bilinmeyen yol /tr altına alınır, sonra dilli 404', async ({ page }) => {
    const response = await page.goto('/olmayan-sayfa');

    await expect(page).toHaveURL(/\/tr\/olmayan-sayfa$/);
    expect(response?.status()).toBe(404);
  });

  test('matcher dışı (noktalı) yol → kök 404, tek <html>', async ({ page }) => {
    const response = await page.goto('/olmayan.dosya');

    expect(response?.status()).toBe(404);
    expect(await page.locator('html').count()).toBe(1);
    // Başlık admin'den (static_pages.error-404); build ortamında veritabanı yoksa messages'taki nötr metin
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^(Bu kat henüz inşa edilmedi|Sayfa bulunamadı)$/);
  });
});
