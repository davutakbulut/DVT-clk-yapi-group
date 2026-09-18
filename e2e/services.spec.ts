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

// Faz 7: hizmet listesi + detay (JSON-LD, hreflang, dil değiştirici, 404, K-08) + admin CRUD.
test.describe('hizmetler', () => {
  test('/tr/hizmetler: h1, kartlar (DB varsa), BreadcrumbList, axe temiz', async ({ page }) => {
    await page.goto('/tr/hizmetler');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hizmetlerimiz');
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(ld).toContain('BreadcrumbList');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('detay: başlık, süreç adımları, Service JSON-LD, yalnız TR hreflang; EN URL 404 (K-08); bilinmeyen slug 404', async ({ page }) => {
    const list = await page.goto('/tr/hizmetler');
    expect(list?.status()).toBe(200);
    const first = page.locator('.card-link').first();
    test.skip((await first.count()) === 0, 'Veritabanı yok (CI): hizmet kartı yok');
    const href = await first.getAttribute('href');
    await first.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
    await expect(page.getByRole('heading', { level: 2, name: 'Nasıl ilerliyoruz' })).toBeVisible();
    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(ld).toContain('"@type":"Service"');
    expect(ld).toContain('"inLanguage":"tr"');
    await expect(page.locator('link[rel="alternate"][hreflang="tr"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(0);
    // Dil değiştirici: EN karşılığı yok → RouteAlternates fallback ile EN hizmet listesine gider (404'e değil)
    await expect(page.getByRole('group', { name: 'Dil seçimi' }).getByRole('link', { name: 'English' })).toHaveAttribute('href', '/en/services');
    const slug = href!.split('/').pop()!;
    const en = await page.goto(`/en/services/${slug}`);
    expect(en?.status()).toBe(404);
    const missing = await page.goto('/tr/hizmetler/boyle-bir-hizmet-yok');
    expect(missing?.status()).toBe(404);
    await expect(page.getByText('Hata 404')).toBeVisible();
  });

  test('ana sayfa ve footer hizmetlere bağlanır (öksüz sayfa yok)', async ({ page }) => {
    await page.goto('/tr');
    const links = page.locator('main a[href="/tr/hizmetler"]');
    test.skip((await links.count()) === 0, 'Veritabanı yok (CI): menü ve hizmet bölümü yok');
    await expect(links.first()).toBeVisible();
    await expect(page.getByRole('contentinfo').locator('a[href^="/tr/hizmetler/"]').first()).toBeVisible();
  });
});

test.describe('hizmet yönetimi', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok');

  test('liste → yeni hizmet oluştur (taslak) → düzenle → sil', async ({ page }) => {
    test.slow(); // uzun akış: giriş + oluştur + 3 sayfa + sil; paralel çalışanlarla 30 sn yetmiyor
    await login(page, '/admin/services');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hizmetler');
    await page.getByRole('link', { name: 'Yeni hizmet' }).click();
    await expect(page).toHaveURL(/\/admin\/services\/new$/);
    const name = `E2E Hizmet ${Date.now()}`;
    await page.getByLabel('Hizmet adı (Türkçe)').fill(name);
    await page.getByLabel('Süreç adımları (Türkçe)').fill('Keşif | Parsel incelenir\nMontaj | Kuru montaj');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.waitForURL(/\/admin\/services\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await expect(page.getByLabel('Slug (TR)')).toHaveValue(/^e2e-hizmet-\d+$/);
    await page.getByLabel('Hizmet adı (Türkçe)').fill(`${name} v2`);
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page.getByRole('status')).toHaveText('Kaydedildi');
    await page.goto('/admin/services');
    const row = page.getByRole('row').filter({ hasText: `${name} v2` });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Sil' }).click();
    await page.waitForURL(/\/admin\/services$/);
    await expect(page.getByRole('row').filter({ hasText: `${name} v2` })).toHaveCount(0);
  });
});
