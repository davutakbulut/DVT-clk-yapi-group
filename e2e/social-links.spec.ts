import { expect, test, type Page } from '@playwright/test';

const EMAIL = process.env['E2E_ADMIN_EMAIL'];
const PASSWORD = process.env['E2E_ADMIN_PASSWORD'];

async function login(page: Page, next: string) {
  await page.goto(`/tr/giris?next=${encodeURIComponent(next)}`);
  await page.waitForLoadState('networkidle');
  await page.getByLabel('E-posta').fill(EMAIL!);
  await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD!);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.waitForURL((url) => `${url.pathname}${url.search}` === next);
  await page.waitForLoadState('networkidle');
}

// Sosyal medya (K-86): panelden ikonlu satır eklenir → footer'da yuvarlak düğme; kaldırılınca footer'dan düşer. Test sonunda liste eski hâline döner.
test.describe('sosyal medya bağlantıları', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_* yok');
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'yalnız desktop'));

  test('ekle → footer ikonu → kaldır', async ({ page }) => {
    await login(page, '/admin/settings/social');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sosyal Medya');
    const before = await page.locator('li[class*="rounded-md"]').count();
    await page.getByRole('button', { name: '+ Instagram' }).click();
    const row = page.locator('li').filter({ has: page.getByLabel('Görünen ad') }).last();
    await expect(row.getByLabel('Görünen ad')).toHaveValue('Instagram');
    await row.getByLabel('Adres (https://…)').fill('https://www.instagram.com/e2e-clk-test');
    await expect(row.locator('[data-platform="instagram"]')).toBeVisible();
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page.getByRole('status')).toContainText('Kaydedildi');
    try {
      await page.goto('/tr');
      const link = page.locator('footer .social-link[href="https://www.instagram.com/e2e-clk-test"]');
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('aria-label', 'Instagram');
    } finally {
      await page.goto('/admin/settings/social');
      await page.getByRole('button', { name: /^Kaldır: Instagram$/ }).last().click();
      await expect(page.locator('li').filter({ has: page.getByLabel('Görünen ad') })).toHaveCount(before);
      await page.getByRole('button', { name: 'Kaydet' }).click();
      await expect(page.getByRole('status')).toContainText('Kaydedildi');
    }
  });
});
