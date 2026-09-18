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

// Faz 21: satış → e-Fatura (tevkifat 4/10) → tahsil edilecek → ödeme planı (oran) → tahsilat → durumlar → /admin/invoices → temizlik.
test.describe('fatura & tahsilat', () => {
  test('cron reminders 401', async ({ request }) => {
    expect((await request.get('/api/cron/reminders')).status()).toBe(401);
  });

  test.describe('akış', () => {
    test.skip(!hasAccount, 'E2E_ADMIN_* yok');
    test.beforeEach(() => {
      test.skip(test.info().project.name !== 'desktop', 'yalnız desktop');
    });

    test('fatura + plan + tahsilat', async ({ page }) => {
      test.slow();
      const stamp = Date.now();
      const title = `E2E Fatura Müşterisi ${stamp}`;
      await login(page, '/admin/customers/new');
      await page.getByLabel('Firma ünvanı').fill(title);
      await page.getByRole('button', { name: 'Kaydet' }).click();
      await page.waitForURL(/\/admin\/customers\/[0-9a-f-]{36}$/);
      const customerId = page.url().split('/').pop()!;
      await page.goto(`/admin/sales/new?customer=${customerId}`);
      await page.getByLabel('Kalemler').fill('Çelik konstrüksiyon | 10 | ton | 1000 | 700');
      await page.getByLabel('Notlar').fill(`E2E ${stamp}`);
      await page.getByRole('button', { name: 'Kaydet' }).click();
      await page.waitForURL(/\/admin\/sales\/[0-9a-f-]{36}$/);
      const saleId = page.url().split('/').pop()!;

      await page.goto(`/admin/sales/${saleId}/finance`);
      // matrah 10.000 · KDV 2.000 · toplam 12.000 · tevkifat 4/10 = 800 · tahsil edilecek 11.200
      const newForm = page.locator('form').filter({ has: page.getByRole('button', { name: 'Fatura ekle' }) });
      await newForm.getByLabel('Fatura tipi').selectOption('e_invoice');
      await newForm.getByLabel('Tevkifat').selectOption('0.4');
      await expect(newForm.getByTestId('collectable-new')).toContainText('11.200');
      await newForm.getByLabel('Fatura no').fill(`EF-${stamp}`);
      await newForm.getByLabel('Kesim tarihi').fill('2026-09-18');
      await newForm.getByLabel('Durum').selectOption('sent');
      await newForm.getByRole('button', { name: 'Fatura ekle' }).click();
      await expect(page.locator('summary').filter({ hasText: `EF-${stamp}` })).toBeVisible();
      await expect(page.locator('summary').filter({ hasText: `EF-${stamp}` })).toContainText('11.200');

      await page.getByLabel('Plan satırları').fill('Peşinat | 50 | | 2026-10-01\nTeslim | 50 | | 2026-12-01');
      await expect(page.getByText('2 hakediş')).toBeVisible();
      await page.locator('form').filter({ has: page.getByLabel('Plan satırları') }).getByRole('button', { name: 'Kaydet' }).click();
      await expect(page.getByRole('cell', { name: 'Peşinat' })).toBeVisible();
      await expect(page.getByRole('row').filter({ hasText: 'Peşinat' })).toContainText('5.600');

      const pay = page.locator('form').filter({ has: page.getByRole('button', { name: 'Tahsilat ekle' }) });
      await pay.getByLabel('Tutar').fill('5600');
      await pay.getByLabel('Fatura').selectOption({ index: 1 });
      await pay.getByLabel('Hakediş / ödeme planı').selectOption({ index: 1 }).catch(() => pay.getByLabel('Hakediş').selectOption({ index: 1 }));
      await pay.getByRole('button', { name: 'Tahsilat ekle' }).click();
      await expect(page.getByRole('row').filter({ hasText: 'Peşinat' })).toContainText('Tahsil edildi');
      await expect(page.locator('summary').filter({ hasText: `EF-${stamp}` })).toContainText('Kısmi ödendi');
      await expect(page.getByTestId('remaining')).toContainText('5.600');

      await page.goto('/admin/invoices?status=partially_paid');
      await expect(page.getByRole('row').filter({ hasText: `EF-${stamp}` })).toBeVisible();

      // Temizlik: tahsilat → fatura → satış → müşteri
      await page.goto(`/admin/sales/${saleId}/finance`);
      await page.locator('li').filter({ hasText: 'Havale/EFT' }).getByRole('button', { name: 'Sil' }).click();
      await expect(page.locator('li').filter({ hasText: 'Havale/EFT' })).toHaveCount(0);
      const inv = page.locator('details').filter({ hasText: `EF-${stamp}` });
      await inv.locator('summary').click();
      await inv.getByRole('button', { name: 'Sil' }).click();
      await expect(page.locator('summary').filter({ hasText: `EF-${stamp}` })).toHaveCount(0);
      await page.goto(`/admin/sales/${saleId}`);
      await page.getByRole('button', { name: 'Sil' }).click();
      await page.waitForURL(/\/admin\/sales$/);
      await page.goto(`/admin/customers/${customerId}`);
      await page.getByRole('button', { name: 'Sil' }).click();
      await page.waitForURL(/\/admin\/customers$/);
    });
  });
});
