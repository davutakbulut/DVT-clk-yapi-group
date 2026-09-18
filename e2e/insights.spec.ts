import { expect, test, type Page } from '@playwright/test';

const EMAIL = process.env['E2E_ADMIN_EMAIL'];
const PASSWORD = process.env['E2E_ADMIN_PASSWORD'];
const hasAccount = Boolean(EMAIL && PASSWORD);

async function login(page: Page, next: string) {
  await page.goto(`/tr/giris?next=${encodeURIComponent(next)}`);
  await page.waitForLoadState('networkidle');
  await page.getByLabel('E-posta').fill(EMAIL!);
  await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD!);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.waitForURL((url) => `${url.pathname}${url.search}` === next);
  await page.waitForLoadState('networkidle');
}

// Faz 24: sıcaklık haritası / form analizi / yolculuk sayfaları yüklenir; huni oluştur → değerlendir → sil.
test.describe('analitik içgörüler', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok');
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop', 'yalnız desktop');
  });

  test('sayfalar + huni CRUD', async ({ page }) => {
    test.slow();
    await login(page, '/admin/analytics/heatmap');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sıcaklık haritası');
    await page.goto('/admin/analytics/forms');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Form analizi');
    await page.goto('/admin/analytics/journeys');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kullanıcı yolculuğu');

    const name = `E2E Huni ${Date.now()}`;
    await page.goto('/admin/analytics/funnels');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dönüşüm hunileri');
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Ekle' }) }).first();
    await form.getByLabel('Ad', { exact: true }).fill(name);
    await form.getByLabel('Adımlar').fill('Ana sayfa | path | /tr\nHizmet | path_prefix | /tr/hizmetler\nTeklif | event | quote_form');
    await form.getByRole('button', { name: 'Ekle' }).click();
    const item = page.locator('details').filter({ hasText: name });
    await expect(item).toBeVisible();
    await item.evaluate((el) => {
      (el as HTMLDetailsElement).open = true;
    });
    // veri yokken tablo yerine "Kayıt yok" gelir → adımlar düzenleme alanından doğrulanır
    await expect(item.getByLabel('Adımlar')).toHaveValue(/Hizmet \| path_prefix/);
    await item.getByRole('button', { name: 'Sil' }).click();
    await expect(page.locator('details').filter({ hasText: name })).toHaveCount(0);
  });
});
