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

// Faz 22: 9 rapor bölümü yüklenir, tarih süzgeci çalışır, CSV dışa aktarma text/csv döner; oturumsuz export 401.
test.describe('raporlar', () => {
  test('oturumsuz CSV export reddedilir', async ({ request }) => {
    // Middleware oturumsuz /admin isteğini giriş sayfasına taşır (302/307); veri sızmaz
    const res = await request.get('/admin/reports/export?report=revenue', { maxRedirects: 0 });
    expect([302, 307, 401]).toContain(res.status());
  });

  test.describe('panel', () => {
    test.skip(!hasAccount, 'E2E_ADMIN_* yok');
    test.beforeEach(() => {
      test.skip(test.info().project.name !== 'desktop', 'yalnız desktop');
    });

    test('9 bölüm + süzgeç + CSV', async ({ page }) => {
      test.slow();
      await login(page, '/admin/reports');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Raporlar');
      for (const name of ['Ciro özeti', 'Kârlılık', 'Hizmet bazlı', 'Müşteri bazlı', 'Fatura durumu', 'Alacak yaşlandırma', 'Tahsilat takvimi', 'Dönüşüm hunisi', 'Maliyet dağılımı']) {
        await expect(page.getByRole('heading', { name })).toBeVisible();
      }
      await page.getByLabel('Başlangıç').fill('2026-01-01');
      await page.getByLabel('Bitiş').fill('2026-12-31');
      await page.getByRole('button', { name: 'Uygula' }).click();
      await expect(page).toHaveURL(/from=2026-01-01/);
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'CSV indir' }).first().click()]);
      expect(download.suggestedFilename()).toMatch(/\.csv$/);
    });
  });
});
