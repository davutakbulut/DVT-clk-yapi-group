import { expect, test } from '@playwright/test';

// K-106: hizmetler (gruplar, atlama çubuğu, öne çıkanlar, bağlantılar, SSS, CTA) ve projeler (çipler, durum sekmeleri, sayaç, kartlar, kategori sayfası)
test.describe('hizmetler & projeler sayfaları', () => {
  test('hizmetler: 3 grup, 12 hizmet, atlama çubuğu, detay ve "Projeleri gör" bağlantıları, SSS, CTA', async ({ page }) => {
    await page.goto('/tr/hizmetler');
    await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Projeden');
    const jump = page.getByRole('navigation', { name: 'Hizmet grupları' });
    await expect(jump.getByRole('link')).toHaveCount(5);
    await expect(page.locator('#steel .svc-card')).toHaveCount(6);
    await expect(page.locator('#engineering .wide-svc')).toHaveCount(1);
    await expect(page.locator('#construction .svc-rows li')).toHaveCount(5);
    await expect(page.locator('#steel .inc li').first()).toBeVisible();
    await expect(page.locator('.why-grid li')).toHaveCount(4);
    await expect(page.locator('.steps li')).toHaveCount(4);
    await expect(page.locator('.tools a')).toHaveCount(3);
    await expect(page.locator('.faq-list details')).toHaveCount(3);
    await expect(page.locator('.cta-band')).toContainText('konuşalım');
    const see = page.locator('#steel .svc-links a.sec').first();
    await expect(see).toHaveAttribute('href', /\/tr\/projeler\/kategori\//);
    await page.locator('#steel .svc-links a').first().click();
    await expect(page).toHaveURL(/\/tr\/hizmetler\/[a-z0-9-]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('projeler: kategori çipleri adetli, durum sekmeleri süzer, sayaç canlı, kart meta; kategori sayfası seçili başlar; boş durum', async ({ page }) => {
    await page.goto('/tr/projeler');
    await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Çelikte');
    const cats = page.getByRole('group', { name: 'Kategori' });
    await expect(cats.getByRole('button')).toHaveCount(11); // Tümü + 10
    await expect(cats.getByRole('button', { name: /^Tümü/ })).toHaveAttribute('aria-pressed', 'true');
    const count = page.locator('.proj-count');
    await expect(count).toContainText(/\d+ proje/);
    // durum: "Tamamlanan" → tasarım aşamasındaki projeler düşer
    // durum sekmeleri: "Tamamlanan"da tasarım çipi görünmez; "Devam eden ve tasarım"da tamamlandı çipi görünmez (paralel testler proje ekleyebilir)
    await page.getByRole('group', { name: 'Durum' }).getByRole('button', { name: 'Tamamlanan' }).click();
    await expect(page.locator('.chip-phase[data-phase="design"]')).toHaveCount(0);
    await page.getByRole('group', { name: 'Durum' }).getByRole('button', { name: /Devam eden/ }).click();
    await expect(page.locator('.chip-phase[data-phase="completed"]')).toHaveCount(0);
    const cards = page.locator('.proj-card');
    if ((await cards.count()) > 0) {
      await expect(cards.first().locator('.chip-phase')).toBeVisible();
      await expect(cards.first().locator('.proj-meta div')).toHaveCount(4);
      await expect(cards.first().getByRole('link', { name: /Projeyi incele/ })).toBeVisible();
    }
    // kategori çipi → URL paylaşımı
    await cats.getByRole('button', { name: /Çatı ve Cephe/ }).click();
    await expect(page).toHaveURL(/kategori=cati-ve-cephe/);
    await expect(count).toContainText('Çatı ve Cephe');
    // kategori sayfası (JS'siz yol) seçili başlar
    await page.goto('/tr/projeler/kategori/betonarme');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Betonarme');
    await expect(cats.getByRole('button', { name: /^Betonarme/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.proj-empty h3').first()).toContainText('Betonarme projeleri yakında burada'); // .first(): hidrasyon anında kısa süreli çift kopya (ROADMAP açık madde)
    await expect(page.locator('.steps li')).toHaveCount(4);
    await expect(page.locator('.cta-band')).toContainText('Sıradaki proje');
  });

  test('EN: hizmetler sayfası İngilizce metinlerle açılır; yalnız TR yayındaki yeni hizmetler EN listede yok', async ({ page }) => {
    await page.goto('/en/services');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('From design');
    await expect(page.locator('#steel .svc-card')).toHaveCount(4);
  });
});
