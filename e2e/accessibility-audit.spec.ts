import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const EMAIL = process.env['E2E_ADMIN_EMAIL'];
const PASSWORD = process.env['E2E_ADMIN_PASSWORD'];
const hasAccount = Boolean(EMAIL && PASSWORD);

// Faz 31 · erişilebilirlik denetimi: Faz 5–30'da eklenen tüm ana ön yüz sayfaları + panel ekranları WCAG 2.1 AA (axe) ihlalsiz.
const PUBLIC_PAGES = ['/tr/hizmetler', '/tr/cozumler', '/tr/fiyat-rehberi', '/tr/yorumlar', '/tr/urunler', '/tr/projeler', '/tr/blog', '/tr/hakkimizda', '/tr/ekibimiz', '/tr/referanslarimiz', '/tr/belgelerimiz', '/tr/kariyer', '/tr/sss', '/tr/iletisim', '/tr/teklif-al', '/tr/teklif-sepeti', '/tr/giris', '/tr/kayit', '/tr/konfigurator', '/tr/konfigurator/hol?w=20&l=40&e=6&r=8&b=6', '/tr/konfigurator/cok-katli?w=20&l=30&h=3.2&n=5', '/en/services', '/en/configurator'];
const ADMIN_PAGES = ['/admin', '/admin/leads', '/admin/customers', '/admin/sales', '/admin/invoices', '/admin/reports', '/admin/analytics', '/admin/analytics/funnels', '/admin/errors', '/admin/configurator', '/admin/configurator/rules', '/admin/configurator/profiles', '/admin/translations', '/admin/redirects', '/admin/settings/modules', '/admin/settings/seo', '/admin/audit'];

async function axe(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return results.violations.map((v) => `${v.id}: ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
}

test.describe('axe · ön yüz', () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name === 'tablet', 'mobil + desktop yeter');
  });
  for (const path of PUBLIC_PAGES) {
    test(`axe: ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(await axe(page)).toEqual([]);
    });
  }
});

test.describe('axe · panel', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok');
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop', 'yalnız desktop');
  });
  test('panel ekranları ihlalsiz', async ({ page }) => {
    test.slow();
    await page.goto('/tr/giris?next=%2Fadmin');
    await page.getByLabel('E-posta').fill(EMAIL!);
    await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD!);
    await page.getByRole('button', { name: 'Giriş yap' }).click();
    await page.waitForURL(/\/admin$/);
    const report: Record<string, string[]> = {};
    for (const path of ADMIN_PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const v = await axe(page);
      if (v.length > 0) report[path] = v;
    }
    expect(report).toEqual({});
  });
});

test.describe('klavye · konfigüratör', () => {
  test('kayar çubuklar ve anahtarlar Tab ile ulaşılır, ok tuşu değeri değiştirir', async ({ page }) => {
    await page.goto('/tr/konfigurator?w=20&l=40&e=6&r=8&b=6');
    const width = page.getByRole('slider', { name: 'En (açıklık)' });
    await width.focus();
    await expect(width).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(width).toHaveValue('21');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('slider', { name: 'Boy' })).toBeFocused();
  });
});
