import { expect, test, type Page } from '@playwright/test';

const EMAIL = process.env['E2E_ADMIN_EMAIL'];
const PASSWORD = process.env['E2E_ADMIN_PASSWORD'];
const hasAccount = Boolean(EMAIL && PASSWORD);

async function dismissCookies(page: Page) {
  const btn = page.getByRole('button', { name: 'Yalnız zorunlu' });
  if (await btn.isVisible().catch(() => false)) await btn.click();
}
async function login(page: Page, next: string) {
  await page.goto(`/tr/giris?next=${encodeURIComponent(next)}`);
  await page.waitForLoadState('networkidle');
  await page.getByLabel('E-posta').fill(EMAIL!);
  await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD!);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.waitForURL((url) => `${url.pathname}${url.search}` === next);
  await page.waitForLoadState('networkidle');
}

// Faz 29: gönderim listesi/detayı, talebi olan konfigürasyon → satış (kalemler), kurallar formu kaydeder.
test.describe('konfigüratör admin', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok');
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop', 'yalnız desktop');
  });

  test('anonim kayıt + talep → admin liste → detay → satışa dönüştür', async ({ page, context }) => {
    test.slow();
    const stamp = Date.now();
    const name = `E2E Konfig Admin ${stamp}`;
    await page.goto('/tr/konfigurator?w=20&l=40&e=6&r=8&b=6');
    await dismissCookies(page);
    const form = page.getByTestId('save-form');
    await form.getByLabel('Kayıt adı (isteğe bağlı)').fill(name);
    await form.locator('input[name="email"]').fill(`e2e-konfig-${stamp}@example.com`);
    await form.locator('input[name="consentKvkk"]').check();
    await form.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await page.getByTestId('save-done').getByRole('link', { name: 'Paylaşım sayfası' }).click();
    await expect(page).toHaveURL(/\/konfigurator\/k\//);
    const quote = page.locator('#quote form');
    await quote.getByLabel('Ad Soyad').fill(`E2E Konfig Talep ${stamp}`);
    await quote.locator('input[name="email"]').fill(`e2e-konfig-${stamp}@example.com`);
    await quote.locator('input[name="consentKvkk"]').check();
    await quote.getByRole('button', { name: /Gönder/ }).click();
    await expect(page.locator('#quote').getByRole('status')).toContainText(/TLP-/);
    await context.clearCookies();

    await login(page, '/admin/configurator');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Konfigüratör Gönderimleri');
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toContainText('Talebe dönüştü');
    await row.getByRole('link').first().click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(name);
    await expect(page.getByRole('link', { name: /Talebi aç/ })).toBeVisible();
    await page.getByRole('button', { name: 'Satışa dönüştür' }).click();
    await page.waitForURL(/\/admin\/sales\/[0-9a-f-]{36}$/);
    await expect(page.getByText(/Konfig [0-9a-f]{10} v1 · column/).first()).toBeVisible();
  });

  test('kurallar formu: işçilik katsayısı kaydedilir ve geri alınır', async ({ page }) => {
    await login(page, '/admin/configurator/rules');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Konfigüratör Kuralları');
    const labor = page.getByLabel('İşçilik katsayısı');
    const original = await labor.inputValue();
    await labor.fill('1.15');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page.getByRole('status')).toContainText(/Kaydedildi/);
    await page.reload();
    await expect(page.getByLabel('İşçilik katsayısı')).toHaveValue('1.15');
    await page.getByLabel('İşçilik katsayısı').fill(original);
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page.getByRole('status')).toContainText(/Kaydedildi/);
  });
});
