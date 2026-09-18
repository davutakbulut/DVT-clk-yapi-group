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

// Faz 17: /yorumlar (axe, form); ziyaretçi yorumu → bekleyen → admin onaylar → sitede ve ana sayfa carousel'inde; hizmete bağlı → Review JSON-LD.
test.describe('müşteri yorumları', () => {
  test('/tr/yorumlar: h1, form, axe temiz; cron 401', async ({ page, request }) => {
    await page.goto('/tr/yorumlar');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Müşteri Yorumları');
    await expect(page.getByLabel('Yorumunuz')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect((await request.get('/api/cron/reviews')).status()).toBe(401);
  });

  test.describe('akış', () => {
    test.skip(!hasAccount, 'E2E_ADMIN_* yok');

    test('ziyaretçi yorumu → admin onaylar → sitede + ana sayfada; hizmete bağlı elle yorum → Review JSON-LD → sil', async ({ page, browser }) => {
      test.slow();
      const stamp = Date.now();
      const visitorName = `E2E Ziyaretçi ${stamp}`;
      const visitor = await browser.newContext();
      const vp = await visitor.newPage();
      await vp.goto('/tr/yorumlar');
      await vp.waitForLoadState('networkidle');
      // Mobilde çerez bandı gönder düğmesinin üstüne binebilir → önce kapat
      await vp.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
      await vp.getByLabel('Ad Soyad').fill(visitorName);
      await vp.getByLabel('Firma (isteğe bağlı)').fill('E2E A.Ş.');
      await vp.getByLabel('4 ★').check();
      await vp.getByLabel('Yorumunuz').fill(`Montaj ekibi planlanan tarihte geldi ve işi temiz bıraktı. ${stamp}`);
      await vp.getByLabel(/KVKK/).check();
      await vp.getByRole('button', { name: 'Yorumu gönder' }).click();
      await expect(vp.locator('#main-content').getByRole('status')).toContainText('Teşekkürler', { timeout: 20_000 });
      await visitor.close();

      await login(page, '/admin/testimonials?status=pending');
      const item = page.locator('details').filter({ hasText: visitorName });
      await expect(item).toBeVisible();
      await item.locator('summary').click();
      await item.getByRole('button', { name: 'Onayla' }).click();
      await expect(page.locator('details').filter({ hasText: visitorName })).toHaveCount(0);

      await expect
        .poll(
          async () => {
            await page.goto('/tr/yorumlar');
            return page.locator('#main-content').getByText(visitorName).count();
          },
          { timeout: 20_000 },
        )
        .toBe(1);
      await page.goto('/tr');
      await expect(page.getByRole('heading', { name: 'Müşterilerimizin Değerlendirmeleri' })).toBeVisible();
      // Yorum VARKEN bölüm erişilebilir olmalı (soluk yan kartlar inert; kaydırılan şerit odaklanabilir)
      const axe = await new AxeBuilder({ page }).include('.testimonials-section').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
      expect((await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ')).not.toContain('AggregateRating');

      // Hizmete bağlı elle yorum → hizmet sayfasında bölüm + Review/AggregateRating JSON-LD
      const manualName = `E2E Müşteri ${stamp}`;
      await page.goto('/admin/testimonials?status=published');
      const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Ekle' }) }).first();
      await form.getByLabel('Ad Soyad').fill(manualName);
      await form.getByLabel('Yorum (Türkçe)').fill('Kentsel dönüşüm projemizde süre planına sadık kaldılar.');
      await form.getByLabel('Hizmet').selectOption({ label: 'Kentsel Dönüşüm Çelik Karkas' });
      await form.getByRole('button', { name: 'Ekle' }).click();
      await expect(page.locator('details').filter({ hasText: manualName })).toBeVisible();
      await expect
        .poll(
          async () => {
            await page.goto('/tr/hizmetler/kentsel-donusum-celik-karkas');
            return page.locator('#main-content').getByText(manualName).count();
          },
          { timeout: 20_000 },
        )
        .toBe(1);
      const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
      expect(ld).toContain('"@type":"AggregateRating"');
      expect(ld).toContain(manualName);

      await page.goto('/admin/testimonials?status=all');
      for (const name of [visitorName, manualName]) {
        const row = page.locator('details').filter({ hasText: name });
        await row.locator('summary').click();
        await row.getByRole('button', { name: 'Sil' }).click();
        await expect(page.locator('details').filter({ hasText: name })).toHaveCount(0);
      }
    });
  });
});
