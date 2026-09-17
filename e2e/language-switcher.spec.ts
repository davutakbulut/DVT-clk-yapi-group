import { expect, test } from '@playwright/test';

test.describe('dil değiştirici', () => {
  test('TR → EN → TR: içerik, <html lang> ve NEXT_LOCALE çerezi birlikte değişir', async ({ page, context }) => {
    await page.goto('/tr');
    await page.getByRole('link', { name: 'English' }).click();

    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByText('Under construction')).toBeVisible();
    expect((await context.cookies()).find((cookie) => cookie.name === 'NEXT_LOCALE')?.value).toBe('en');

    await page.getByRole('link', { name: 'Türkçe' }).click();

    await expect(page).toHaveURL(/\/tr$/);
    await expect(page.getByText('Yapım aşamasında')).toBeVisible();
    expect((await context.cookies()).find((cookie) => cookie.name === 'NEXT_LOCALE')?.value).toBe('tr');
  });

  // Konfigüratör parametreleri (?w=20&l=40) ve ana sayfa çapaları dil değişiminde kaybolmamalı
  test('sorgu dizesi ve hash korunur', async ({ page }) => {
    await page.goto('/tr?w=20&l=40#main-content');
    await page.getByRole('link', { name: 'English' }).click();

    await expect(page).toHaveURL(/\/en\?w=20&l=40#main-content$/);
  });

  test('geçerli dil bağlantı değildir ve ekran okuyucuya duyurulur', async ({ page }) => {
    await page.goto('/tr');
    const group = page.getByRole('group', { name: 'Dil seçimi' });

    await expect(group.getByLabel('Türkçe (geçerli dil)')).toHaveAttribute('aria-current', 'true');
    await expect(group.getByRole('link')).toHaveCount(1);
  });

  test("JS'siz de çalışır (aşamalı geliştirme)", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/tr');
    await page.getByRole('link', { name: 'English' }).click();

    await expect(page).toHaveURL(/\/en$/);
    await context.close();
  });
});
