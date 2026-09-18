import AxeBuilder from '@axe-core/playwright';
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

// Faz 16: fiyat rehberi listesi; admin: malzeme fiyatı → rehber (satır koda bağlı) → yayınla → sitede tablo aralığı + hesaplayıcı → sil.
test.describe('fiyat rehberi', () => {
  test('/tr/fiyatlar: h1, BreadcrumbList, axe temiz; bilinmeyen rehber 404', async ({ page }) => {
    await page.goto('/tr/fiyatlar');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fiyat Rehberi');
    expect((await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ')).toContain('BreadcrumbList');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect((await page.goto('/tr/fiyatlar/yok-boyle-rehber'))?.status()).toBe(404);
  });
});

test.describe('fiyat yönetimi', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok');

  test('malzeme fiyatı → rehber → yayınla → sitede aralık + hesaplayıcı → sil', async ({ page }) => {
    test.slow();
    const stamp = Date.now();
    const code = `E2E-${stamp}`;
    await login(page, '/admin/pricing/materials');
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Ekle' }) }).first();
    await form.getByLabel('Kod').fill(code);
    await form.getByLabel('Ad (Türkçe)').fill('E2E çelik');
    await form.getByLabel('Birim fiyat').fill('1000');
    await form.getByRole('button', { name: 'Ekle' }).click();
    await expect(page.locator('summary').filter({ hasText: code })).toBeVisible();

    await page.goto('/admin/pricing/new');
    const name = `E2E Fiyat ${stamp}`;
    await page.getByLabel('Başlık (Türkçe)').fill(name);
    await page.getByLabel('Fiyat satırları (Türkçe)').fill(`Portal çerçeve | Tek açıklık | ${code} | 0,9 | 1,2\nMalzemesiz satır | | | |`);
    await page.getByLabel('Hazır metrajlar').fill('50, 100');
    await page.getByLabel('Uyarı (zorunlu) (Türkçe)').fill('Tahmini aralıktır; kesin teklif keşif sonrası verilir.');
    await page.getByLabel('Durum').selectOption('published');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.waitForURL(/\/admin\/pricing\/[0-9a-f-]{36}$/);
    const slug = await page.getByLabel('Slug (TR)').inputValue();
    expect(slug).toMatch(/^e2e-fiyat-\d+$/);

    const res = await page.goto(`/tr/fiyatlar/${slug}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await expect(page.getByRole('note')).toContainText('keşif');
    const table = page.getByRole('table').filter({ hasText: 'Portal çerçeve' });
    await expect(table).toBeVisible();
    // 1000 × 0,9 – 1000 × 1,2 = 900 – 1.200 ₺ ; 50 ton sütunu 45.000 – 60.000
    await expect(table).toContainText('900');
    await expect(table).toContainText('1.200');
    await expect(table).toContainText('45.000');
    await expect(table.getByRole('row').filter({ hasText: 'Malzemesiz satır' })).toContainText('—');
    const calc = page.locator('#main-content').getByRole('region', { name: 'Hızlı hesaplayıcı' });
    await calc.getByLabel(/^Metraj/).fill('10');
    await expect(calc).toContainText('9.000');
    await expect(calc).toContainText('12.000');
    await expect(calc.getByRole('link', { name: 'Teklif al' })).toBeVisible();
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain('"@type":"WebPage"');
    expect(ld).not.toContain('Offer');

    await page.goto('/admin/pricing');
    const row = page.getByRole('row').filter({ hasText: name });
    await row.getByRole('button', { name: 'Sil' }).click();
    await expect(row).toHaveCount(0);
    await page.goto('/admin/pricing/materials');
    const item = page.locator('details').filter({ hasText: code });
    await item.locator('summary').click();
    await item.getByRole('button', { name: 'Sil' }).click();
    await expect(page.locator('summary').filter({ hasText: code })).toHaveCount(0);
  });
});
