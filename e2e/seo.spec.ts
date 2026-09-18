import { expect, test } from '@playwright/test';

// Faz 12: sitemap (hreflang), robots (AI botları), llms.txt, Organization/LocalBusiness JSON-LD, çerez bandı, yasal sayfa 404, HTML site haritası, güvenlik başlıkları.
test.describe('SEO temeli', () => {
  test('sitemap.xml: her URL dil kümesiyle; yayında olmayan yasal sayfa yok', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const xml = await res.text();
    expect(xml).toContain('xhtml:link');
    expect(xml).toContain('hreflang="x-default"');
    expect(xml).toContain('/tr/hizmetler');
    expect(xml).toContain('/en/services');
    expect(xml).not.toContain('/gizlilik-politikasi');
  });

  test('robots.txt: yayın bayrağı kapalıyken tümü engelli (önizleme güvenliği)', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('Disallow: /');
  });

  test('llms.txt ve güvenlik başlıkları', async ({ request }) => {
    const res = await request.get('/llms.txt');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/plain');
    expect(await res.text()).toContain('# ');
    const home = await request.get('/tr');
    expect(home.headers()['x-content-type-options']).toBe('nosniff');
    expect(home.headers()['x-frame-options']).toBe('DENY');
    expect(home.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('ana sayfada Organization JSON-LD, iletişimde LocalBusiness; OG siteName', async ({ page }) => {
    await page.goto('/tr');
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(scripts.join(' ')).toContain('GeneralContractor');
    await expect(page.locator('meta[property="og:site_name"]')).toHaveCount(1);
    await page.goto('/tr/iletisim');
    const contact = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(contact.join(' ')).toContain('"LocalBusiness"');
  });

  test('çerez bandı: onay yokken görünür, kabul edince çerez yazılır ve kapanır; yeniden yüklemede açılmaz', async ({ page, context }) => {
    await page.goto('/tr');
    const banner = page.getByRole('dialog', { name: /Çerez/ });
    await expect(banner).toBeVisible();
    await banner.getByRole('button', { name: 'Tümünü kabul et' }).click();
    await expect(banner).toHaveCount(0);
    const cookie = (await context.cookies()).find((c) => c.name === 'clk_consent');
    expect(cookie).toBeTruthy();
    expect(decodeURIComponent(cookie!.value)).toContain('"analytics":true');
    await page.reload();
    await expect(page.getByRole('dialog', { name: /Çerez/ })).toHaveCount(0);
  });

  test('taslak yasal sayfa 404; HTML site haritası açılır', async ({ page }) => {
    const res = await page.goto('/tr/gizlilik-politikasi');
    expect(res?.status()).toBe(404);
    const map = await page.goto('/tr/site-haritasi');
    expect(map?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Site haritası');
    await expect(page.getByRole('link', { name: 'Hizmetler' }).first()).toBeVisible();
  });
});
