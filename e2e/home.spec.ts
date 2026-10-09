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

// K-111: yeni ana sayfa — hero (iki yol kartı) → ürün grubu şeridi → 01 malzeme → 02 uygulama → 03 neden çelik → 04 konfigüratör →
// 05 projeler (+ CTA kartı) → … → iletişim bandı. Veritabanı yoksa (CI) hero metin yedeğiyle yine tek h1 verir; veri bölümleri sessizce yoktur.
test.describe('ana sayfa', () => {
  test('hero: tek h1, iki yol kartı sayfa içi çapalara gider, header sabit ve kaydırınca koyulaşır, axe temiz', async ({ page }) => {
    await page.goto('/tr');
    const hero = page.locator('section.hero');
    await expect(hero).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).not.toBeEmpty();
    const paths = page.locator('.home-path');
    if ((await paths.count()) > 0) {
      await expect(paths).toHaveCount(2);
      await expect(paths.nth(0)).toHaveAttribute('href', '#malzeme');
      await expect(paths.nth(1)).toHaveAttribute('href', '#uygulama');
    }
    const header = page.getByRole('banner');
    expect(await header.evaluate((el) => getComputedStyle(el).position)).toBe('fixed');
    await expect(page.locator('html')).not.toHaveAttribute('data-header-solid', '');
    await page.mouse.wheel(0, 600);
    await expect(page.locator('html')).toHaveAttribute('data-header-solid', '');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('bölümler: ürün şeridi + kategori kartları, öne çıkan hizmet + 3 grup, neden çelik + süreç, 6 konfigüratör, proje CTA, iletişim bandı', async ({ page }) => {
    await page.goto('/tr');
    const materials = page.locator('#malzeme');
    test.skip((await materials.count()) === 0, 'Veritabanı yok (CI): bölümler sessizce render edilmez');
    await expect(page.locator('.home-catbar-chip').first()).toHaveAttribute('href', /\/tr\/urunler\/kategori\//);
    await expect(materials.getByRole('heading', { level: 2 })).toContainText('malzeme');
    expect(await materials.locator('.home-cat').count()).toBeGreaterThanOrEqual(2); // ≥1 kategori + teklif kartı
    await expect(materials.locator('.home-cat-cta')).toHaveAttribute('href', '/tr/teklif-al');
    await expect(materials.locator('.home-why li')).toHaveCount(3);
    const app = page.locator('#uygulama');
    await expect(app.locator('.home-feature')).toHaveAttribute('href', /\/tr\/hizmetler\//);
    await expect(app.locator('.home-svc')).toHaveCount(3);
    await expect(app.locator('.home-svc').nth(1).getByRole('link', { name: /3D konfigüratör/ })).toHaveAttribute('href', '/tr/konfigurator');
    await expect(page.locator('.home-benefits li')).toHaveCount(4);
    await expect(page.locator('.home-steps li')).toHaveCount(4);
    const cfg = page.locator('.home-cfg-item');
    await expect(cfg).toHaveCount(6);
    await expect(cfg.nth(4)).toHaveAttribute('href', '/tr/konfigurator/cit-korkuluk');
    await expect(page.locator('.proj-cta')).toHaveAttribute('href', '/tr/teklif-al');
    const contact = page.locator('#iletisim');
    await expect(contact.getByRole('heading', { level: 2 })).not.toBeEmpty();
    await expect(contact.getByRole('link', { name: 'Teklif al' })).toHaveAttribute('href', '/tr/teklif-al');
    await expect(contact.locator('.home-ccard').first()).toHaveAttribute('href', /^tel:/);
    await expect(page.locator('#hakkimizda')).toHaveCount(0); // hakkımızda artık yalnız /hakkimizda sayfasında
  });

  test('İngilizce sayfa: tek h1, bölüm başlıkları İngilizce, Türkçe sızmaz', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    const materials = page.locator('#malzeme');
    test.skip((await materials.count()) === 0, 'Veritabanı yok (CI)');
    await expect(materials.getByRole('heading', { level: 2 })).toContainText(/materials/i);
    await expect(page.locator('.home-cfg-item').first()).toHaveAttribute('href', '/en/configurator/hall');
    await expect(page.locator('#iletisim').getByRole('link', { name: 'Get a quote' })).toHaveAttribute('href', '/en/get-quote');
  });
});

test.describe('ana sayfa yönetimi', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok');
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop', 'yalnız desktop: üç proje aynı ayarı paralel değiştiriyordu (yarış)');
  });

  test('/admin/pages/home: hero, bölüm metinleri ve hakkımızda formları; bölüm metni kaydet → sitede görünür', async ({ page }) => {
    await login(page, '/admin/pages/home');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ana Sayfa');
    await expect(page.getByRole('heading', { level: 2, name: 'Hero', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: '01 · Malzeme satışı' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Hakkımızda' })).toBeVisible();
    // K-111: bölüm metni formu — konfigüratör düğme metnini değiştir, sitede gör, geri al
    const copyForm = page.locator('form').filter({ has: page.getByRole('heading', { name: '04 · 3D konfigüratör' }) });
    const button = copyForm.locator('#f-cButtonTr');
    const saved = await button.inputValue();
    const original = saved.startsWith('E2E') ? 'Konfigüratörü aç' : saved; // yarım kalmış koşudan artık kalmasın
    await button.fill('E2E konfigüratörü aç');
    await copyForm.getByRole('button', { name: 'Kaydet' }).click();
    await expect(copyForm.getByRole('status')).toHaveText('Kaydedildi');
    await page.goto('/tr');
    await expect(page.getByRole('link', { name: 'E2E konfigüratörü aç' })).toHaveAttribute('href', '/tr/konfigurator');
    await page.goto('/admin/pages/home');
    await copyForm.locator('#f-cButtonTr').fill(original);
    await copyForm.getByRole('button', { name: 'Kaydet' }).click();
    await expect(copyForm.getByRole('status')).toHaveText('Kaydedildi');
    const aboutForm = page.locator('form').filter({ has: page.getByRole('heading', { name: 'Hakkımızda' }) });
    await aboutForm.getByRole('button', { name: 'Kaydet' }).click();
    await expect(aboutForm.getByRole('status')).toHaveText('Kaydedildi');
  });
});
