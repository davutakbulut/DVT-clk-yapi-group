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

// Faz 9: blog listesi/kategori, admin canlı SEO paneli, yazı oluştur → sitede (TOC, BlogPosting, yorum formu) → yorum → moderasyon → sil.
test.describe('blog', () => {
  test('/tr/blog: h1, kategori çipleri (DB varsa), axe temiz; bilinmeyen yazı 404', async ({ page }) => {
    await page.goto('/tr/blog');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Blog');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    const missing = await page.goto('/tr/blog/yok-boyle-yazi');
    expect(missing?.status()).toBe(404);
  });
});

test.describe('blog yönetimi', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok');

  test('canlı SEO paneli, oluştur → yayınla → sitede detay → ziyaretçi yorumu → onayla → görünür → sil', async ({ page, browser }) => {
    test.slow();
    await login(page, '/admin/blog/new');
    const panel = page.getByRole('complementary', { name: 'Canlı SEO paneli' });
    await expect(panel).toContainText('Genel skor');
    const name = `E2E Yazı ${Date.now()}`;
    const commentText = `Çok faydalı bir yazı. (${name})`; // paralel çalışanlar aynı metni yazmasın
    await page.getByLabel('Ad (Türkçe)').fill(name);
    await page.getByLabel('Odak anahtar kelime (Türkçe)').fill('e2e yazı');
    await page.getByLabel('Metin (Markdown) (Türkçe)').fill(`E2E yazı giriş paragrafı burada. ${'Kısa cümle. '.repeat(40)}\n\n# Birinci bölüm\n\nMetin [hizmetler](/hizmetler) ve [projeler](/projeler).\n\n## Alt bölüm\n\nMetin.\n\n# SSS\n\nSoru.`);
    await expect(panel).toContainText('Anahtar kelime başlıkta');
    await page.getByLabel('Durum').selectOption('published');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.waitForURL(/\/admin\/blog\/[0-9a-f-]{36}$/);
    const slug = await page.getByLabel('Slug (TR)').inputValue();
    expect(slug).toMatch(/^e2e-yazi-\d+$/);

    const detail = await page.goto(`/tr/blog/${slug}`);
    expect(detail?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await expect(page.getByRole('navigation', { name: 'İçindekiler' })).toBeVisible();
    await expect(page.locator('#main-content h2#birinci-bolum')).toBeVisible();
    expect((await page.locator('script[type=\"application/ld+json\"]').allTextContents()).join(' ')).toContain('"@type":"BlogPosting"');

    // Ziyaretçi (oturumsuz) yorum bırakır
    const visitor = await browser.newContext();
    const vp = await visitor.newPage();
    await vp.goto(`/tr/blog/${slug}`);
    await vp.waitForLoadState('networkidle');
    await vp.getByLabel('Adınız').fill('Ziyaretçi');
    await vp.getByLabel('Yorumunuz').fill(commentText);
    await vp.getByRole('button', { name: 'Gönder' }).click();
    await expect(vp.locator('#main-content').getByRole('status')).toContainText('onaylandıktan sonra');
    await visitor.close();

    await page.goto('/admin/blog/comments?status=pending');
    const row = page.getByRole('row').filter({ hasText: commentText }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Onayla' }).click();
    await expect(page.getByRole('row').filter({ hasText: commentText })).toHaveCount(0, { timeout: 15_000 });
    await page.goto('/admin/blog/comments?status=approved');
    await expect(page.getByRole('row').filter({ hasText: commentText })).toHaveCount(1);
    // ISR: onay sonrası ilk istek bayat sayfayı sunabilir (SWR) → yeniden yükleyerek bekle
    await expect
      .poll(
        async () => {
          await page.goto(`/tr/blog/${slug}`);
          return page.locator('#main-content .comment').filter({ hasText: commentText }).count();
        },
        { timeout: 20_000, intervals: [1000, 2000, 3000] },
      )
      .toBe(1);

    await page.goto('/admin/blog');
    const postRow = page.getByRole('row').filter({ hasText: name });
    await postRow.getByRole('button', { name: 'Sil' }).click();
    await expect(postRow).toHaveCount(0);
    await expect.poll(async () => (await page.goto(`/tr/blog/${slug}`))?.status(), { timeout: 15_000 }).toBe(404);
  });
});
