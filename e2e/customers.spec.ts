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

// Faz 19 (CRM): müşteri oluştur → listede ara → düzenle; ziyaretçi talebi → talep detayından müşteriye dönüştür → bağlı talep → anonimleştir.
test.describe('müşteriler (CRM)', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok');

  test('oluştur → ara → düzenle → sil', async ({ page }) => {
    test.slow();
    const stamp = Date.now();
    const title = `E2E Firma ${stamp}`;
    await login(page, '/admin/customers/new');
    await page.getByLabel('Firma ünvanı').fill(title);
    await page.getByLabel('Yetkili adı').fill('E2E Yetkili');
    await page.getByLabel('VKN / TCKN').fill('1234567890');
    await page.getByLabel('E-posta').fill(`e2e-${stamp}@example.com`);
    await page.getByLabel('İl', { exact: true }).fill('İzmir');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.waitForURL(/\/admin\/customers\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);

    await page.goto(`/admin/customers?q=${encodeURIComponent(String(stamp))}`);
    const row = page.getByRole('row').filter({ hasText: title });
    await expect(row).toBeVisible();
    await expect(row).toContainText('1234567890');
    await row.getByRole('link', { name: title }).click();
    await page.getByLabel('Notlar').fill('E2E notu');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page.getByRole('status')).toContainText('Kaydedildi');
    await page.getByRole('button', { name: 'Sil' }).click();
    await page.waitForURL(/\/admin\/customers$/);
    await page.goto(`/admin/customers?q=${encodeURIComponent(String(stamp))}`);
    await expect(page.getByRole('row').filter({ hasText: title })).toHaveCount(0);
  });

  test('talep → müşteriye dönüştür → bağlı talep görünür → anonimleştir', async ({ page, browser }) => {
    test.slow();
    const stamp = Date.now();
    const name = `E2E Talep ${stamp}`;
    const visitor = await browser.newContext();
    const vp = await visitor.newPage();
    await vp.goto('/tr/teklif-al');
    await vp.waitForLoadState('networkidle');
    await vp.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
    await vp.getByLabel('Ad Soyad').fill(name);
    await vp.getByLabel('Firma').fill(`E2E Müşteri A.Ş. ${stamp}`);
    await vp.getByLabel('E-posta', { exact: true }).fill(`e2e-crm-${stamp}@example.com`);
    await vp.getByLabel(/KVKK/).check();
    await vp.getByRole('button', { name: 'Gönder' }).click();
    const status = vp.locator('#main-content [role="status"]');
    await expect(status).toContainText('Talebiniz alındı', { timeout: 20_000 });
    const ref = (await status.textContent())!.match(/TLP-\d{4}-\d{4}/)![0];
    await visitor.close();

    await login(page, '/admin/leads');
    await page.getByRole('row').filter({ hasText: ref }).getByRole('link', { name: ref }).click();
    await page.getByRole('button', { name: 'Müşteriye dönüştür' }).click();
    await page.waitForURL(/\/admin\/customers\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(`E2E Müşteri A.Ş. ${stamp}`);
    await expect(page.getByRole('link', { name: ref })).toBeVisible();
    await expect(page.getByLabel('Kaynak')).toHaveValue('lead');

    await page.getByLabel('Onaylıyorum, geri alınamaz').check();
    await page.getByRole('button', { name: 'Anonimleştir (KVKK)' }).click();
    await expect(page.getByText(/anonimleştirildi/)).toBeVisible();
    await page.reload(); // kontrolsüz input: yeniden bağlanınca boş değer görünür
    await expect(page.getByLabel('E-posta')).toHaveValue('');
    await page.goto('/admin/leads');
    await expect(page.getByRole('row').filter({ hasText: ref })).toContainText('Anonim');
  });
});
