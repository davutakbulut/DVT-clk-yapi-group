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

// K-87: liste sayfalarında kapak küçük resmi; tıklayınca büyük hâli (dialog), Esc kapatır. Ürünlerde kapak var (0043).
test.describe('liste küçük resimleri', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_ADMIN_* yok');
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'yalnız desktop'));

  test('ürün listesi: küçük resim → büyüt → Esc', async ({ page }) => {
    await login(page, '/admin/products');
    const thumb = page.locator('button.admin-thumb').first();
    await expect(thumb).toBeVisible();
    await expect(thumb.locator('img')).toHaveAttribute('src', /storage\/v1\/object\/public\/media\//);
    await thumb.click();
    const dialog = page.locator('dialog.admin-lightbox[open]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('img')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('diğer listeler açılır (proje, blog, hizmet, ekip, referans, kategori)', async ({ page }) => {
    await login(page, '/admin/projects');
    for (const p of ['/admin/projects', '/admin/blog', '/admin/services', '/admin/team', '/admin/references', '/admin/product-categories', '/admin/certificates', '/admin/solutions']) {
      await page.goto(p);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('#admin-content > p[role="alert"]')).toHaveCount(0); // yetki/hata paragrafı yok (kabuktaki bildirim alanı role=alert taşıyabilir)
    }
  });
});
