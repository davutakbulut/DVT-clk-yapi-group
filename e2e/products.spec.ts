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

// Faz 13: ürün listesi; admin: ürün oluştur (varyant + özellik) → yayınla → sitede Product JSON-LD (Offer YOK), ölçü tablosu → sil.
test.describe('ürünler', () => {
  test('/tr/urunler: h1, BreadcrumbList, axe temiz; bilinmeyen ürün 404', async ({ page }) => {
    await page.goto('/tr/urunler');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ürünler');
    expect((await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ')).toContain('BreadcrumbList');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect((await page.goto('/tr/urunler/yok-boyle-urun'))?.status()).toBe(404);
  });
});

test.describe('ürün yönetimi', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok');

  test('oluştur → yayınla → sitede ölçü tablosu + Product JSON-LD (Offer yok) → sil', async ({ page }) => {
    test.slow();
    await login(page, '/admin/products/new');
    const stamp = Date.now();
    const name = `E2E Ürün ${stamp}`;
    await page.getByLabel('Ürün adı (Türkçe)').fill(name);
    await page.getByLabel('Teknik özellikler (Türkçe)').fill('Malzeme | Kalite | S235JR |');
    await page.getByLabel('Ölçü tablosu (varyantlar)').fill(`40×40 mm | 40 | 40 | 2 | 6000 | 2,31 | E2E-40-${stamp}\n50×50 mm | 50 | 50 | 2 | 6000 | 2,93 | E2E-50-${stamp}`);
    await page.getByLabel('Durum').selectOption('published');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.waitForURL(/\/admin\/products\/[0-9a-f-]{36}$/);
    const slug = await page.getByLabel('Slug (TR)').inputValue();
    expect(slug).toMatch(/^e2e-urun-\d+$/);

    const res = await page.goto(`/tr/urunler/${slug}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    // K-88: ölçü tablosu seçicide (stok kodu + H × B); toplam ağırlık hesaplanır (2,31 kg/m × 6 m × 10)
    await expect(page.getByRole('table').filter({ hasText: `E2E-40-${stamp}` })).toBeVisible();
    await expect(page.getByTestId('pcfg-total').first()).toHaveText(/139 kg/);
    await expect(page.locator('#main-content').getByText('S235JR')).toBeVisible();
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain('"@type":"Product"');
    expect(ld).not.toContain('Offer');

    await page.goto('/admin/products');
    const row = page.getByRole('row').filter({ hasText: name });
    await row.getByRole('button', { name: 'Sil' }).click();
    await expect(row).toHaveCount(0);
  });
});
