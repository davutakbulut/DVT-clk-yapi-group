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

// Faz 25: hata raporu API'si (bot süzgeci, 204), gruplama ve çözme ekranı, 404 → kırık linkler, CSP raporu, cron 401, vitals sayfası.
test.describe('hata takip', () => {
  test('API uçları: rapor 204, CSP 204, cron 401; CSP report-only başlığı', async ({ request }) => {
    expect((await request.post('/api/errors', { data: { message: 'x' } })).status()).toBe(204);
    expect((await request.post('/api/csp-report', { data: { 'csp-report': { 'violated-directive': 'script-src', 'blocked-uri': 'https://evil.example', 'document-uri': 'http://localhost/tr' } } })).status()).toBe(204);
    expect((await request.get('/api/cron/heartbeat')).status()).toBe(401);
    const home = await request.get('/tr');
    expect(home.headers()['content-security-policy-report-only']).toContain('report-uri /api/csp-report');
  });

  test.describe('panel', () => {
    test.skip(!hasAccount, 'E2E_ADMIN_* yok');
    test.beforeEach(() => {
      test.skip(test.info().project.name !== 'desktop', 'yalnız desktop');
    });

    test('rapor → gruplanmış liste → çöz → 404 kırık link → vitals', async ({ page, request }) => {
      test.slow();
      const stamp = Date.now();
      const message = `E2E hata ${stamp}`;
      for (let i = 0; i < 3; i += 1) {
        expect((await request.post('/api/errors', { headers: { 'x-e2e-track': '1' }, data: { source: 'client', module: 'e2e', message, stack: `Error: ${message}\n  at e2e.spec.ts:1`, path: '/tr', visitor: `v${i}` } })).status()).toBe(204);
      }
      await page.goto(`/tr/e2e-yok-sayfa-${stamp}?e2e_track=1`);
      await page.waitForLoadState('networkidle');

      await login(page, '/admin/errors?module=e2e');
      const item = page.locator('details').filter({ hasText: message });
      await expect(item).toBeVisible();
      await expect(item.locator('summary')).toContainText('×3');
      await expect(item.locator('summary')).toContainText('👤3');
      await item.locator('summary').click();
      await item.getByRole('button', { name: 'Çözüldü' }).click();
      await expect(page.locator('details').filter({ hasText: message })).toHaveCount(0);
      await page.goto('/admin/errors?module=e2e&resolved=resolved');
      await expect(page.locator('details').filter({ hasText: message })).toBeVisible();

      await page.goto('/admin/errors/links');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kırık Linkler');
      await expect(page.getByRole('cell', { name: `/tr/e2e-yok-sayfa-${stamp}` })).toBeVisible({ timeout: 15_000 });

      await page.goto('/admin/analytics/vitals');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Yavaş Sayfalar');
    });
  });
});
