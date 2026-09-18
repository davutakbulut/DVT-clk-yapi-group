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

// Faz 8: proje listesi (kategori çipleri), kategori sayfası, detay; admin: oluştur → yayınla → sitede gör → sil.
test.describe('projeler', () => {
  test('/tr/projeler: h1, kategori çipleri (DB varsa), BreadcrumbList, axe temiz', async ({ page }) => {
    await page.goto('/tr/projeler');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Projelerimiz');
    expect(await page.locator('script[type="application/ld+json"]').first().textContent()).toContain('BreadcrumbList');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('kategori sayfası: başlık kategori adı, çip aria-current, EN karşılığı; bilinmeyen kategori 404', async ({ page }) => {
    await page.goto('/tr/projeler');
    const chip = page.locator('.chip').nth(1);
    test.skip((await chip.count()) === 0, 'Veritabanı yok (CI): kategori yok');
    const name = (await chip.textContent())!.trim();
    await chip.click();
    await expect(page).toHaveURL(/\/tr\/projeler\/kategori\/[a-z0-9-]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await expect(page.locator('.chip[aria-current="page"]')).toHaveText(name);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', /\/en\/projects\/category\//);
    const missing = await page.goto('/tr/projeler/kategori/yok-boyle-kategori');
    expect(missing?.status()).toBe(404);
  });
});

test.describe('proje yönetimi', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok');

  test('oluştur → yayınla → sitede detay (künye, JSON-LD Article, hizmet bağlantısı) → sil → 404', async ({ page }) => {
    test.slow(); // uzun akış: giriş + oluştur + 3 sayfa + sil; paralel çalışanlarla 30 sn yetmiyor
    await login(page, '/admin/projects/new');
    const name = `E2E Proje ${Date.now()}`;
    await page.getByLabel('Ad (Türkçe)').fill(name);
    await page.getByLabel('Konum (Türkçe)').fill('Gebze');
    await page.getByLabel('Alan (m²)').fill('2400');
    await page.getByLabel('Tamamlanma tarihi').fill('2026-06-01');
    const firstCategory = page.locator('input[name="categories"]').first();
    if (await firstCategory.count()) await firstCategory.check();
    const firstService = page.locator('input[name="services"]').first();
    if (await firstService.count()) await firstService.check();
    await page.getByLabel('Durum').selectOption('published');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.waitForURL(/\/admin\/projects\/[0-9a-f-]{36}$/);
    const slug = await page.getByLabel('Slug (TR)').inputValue();
    expect(slug).toMatch(/^e2e-proje-\d+$/);

    const detail = await page.goto(`/tr/projeler/${slug}`);
    expect(detail?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    // Suspense akışının gizli kapsayıcısı (body sonunda) kısa süre kopya taşıyabilir → ana içeriğe daraltılır
    await expect(page.locator('#main-content .facts')).toContainText('2.400 m²');
    await expect(page.locator('#main-content .facts')).toContainText('Gebze');
    expect(await page.locator('script[type="application/ld+json"]').first().textContent()).toContain('"@type":"Article"');
    if (await firstService.count()) await expect(page.locator('main a[href^="/tr/hizmetler/"]').first()).toBeVisible();
    const list = await page.goto('/tr/projeler');
    expect(list?.status()).toBe(200);
    await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();

    await page.goto('/admin/projects');
    const row = page.getByRole('row').filter({ hasText: name });
    await row.getByRole('button', { name: 'Sil' }).click();
    // Action bitmeden sayfa değiştirilmez (istek iptal olur): satırın kaybolması beklenir.
    await expect(row).toHaveCount(0);
    await expect.poll(async () => (await page.goto(`/tr/projeler/${slug}`))?.status(), { timeout: 15_000 }).toBe(404);
  });
});
