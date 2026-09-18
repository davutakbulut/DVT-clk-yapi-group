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

// Faz 6: hero + hakkımızda. Veritabanı yoksa (CI) hero metin yedeğiyle yine tek h1 verir; hakkımızda sessizce yoktur.
test.describe('ana sayfa', () => {
  test('hero: tek h1, header sabit ve kaydırınca koyulaşır, axe temiz', async ({ page }) => {
    await page.goto('/tr');
    const hero = page.locator('section.hero');
    await expect(hero).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
    const header = page.getByRole('banner');
    expect(await header.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
    await expect(page.locator('html')).not.toHaveAttribute('data-header-solid', '');
    await page.mouse.wheel(0, 600);
    await expect(page.locator('html')).toHaveAttribute('data-header-solid', '');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('hakkımızda: veritabanı varsa başlık, gövde ve sayfa içi çapa', async ({ page }) => {
    await page.goto('/tr');
    const about = page.locator('#hakkimizda');
    test.skip((await about.count()) === 0, 'Veritabanı yok (CI): bölüm sessizce render edilmez');
    await expect(about.getByRole('heading', { level: 2 })).not.toBeEmpty();
    await expect(about.locator('.prose-site p').first()).toBeVisible();
  });

  test('İngilizce sayfa: EN yayında (0042) → hakkımızda İngilizce görünür, Türkçe sızmaz', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    const about = page.locator('#hakkimizda');
    test.skip((await about.count()) === 0, 'Veritabanı yok (CI)');
    await expect(about.getByRole('heading', { level: 2 })).toContainText(/steel/i);
  });
});

test.describe('ana sayfa yönetimi', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok');

  test('/admin/pages/home: hero ve hakkımızda formları, kaydet çalışır', async ({ page }) => {
    await login(page, '/admin/pages/home');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ana Sayfa');
    await expect(page.getByRole('heading', { level: 2, name: 'Hero' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Hakkımızda' })).toBeVisible();
    const aboutForm = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Hakkımızda' }) });
    await aboutForm.getByRole('button', { name: 'Kaydet' }).click();
    await expect(aboutForm.getByRole('status')).toHaveText('Kaydedildi');
  });
});
