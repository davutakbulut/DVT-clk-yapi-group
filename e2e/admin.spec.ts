import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const EMAIL = process.env['E2E_ADMIN_EMAIL'];
const PASSWORD = process.env['E2E_ADMIN_PASSWORD'];
const hasAccount = Boolean(EMAIL && PASSWORD);

async function login(page: Page, next = '/admin') {
  await page.goto(`/tr/giris?next=${encodeURIComponent(next)}`);
  await page.getByLabel('E-posta').fill(EMAIL!);
  await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD!);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.waitForURL(`**${next}`);
}

test.describe('üyelik ve panel kapısı', () => {
  test('oturumsuz /admin → giriş sayfası (next korunur); yanlış şifre genel hata verir', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/tr\/giris\?next=%2Fadmin$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Giriş yap');
    await page.getByLabel('E-posta').fill('yok@example.com');
    await page.getByLabel('Şifre', { exact: true }).fill('yanlis-sifre-123');
    await page.getByRole('button', { name: 'Giriş yap' }).click();
    await expect(page.getByRole('alert')).toContainText(/E-posta veya şifre hatalı|Üyelik hizmeti şu an kullanılamıyor/);
  });

  test('açık yönlendirme: next=//evil giriş sonrası dışarı çıkarmaz', async ({ page }) => {
    test.skip(!hasAccount, 'E2E_ADMIN_* yok');
    await page.goto('/tr/giris?next=//evil.example');
    await page.getByLabel('E-posta').fill(EMAIL!);
    await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD!);
    await page.getByRole('button', { name: 'Giriş yap' }).click();
    await page.waitForURL(/localhost/);
    expect(new URL(page.url()).hostname).toBe('localhost');
  });
});

test.describe('yönetim paneli', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok (CI: gizli değişken olarak verin)');

  test('giriş → panel; başlık, sayaçlar, gezinme, noindex; axe temiz; çıkış', async ({ page }) => {
    await login(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Panel');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.getByText('Medya dosyası')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    await page.getByRole('button', { name: 'Çıkış' }).click();
    await page.waitForURL(/\/tr$/);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/tr\/giris/);
  });

  test('menüler: 3 menü listelenir, header öğeleri route uyarısıyla görünür', async ({ page }) => {
    await login(page, '/admin/menus');
    await expect(page.getByRole('link', { name: /Üst menü/ })).toBeVisible();
    await page.getByRole('link', { name: /Üst menü/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Üst menü');
    await expect(page.getByText('Hizmetler', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('route yok').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Yeni öğe' })).toBeVisible();
  });

  test('site ayarları formu dolu gelir ve kaydedilir (değer değişmeden)', async ({ page }) => {
    await login(page, '/admin/settings');
    const name = page.getByLabel('Site adı (TR)');
    await expect(name).toHaveValue(/CLK/);
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page.getByRole('status')).toHaveText('Kaydedildi');
  });

  test('medya kütüphanesi: Faz 3 dosyaları listelenir, klasör süzgeci çalışır', async ({ page }) => {
    await login(page, '/admin/media');
    await expect(page.getByText(/\d+ dosya/)).toBeVisible();
    await page.getByRole('link', { name: 'videos' }).click();
    await expect(page).toHaveURL(/folder=videos/);
    await expect(page.getByText('4 dosya')).toBeVisible();
  });

  test('üyeler: tablo görünür; admin (super_admin değil) rol değiştiremez', async ({ page }) => {
    await login(page, '/admin/users');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Üyeler ve Roller');
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Rol' })).toHaveCount(0);
  });

  test('hesabım: profil sayfası açılır, header hesap menüsü yönetim paneline bağlanır', async ({ page }) => {
    await login(page, '/tr/hesabim');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hesabım');
    await page.getByRole('banner').getByLabel('Hesap menüsü').click();
    await expect(page.getByRole('menuitem', { name: 'Yönetim Paneli' })).toHaveAttribute('href', '/admin');
  });
});
