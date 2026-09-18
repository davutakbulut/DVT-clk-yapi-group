import { expect, test, type Page } from '@playwright/test';
import { openConfiguratorPanel } from './support/configuratorPanel';

const EMAIL = process.env['E2E_ADMIN_EMAIL'];
const PASSWORD = process.env['E2E_ADMIN_PASSWORD'];
const hasAccount = Boolean(EMAIL && PASSWORD);


async function dismissCookies(page: Page) {
  const btn = page.getByRole('button', { name: 'Yalnız zorunlu' });
  if (await btn.isVisible().catch(() => false)) await btn.click();
}

// Faz 28: ziyaretçi → fiyat kapısı (K-29) + anonim kayıt (K-30) → paylaşım sayfası → yazdır → teklif (kaynak configurator); üye → fiyat paneli.
test.describe('konfigüratör kaydet/paylaş', () => {
  test('anonim: fiyat kapısı · kaydet · paylaşım sayfası · yazdır · teklif iste', async ({ page }) => {
    test.slow();
    const stamp = Date.now();
    await page.goto('/tr/konfigurator?w=20&l=40&e=6&r=8&b=6');
    await dismissCookies(page);
    await openConfiguratorPanel(page);
    await expect(page.getByTestId('price-gate')).toContainText('üye');
    const form = page.getByTestId('save-form');
    await form.getByLabel('Kayıt adı (isteğe bağlı)').fill(`E2E Konfig ${stamp}`);
    await form.locator('input[name="email"]').fill(`e2e-konfig-${stamp}@example.com`);
    await form.locator('input[name="consentKvkk"]').check();
    await form.getByRole('button', { name: 'Kaydet', exact: true }).click();
    const done = page.getByTestId('save-done');
    await expect(done).toContainText('Kaydedildi');
    await done.getByRole('link', { name: 'Paylaşım sayfası' }).click();
    await expect(page).toHaveURL(/\/tr\/konfigurator\/k\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`E2E Konfig ${stamp}`);
    await expect(page.getByText(/Referans [0-9a-f]{10} · Sürüm 1/)).toBeVisible();
    const shareUrl = page.url();
    // yazdırma görünümü
    await page.goto(`${shareUrl.replace(/\/tr\/konfigurator\/k\//, '/tr/konfigurator/k/')}/yazdir`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`E2E Konfig ${stamp}`);
    await expect(page.getByRole('rowheader', { name: 'Kolon', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /PDF/ })).toBeVisible();
    // teklif
    await page.goto(`${shareUrl}#quote`);
    await dismissCookies(page);
    const quote = page.locator('#quote form');
    await quote.getByLabel('Ad Soyad').fill(`E2E Konfig Talep ${stamp}`);
    await quote.locator('input[name="email"]').fill(`e2e-konfig-${stamp}@example.com`);
    await quote.locator('input[name="consentKvkk"]').check();
    await quote.getByRole('button', { name: /Gönder/ }).click();
    await expect(page.locator('#quote').getByRole('status')).toContainText(/TLP-/);
  });

  test.describe('üye', () => {
    test.skip(!hasAccount, 'E2E_ADMIN_* yok');
    test.beforeEach(() => {
      test.skip(test.info().project.name !== 'desktop', 'yalnız desktop');
    });
    test('fiyat paneli görünür (kapı yok); Hesabım listesi', async ({ page }) => {
      await page.goto('/tr/giris?next=%2Ftr%2Fkonfigurator%2Fhol');
      await page.getByLabel('E-posta').fill(EMAIL!);
      await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD!);
      await page.getByRole('button', { name: 'Giriş yap' }).click();
      await page.waitForURL(/\/tr\/konfigurator\/hol/);
      await expect(page.getByTestId('price-panel')).toBeVisible();
      await expect(page.getByTestId('price-gate')).toHaveCount(0);
      await page.goto('/tr/hesabim');
      await expect(page.getByRole('heading', { name: 'Konfigürasyonlarım' })).toBeVisible();
    });
  });
});
