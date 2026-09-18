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

// Faz 15 (K-26): çözüm listesi; admin: 8 bölümlü çözüm oluştur → yayınla → sitede karşılaştırma tablosu + avantajlar + CTA → sil.
test.describe('çözüm sayfaları', () => {
  test('/tr/cozumler: h1, BreadcrumbList, axe temiz; bilinmeyen çözüm 404', async ({ page }) => {
    await page.goto('/tr/cozumler');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Çözümler');
    expect((await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ')).toContain('BreadcrumbList');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect((await page.goto('/tr/cozumler/yok-boyle-cozum'))?.status()).toBe(404);
  });
});

test.describe('çözüm yönetimi', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok');

  test('oluştur → yayınla → sitede karşılaştırma + avantajlar + CTA → sil', async ({ page }) => {
    test.slow();
    await login(page, '/admin/solutions/new');
    const name = `E2E Çözüm ${Date.now()}`;
    await page.getByLabel('Başlık (Türkçe)').fill(name);
    await page.getByLabel('Özet (hero altı ve kartta) (Türkçe)').fill('E2E özet metni.');
    await page.getByLabel('Alternatif sütun başlığı (ör. Betonarme) (Türkçe)').fill('Betonarme');
    await page.getByLabel('Karşılaştırma satırları (Türkçe)').fill('Saha süresi | Atölye imalatı, kuru montaj | Kalıp ve kür beklemesi');
    await page.getByLabel('Avantajlar (Türkçe)').fill('Öngörülebilir takvim | İmalat tarihleri proje onayıyla belirlenir');
    await page.getByLabel('CTA başlığı (boşsa bant görünmez) (Türkçe)').fill('E2E teklif isteyin');
    await page.getByLabel('Durum').selectOption('published');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.waitForURL(/\/admin\/solutions\/[0-9a-f-]{36}$/);
    const slug = await page.getByLabel('Slug (TR)').inputValue();
    expect(slug).toMatch(/^e2e-cozum-\d+$/);

    const res = await page.goto(`/tr/cozumler/${slug}`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    const table = page.getByRole('table').filter({ hasText: 'Saha süresi' });
    await expect(table).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Betonarme' })).toBeVisible();
    await expect(page.locator('#main-content').getByRole('heading', { name: 'Öngörülebilir takvim' })).toBeVisible();
    await expect(page.locator('#main-content').getByRole('heading', { name: 'E2E teklif isteyin' })).toBeVisible();
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain('"@type":"WebPage"');
    await page.goto('/tr/cozumler');
    await expect(page.locator('#main-content').getByRole('link', { name: new RegExp(name) })).toBeVisible();

    await page.goto('/admin/solutions');
    const row = page.getByRole('row').filter({ hasText: name });
    await row.getByRole('button', { name: 'Sil' }).click();
    await expect(row).toHaveCount(0);
    await expect.poll(async () => (await page.goto(`/tr/cozumler/${slug}`))?.status(), { timeout: 15_000 }).toBe(404);
  });
});
