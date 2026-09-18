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

// Faz 18: yönlendirme (middleware, isabet), arayüz etiketi override → sitede, kill switch (kapalı modül 404 + menüde yok), bildirim zili, denetim kaydı.
test.describe('sistem yönetimi', () => {
  test('/api/redirects JSON; cron purge 401; /api/admin/notifications oturumsuz 401', async ({ request }) => {
    const list = await request.get('/api/redirects');
    expect(list.status()).toBe(200);
    expect(Array.isArray((await list.json()).rules)).toBe(true);
    expect((await request.get('/api/cron/purge')).status()).toBe(401);
    expect((await request.get('/api/admin/notifications')).status()).toBe(401);
  });

  test.describe('panel', () => {
    test.skip(!hasAccount, 'E2E_ADMIN_* yok');
    // Kill switch ve etiket override tüm siteyi etkiler → projeler arası yarış olmasın diye yalnız desktop
    test.beforeEach(() => {
      test.skip(test.info().project.name !== 'desktop', 'yalnız desktop');
    });

    test('yönlendirme oluştur → 308 → isabet → sil', async ({ page, request }) => {
      test.slow();
      const stamp = Date.now();
      const source = `/e2e-yol-${stamp}`;
      await login(page, '/admin/redirects');
      const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Ekle' }) }).first();
      await form.getByLabel('Kaynak yol').fill(source);
      await form.getByLabel('Hedef (yol ya da https URL)').fill('/tr/hizmetler');
      await form.getByRole('button', { name: 'Ekle' }).click();
      await expect(page.locator('summary').filter({ hasText: source })).toBeVisible();
      // Middleware listeyi 60 sn önbellekler; admin kaydı etiketi düşürür → yeni instance ilk istekte alır. Poll.
      await expect
        .poll(async () => (await request.get(source, { maxRedirects: 0 })).status(), { timeout: 90_000, intervals: [2000, 5000, 10000] })
        .toBe(308);
      const res = await request.get(source, { maxRedirects: 0 });
      expect(res.headers()['location']).toContain('/tr/hizmetler');
      await expect
        .poll(
          async () => {
            await page.goto('/admin/redirects');
            return page.locator('summary').filter({ hasText: source }).textContent();
          },
          { timeout: 20_000 },
        )
        .toMatch(/[1-9]\d* isabet/);
      const item = page.locator('details').filter({ hasText: source });
      await item.locator('summary').click();
      await item.getByRole('button', { name: 'Sil' }).click();
      await expect(page.locator('summary').filter({ hasText: source })).toHaveCount(0);
    });

    test('arayüz etiketi override → sitede görünür → varsayılana dön', async ({ page }) => {
      test.slow();
      const stamp = Date.now();
      await login(page, '/admin/translations');
      await page.getByLabel('Ara (anahtar ya da metin)').fill('Footer.copyright');
      const row = page.locator('li').filter({ has: page.locator('code', { hasText: 'Footer.copyright' }) }).first();
      const trForm = row.locator('form').filter({ has: page.locator('input[name="locale"][value="tr"]') });
      await trForm.getByRole('textbox').fill(`E2E Telif ${stamp} © {year} {siteName}`);
      await trForm.getByRole('button', { name: 'Kaydet' }).click();
      await expect(trForm.getByText('Değiştirildi')).toBeVisible();
      await expect
        .poll(
          async () => {
            await page.goto('/tr');
            return page.locator('footer').getByText(`E2E Telif ${stamp}`).count();
          },
          { timeout: 30_000 },
        )
        .toBe(1);
      await page.goto('/admin/translations');
      await page.getByLabel('Ara (anahtar ya da metin)').fill('Footer.copyright');
      const row2 = page.locator('li').filter({ has: page.locator('code', { hasText: 'Footer.copyright' }) }).first();
      await row2.getByRole('button', { name: 'Varsayılana dön' }).first().click();
      await expect(row2.getByText('Değiştirildi')).toHaveCount(0);
    });

    test('kill switch: blog kapalı → 404 + menüde yok → açık; bildirim zili; denetim kaydı', async ({ page }) => {
      test.slow();
      await login(page, '/admin/settings/modules');
      await page.getByLabel('Blog').uncheck();
      await page.getByRole('button', { name: 'Kaydet' }).click();
      await expect(page.getByRole('status')).toContainText('Kaydedildi');
      await expect.poll(async () => (await page.goto('/tr/blog'))?.status(), { timeout: 20_000 }).toBe(404);
      await page.goto('/tr');
      await expect(page.locator('header').getByRole('link', { name: 'Blog' })).toHaveCount(0);
      await page.goto('/admin/settings/modules');
      await page.getByLabel('Blog').check();
      await page.getByRole('button', { name: 'Kaydet' }).click();
      await expect(page.getByRole('status')).toContainText('Kaydedildi');
      await expect.poll(async () => (await page.goto('/tr/blog'))?.status(), { timeout: 20_000 }).toBe(200);

      await page.goto('/admin');
      const bell = page.getByRole('button', { name: /Bildirimler/ });
      await bell.click();
      await expect(page.getByRole('dialog', { name: 'Bildirimler' })).toBeVisible();
      await page.goto('/admin/audit');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Denetim Kaydı');
      await expect(page.getByRole('table')).toBeVisible();
    });
  });
});
