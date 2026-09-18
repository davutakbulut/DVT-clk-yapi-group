import { expect, test } from '@playwright/test';

const EMAIL = process.env['E2E_ADMIN_EMAIL'];
const PASSWORD = process.env['E2E_ADMIN_PASSWORD'];
const hasAccount = Boolean(EMAIL && PASSWORD);

// Faz 30: RSS (dil başına), otomatik keşif, llms.txt genişletildi, IndexNow cron 401 / anahtar ucu, admin SEO sayfasında IndexNow bölümü.
test.describe('AI görünürlük · RSS · IndexNow', () => {
  test('feed.xml TR/EN 200 rss; bilinmeyen dil 404; blog sayfası RSS bağlantısı; llms.txt', async ({ request }) => {
    for (const loc of ['tr', 'en']) {
      const res = await request.get(`/${loc}/feed.xml`);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('application/rss+xml');
      const body = await res.text();
      expect(body).toContain('<rss version="2.0"');
      expect(body).toContain(`<language>${loc}</language>`);
    }
    expect((await request.get('/xx/feed.xml')).status()).toBe(404);
    const blog = await request.get('/tr/blog');
    expect(await blog.text()).toContain('type="application/rss+xml"');
    const llms = await request.get('/llms.txt');
    expect(llms.status()).toBe(200);
    expect(await llms.text()).toContain('/tr/feed.xml');
  });

  test('IndexNow: cron sırsız 401; anahtar ucu 404 (yapılandırılmamış) ya da düz metin', async ({ request }) => {
    expect((await request.get('/api/cron/indexnow')).status()).toBe(401);
    const key = await request.get('/api/indexnow-key');
    expect([200, 404]).toContain(key.status());
    if (key.status() === 200) expect(key.headers()['content-type']).toContain('text/plain');
  });

  test.describe('panel', () => {
    test.skip(!hasAccount, 'E2E_ADMIN_* yok');
    test.beforeEach(() => {
      test.skip(test.info().project.name !== 'desktop', 'yalnız desktop');
    });
    test('SEO ayarlarında IndexNow bölümü', async ({ page }) => {
      await page.goto('/tr/giris?next=%2Fadmin%2Fsettings%2Fseo');
      await page.getByLabel('E-posta').fill(EMAIL!);
      await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD!);
      await page.getByRole('button', { name: 'Giriş yap' }).click();
      await page.waitForURL(/\/admin\/settings\/seo/);
      await expect(page.getByRole('heading', { name: 'IndexNow' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'IndexNow' }).getByText(/tanımlı/)).toBeVisible();
    });
  });
});
