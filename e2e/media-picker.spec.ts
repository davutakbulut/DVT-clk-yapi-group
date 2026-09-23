import { expect, test, type Page } from '@playwright/test';

const EMAIL = process.env['E2E_ADMIN_EMAIL'];
const PASSWORD = process.env['E2E_ADMIN_PASSWORD'];
// 1×1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

async function login(page: Page, next: string) {
  await page.goto(`/tr/giris?next=${encodeURIComponent(next)}`);
  await page.waitForLoadState('networkidle');
  await page.getByLabel('E-posta').fill(EMAIL!);
  await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD!);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.waitForURL((url) => `${url.pathname}${url.search}` === next);
  await page.waitForLoadState('networkidle');
}

// MediaPicker (K-85): form içinden yükleme → gizli alan yeni media id'yi taşır, önizleme görünür; dosya media/<folder>/ altına gider.
test.describe('form içi görsel yükleme', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_* yok');
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'yalnız desktop'));

  test('ürün kategorisi formunda görsel yükle → seçili olur', async ({ page }) => {
    await login(page, '/admin/product-categories');
    const picker = page.locator('input[name="imageId"]').first().locator('..');
    const file = picker.locator('input[type=file]');
    await file.setInputFiles({ name: 'e2e-picker.png', mimeType: 'image/png', buffer: PNG });
    await picker.getByRole('button', { name: 'Dosya yükle', exact: true }).click(); // input[type=file] de 'button' rolündedir
    await expect(picker.locator('input[name="imageId"]')).not.toHaveValue('', { timeout: 30_000 });
    await expect(picker.locator('select')).toContainText(/products\//);
    await expect(picker.locator('img')).toBeVisible();
  });
});
