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

// Sahadan Videolar (K-76): panelden YouTube bağlantısıyla eklenen video ana sayfada görünür, tıklanınca çerezsiz gömülür; silinince kalkar.
test.describe('sahadan videolar', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok');

  test('admin YouTube videosu ekler → ana sayfada kart + axe temiz + tıklayınca youtube-nocookie iframe → siler', async ({ page }, testInfo) => {
    test.slow();
    // Projeler paralel koşar: aynı milisaniyede başlayan iki işçi aynı başlığı üretmesin
    const title = `E2E Saha ${testInfo.project.name} ${Date.now()}`;
    await login(page, '/admin/field-videos');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Sahadan Videolar');
    const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Ekle' }) }).first();

    // Geçersiz bağlantı reddedilir
    await form.getByLabel('Başlık (TR)').fill(title);
    await form.getByLabel('YouTube bağlantısı', { exact: true }).last().fill('https://example.com/video');
    await form.getByRole('button', { name: 'Ekle' }).click();
    await expect(form.getByRole('alert').first()).toBeVisible();

    await form.getByLabel('Başlık (TR)').fill(title);
    await form.getByLabel('Kısa açıklama / alıntı (TR)').fill('E2E test kaydı');
    await form.getByLabel('YouTube bağlantısı', { exact: true }).last().fill('https://www.youtube.com/shorts/jNQXAC9IVRw');
    await form.getByRole('button', { name: 'Ekle' }).click();
    const item = page.locator('details').filter({ hasText: title });
    await expect(item).toBeVisible({ timeout: 20_000 });

    try {
      await expect
        .poll(
          async () => {
            await page.goto('/tr');
            return page.locator('.fv-section').getByText(title).count();
          },
          { timeout: 30_000 },
        )
        .toBe(1);
      await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
      await expect(page.getByRole('heading', { name: 'Sahadan videolar' })).toBeVisible();
      const axe = await new AxeBuilder({ page }).include('.fv-section').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(axe.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
      // Yatay taşma yok
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      // Tıklanmadan üçüncü taraf iframe yok; tıklayınca çerezsiz alan adı
      await expect(page.locator('.fv-section iframe')).toHaveCount(0);
      await page.getByRole('button', { name: `${title} videosunu oynat` }).click();
      await expect(page.locator('.fv-section iframe')).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/jNQXAC9IVRw/);
    } finally {
      await page.goto('/admin/field-videos');
      const row = page.locator('details').filter({ hasText: title });
      await row.locator('summary').click();
      await row.getByRole('button', { name: 'Sil' }).click();
      await expect(page.locator('details').filter({ hasText: title })).toHaveCount(0, { timeout: 20_000 });
    }
  });
});

// Ana sayfa bölümleri (K-77): veri varsa video şeridi çalışır; yorum yoksa davet kartı, varsa carousel — ikisi de erişilebilir, taşma yok.
test.describe('ana sayfa: sahadan videolar + yorumlar', () => {
  test('video kartı tıklanınca oynatıcı açılır; yorumlar bölümü carousel ya da davet kartı; axe temiz', async ({ page }) => {
    await page.goto('/tr');
    await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
    const videos = page.locator('.fv-section');
    if ((await videos.count()) > 0) {
      await videos.scrollIntoViewIfNeeded();
      await expect(videos.locator('iframe, video.fv-media')).toHaveCount(0);
      await videos.locator('.fv-item[data-active] .fv-poster, .fv-poster').first().click();
      await expect(videos.locator('iframe, video.fv-media')).toHaveCount(1);
    }
    const reviews = page.locator('.testimonials-section');
    await expect(reviews).toHaveCount(1);
    await expect(reviews.locator('.testimonials-track, .testimonials-invite')).toHaveCount(1);
    if ((await reviews.locator('.testimonials-invite').count()) > 0) {
      await expect(reviews.getByRole('link', { name: 'Yorum yaz' })).toHaveAttribute('href', '/tr/yorumlar');
    }
    const axe = await new AxeBuilder({ page }).include('.testimonials-section').include('.fv-section').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
});
