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

// Faz 27: metraj tablosu herkese açık (K-29); kg/m yoksa "—" + eksik uyarısı; admin profil CRUD (yalnız admin).
test.describe('metraj', () => {
  test('metraj tablosu: kolon 16 adet · 96 m; profil eksikse uyarı ya da tonaj', async ({ page }) => {
    await page.goto('/tr/konfigurator?w=20&l=40&e=6&r=8&b=6');
    const takeoff = page.getByTestId('takeoff');
    await expect(takeoff.getByRole('heading', { name: 'Metraj' })).toBeVisible();
    const columnRow = takeoff.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Kolon', exact: true }) });
    await expect(columnRow.getByRole('cell').nth(1)).toHaveText('16');
    await expect(columnRow.getByRole('cell').nth(2)).toHaveText('96 m');
    await expect(takeoff.getByRole('rowheader', { name: 'Çatı paneli' })).toBeVisible();
    const tonnage = page.getByTestId('tonnage');
    await expect(tonnage).toHaveText(/—|\d+,\d+ t/);
  });

  test.describe('panel', () => {
    test.skip(!hasAccount, 'E2E_ADMIN_* yok');
    test.beforeEach(() => {
      test.skip(test.info().project.name !== 'desktop', 'yalnız desktop');
    });

    test('profil ekle → listede → sil', async ({ page }) => {
      test.slow();
      const code = `E2E${Date.now() % 100000}`;
      await login(page, '/admin/configurator/profiles');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Çelik Profiller');
      const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Ekle' }) }).first();
      await form.getByLabel('Kod').fill(code);
      await form.getByLabel('Aile').fill('E2E');
      await form.getByLabel('kg/m').fill('12,5');
      await form.getByRole('button', { name: 'Ekle' }).click();
      const item = page.locator('details').filter({ hasText: code });
      await expect(item).toBeVisible();
      await expect(item.locator('summary')).toContainText('12.5 kg/m');
      await item.evaluate((el) => {
        (el as HTMLDetailsElement).open = true;
      });
      await item.getByRole('button', { name: 'Sil' }).click();
      await expect(page.locator('details').filter({ hasText: code })).toHaveCount(0);
    });
  });
});
