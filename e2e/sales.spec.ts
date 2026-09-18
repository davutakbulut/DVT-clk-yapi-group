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

// Faz 20: müşteri → satış (kalemler + gider + KDV) → canlı özet ve kâr marjı → listede → sil; cron 401.
test.describe('satış & maliyet', () => {
  test('cron rates 401', async ({ request }) => {
    expect((await request.get('/api/cron/rates')).status()).toBe(401);
  });

  test.describe('akış', () => {
    test.skip(!hasAccount, 'E2E_ADMIN_* yok');

    test('müşteri oluştur → satış kaydı → özet doğru → listede marj → sil', async ({ page }) => {
      test.slow();
      const stamp = Date.now();
      const title = `E2E Satış Müşterisi ${stamp}`;
      await login(page, '/admin/customers/new');
      await page.getByLabel('Firma ünvanı').fill(title);
      await page.getByRole('button', { name: 'Kaydet' }).click();
      await page.waitForURL(/\/admin\/customers\/[0-9a-f-]{36}$/);
      const customerId = page.url().split('/').pop()!;

      await page.goto(`/admin/sales/new?customer=${customerId}`);
      await expect(page.getByLabel('Müşteri')).toHaveValue(customerId);
      // 10 ton × 1.000 = 10.000; maliyet 10 × 700 = 7.000; gider 500 → maliyet 7.500; KDV %20 → 2.000; toplam 12.000; kâr 2.500 → %25
      await page.getByLabel('Kalemler').fill('Çelik konstrüksiyon | 10 | ton | 1000 | 700');
      await page.getByLabel(/Ek giderler/).fill('shipping | Nakliye | 500');
      await page.getByLabel('Notlar').fill(`E2E ${stamp}`);
      await expect(page.getByTestId('grand-total')).toContainText('12.000');
      await expect(page.getByTestId('margin')).toContainText('25');
      await page.getByRole('button', { name: 'Kaydet' }).click();
      await page.waitForURL(/\/admin\/sales\/[0-9a-f-]{36}$/);
      await expect(page.getByRole('heading', { level: 1 })).toContainText('SAT-');
      await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
      await expect(page.getByTestId('grand-total')).toContainText('12.000');

      await page.goto('/admin/sales');
      const row = page.getByRole('row').filter({ hasText: title });
      await expect(row).toBeVisible();
      await expect(row).toContainText('12.000');
      await expect(row).toContainText('%25');

      await page.goto(`/admin/customers/${customerId}`);
      await expect(page.getByRole('link', { name: /SAT-\d{4}-\d{4}/ })).toBeVisible();

      await page.goto('/admin/sales');
      await page.getByRole('row').filter({ hasText: title }).getByRole('link', { name: /SAT-/ }).click();
      await page.getByRole('button', { name: 'Sil' }).click();
      await page.waitForURL(/\/admin\/sales$/);
      await expect(page.getByRole('row').filter({ hasText: title })).toHaveCount(0);
      await page.goto(`/admin/customers/${customerId}`);
      await page.getByRole('button', { name: 'Sil' }).click();
      await page.waitForURL(/\/admin\/customers$/);
    });
  });
});
