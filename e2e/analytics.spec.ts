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

// Faz 23: onaysız paket 204 ve yazılmaz; onaylı ziyaret → beacon → admin genel bakışta oturum; cron 401; ayar sayfası.
test.describe('izleyici', () => {
  test('onaysız/bot paketi sessizce atılır; cron 401', async ({ request }) => {
    const res = await request.post('/api/analytics/collect', { data: { session: { id: '11111111-1111-4111-8111-111111111111', visitor: 'visitor-e2e-1', device: 'desktop' } } });
    expect(res.status()).toBe(204);
    expect((await request.get('/api/cron/analytics')).status()).toBe(401);
  });

  test.describe('panel', () => {
    test.skip(!hasAccount, 'E2E_ADMIN_* yok');
    test.beforeEach(() => {
      test.skip(test.info().project.name !== 'desktop', 'yalnız desktop');
    });

    test('onaylı ziyaret → oturum genel bakışta; ayarlar kaydedilir', async ({ page, context }) => {
      test.slow();
      // Playwright UA bot sayılır → e2e_track ile açıkça izin (yalnız test); onay çerezi de gerçek akışla verilir
      await page.goto('/tr?e2e_track=1');
      await page.getByRole('button', { name: 'Tümünü kabul et' }).click({ timeout: 5000 }).catch(() => undefined);
      await page.waitForLoadState('networkidle');
      const beacon = page.waitForResponse((r) => r.url().includes('/api/analytics/collect') && r.status() === 204, { timeout: 20_000 });
      await page.getByRole('link', { name: 'Hizmetler', exact: true }).first().click().catch(() => page.goto('/tr/hizmetler?e2e_track=1'));
      await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await beacon.catch(() => undefined);
      await context.clearCookies();

      await login(page, '/admin/analytics?days=7');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Analitik');
      await expect.poll(async () => {
        await page.goto('/admin/analytics?days=7');
        const text = await page.locator('dl').first().textContent();
        return /Oturum\s*[1-9]/.test(text ?? '') ? 1 : 0;
      }, { timeout: 30_000 }).toBe(1);

      await page.goto('/admin/settings/analytics');
      await page.getByLabel('GA4').fill('');
      await page.getByLabel('Örnekleme oranı (0,01–1)').fill('1');
      await page.getByRole('button', { name: 'Kaydet' }).click();
      await expect(page.getByRole('status')).toContainText('Kaydedildi');
    });
  });
});
