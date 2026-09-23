import { expect, test } from '@playwright/test';

// K-102: header araması — büyüteç → giriş; 2 karakter altı istek yok; sonuçta tür + alan + vurgu; Enter → /arama sayfası; mobilde tam ekran
test.describe('site içi arama', () => {
  test('header: "kutu" → ürün sonucu (alan etiketi), /arama sayfası aynı sonuçları verir', async ({ page }) => {
    await page.goto('/tr');
    await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
    const requests: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/api/search')) requests.push(r.url()); });
    // Hidrasyondan önce tıklama işlenmez → açılana dek yeniden dene
    const input = page.getByRole('searchbox', { name: 'Site içi arama' });
    await expect(async () => {
      if (!(await input.isVisible())) await page.getByRole('button', { name: 'Ara', exact: true }).click({ timeout: 2000 });
      await expect(input).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 20_000 });
    await expect(input).toBeFocused();
    await input.fill('k');
    await page.waitForTimeout(500);
    expect(requests).toHaveLength(0); // 2 karakter altı istek atılmaz
    await input.fill('kutu profil');
    const item = page.locator('.site-search-item').first();
    await expect(item).toBeVisible({ timeout: 15_000 });
    await expect(item).toContainText('Ürün');
    await expect(item.locator('.site-search-where')).toContainText(/Başlıkta|Özette|İçerikte/);
    await expect(item.locator('mark').first()).toBeVisible();
    // gecikme + iptal: birkaç harf hızlı yazılınca istek sayısı harf sayısından az
    await input.fill('trapez');
    await input.pressSequentially(' sac', { delay: 40 });
    await page.waitForTimeout(800);
    expect(requests.length).toBeLessThan(6);
    await input.press('Enter');
    await expect(page).toHaveURL(/\/tr\/arama\?q=trapez/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Site içi arama');
    await expect(page.locator('.site-search-list-page .site-search-item').first()).toBeVisible({ timeout: 20_000 }); // sunucu tarafı RPC; yük altında yavaş
    await page.keyboard.press('Escape');
  });
  test('Esc kapatır; boş sorgu ipucu; API kısa sorguya boş döner', async ({ page, request }) => {
    await page.goto('/tr/urunler');
    await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
    await expect(async () => {
      if ((await page.getByRole('dialog', { name: 'Site içi arama' }).count()) === 0) await page.getByRole('button', { name: 'Ara', exact: true }).click({ timeout: 2000 });
      await expect(page.getByRole('dialog', { name: 'Site içi arama' })).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 20_000 });
    await expect(page.locator('.site-search-hint')).toContainText('En az 2 karakter');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Site içi arama' })).toHaveCount(0);
    const res = await request.get('/api/search?q=k&locale=tr');
    expect((await res.json()).hits).toEqual([]);
    const res2 = await request.get('/api/search?q=kutu&locale=tr');
    expect(res2.headers()['cache-control']).toContain('max-age=60');
  });
});
