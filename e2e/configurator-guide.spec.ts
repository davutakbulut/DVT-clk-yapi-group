import { expect, test } from '@playwright/test';

// K-107: konfigüratör rehber (SEO iniş) sayfaları — liste, detay (HowTo/FAQPage JSON-LD, band → konfigüratör), seçim sayfasından bağlantı, ürünler sayfasında band
test.describe('konfigüratör rehberleri', () => {
  test('liste: 6 rehber kartı; detay: H1, faydalar, adımlar, SSS, JSON-LD ve band konfigüratöre gider', async ({ page }) => {
    await page.goto('/tr/konfigurator-rehberi');
    await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Konfigüratör Rehberleri');
    await expect(page.locator('.svc-card')).toHaveCount(6);
    await page.getByRole('link', { name: 'Rehberi oku' }).first().click();
    await expect(page).toHaveURL(/\/tr\/konfigurator-rehberi\/celik-hol-konfiguratoru$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Çelik Hol Konfigüratörü');
    await expect(page.locator('.why-grid li')).toHaveCount(3);
    await expect(page.locator('.steps li')).toHaveCount(3);
    await expect(page.locator('.faq-list details').first()).toBeVisible();
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join(' ');
    expect(ld).toContain('"HowTo"');
    expect(ld).toContain('"FAQPage"');
    expect(ld).toContain('"BreadcrumbList"');
    const banner = page.locator('.cfg-banner');
    await expect(banner).toContainText('Kendiniz inşa etmek ister misiniz?');
    await banner.getByRole('link', { name: /Hol konfigüratörünü aç/ }).click();
    await expect(page).toHaveURL(/\/tr\/konfigurator\/hol/);
  });

  test('seçim sayfasında "Nasıl çalışır?" bağlantısı ve ürünler sayfasında band; noindex yok; site haritasında rehberler', async ({ page, request }) => {
    await page.goto('/tr/konfigurator');
    await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
    await expect(page.getByRole('link', { name: /Nasıl çalışır\?/ })).toHaveCount(6);
    await page.goto('/tr/urunler');
    await expect(page.locator('.cfg-banner')).toContainText('Kendiniz inşa etmek ister misiniz?');
    const res = await request.get('/tr/konfigurator-rehberi/celik-hol-konfiguratoru');
    expect(res.status()).toBe(200);
    expect(await res.text()).not.toContain('name="robots" content="noindex');
    const sm = await (await request.get('/sitemap.xml')).text();
    expect(sm).toContain('/tr/konfigurator-rehberi/celik-hol-konfiguratoru');
    expect(sm).toContain('/tr/konfigurator-rehberi</loc>');
  });
});
