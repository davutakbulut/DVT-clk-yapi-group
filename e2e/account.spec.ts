import { expect, test, type Page } from '@playwright/test';

// K-103: hesabım — kapı (anonim → giriş), özet + sekmeler, firma bilgisi, talep → detay → revizyon isteği → admin rozeti,
// sepet sayfası, güvenlik (personel için silme yok), KVKK dışa aktarım, bildirimler
const EMAIL = process.env['E2E_ADMIN_EMAIL'];
const PASSWORD = process.env['E2E_ADMIN_PASSWORD'];
const hasAccount = Boolean(EMAIL && PASSWORD);
const SHOT = 'test-results/shots';

async function login(page: Page, next: string) {
  await page.goto(`/tr/giris?next=${encodeURIComponent(next)}`);
  await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
  await page.getByLabel('E-posta').fill(EMAIL!);
  await page.getByLabel('Şifre', { exact: true }).fill(PASSWORD!);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.waitForURL((u) => u.pathname === next.split('?')[0]);
}

test.describe('hesabım', () => {
  test('anonim: alt sayfalar girişe yönlendirir (next korunur)', async ({ page }) => {
    await page.goto('/tr/hesabim/teklifler');
    await expect(page).toHaveURL(/\/tr\/giris\?next=%2Ftr%2Fhesabim%2Fteklifler/);
    await page.goto('/tr/hesabim/guvenlik');
    await expect(page).toHaveURL(/\/tr\/giris\?next=%2Ftr%2Fhesabim%2Fguvenlik/);
  });

  test.describe('üye', () => {
    test.skip(!hasAccount, 'E2E_ADMIN_* yok');
    test.beforeEach(() => { test.skip(test.info().project.name === 'tablet', 'mobil + desktop yeter'); });

    test('özet + sekmeler; profil/firma kaydı; talep → detay → revizyon isteği → admin "Müşteriden"; sepet; güvenlik; verilerim; bildirimler', async ({ page, request }) => {
      test.setTimeout(120_000);
      const stamp = Date.now();
      const mobile = test.info().project.name === 'mobile';
      await login(page, '/tr/hesabim');
      await expect(page.getByRole('heading', { level: 1 })).toContainText('Hoş geldiniz');
      const tabs = page.getByRole('navigation', { name: 'Hesap bölümleri' });
      await expect(tabs.getByRole('link')).toHaveCount(8);
      await expect(tabs.getByRole('link', { name: 'Özet' })).toHaveAttribute('aria-current', 'page');
      await expect(page.locator('.stat')).toHaveCount(4);
      await page.screenshot({ path: `${SHOT}/account-overview-${mobile ? 'mobile' : 'desktop'}.png`, fullPage: true });

      // Profil: firma bilgisi kaydı ve kalıcılığı
      await page.goto('/tr/hesabim/profil');
      await page.getByLabel('Firma ünvanı').fill(`E2E Firma ${stamp}`);
      await page.getByLabel('Vergi dairesi').fill('Kadıköy');
      await page.getByLabel('Vergi / TC kimlik no').fill('1234567890');
      await page.getByLabel('İl', { exact: true }).fill('İstanbul');
      await page.getByRole('button', { name: 'Kaydet' }).nth(1).click();
      await expect(page.getByRole('status').filter({ hasText: 'Kaydedildi' })).toBeVisible();
      await page.reload();
      await expect(page.getByLabel('Firma ünvanı')).toHaveValue(`E2E Firma ${stamp}`);
      if (!mobile) await page.screenshot({ path: `${SHOT}/account-profile-desktop.png`, fullPage: true });

      // Talep (oturumlu → user_id) → Tekliflerim → detay → revizyon isteği
      await page.goto('/tr/teklif-al');
      await page.getByLabel('Ad Soyad').fill(`E2E Hesap ${stamp}`);
      await page.getByLabel('E-posta', { exact: true }).fill(`e2e-hesap-${stamp}@example.com`);
      await page.getByLabel('Telefon').fill('+90 555 000 00 00');
      await page.getByLabel('Mesajınız').fill('E2E hesabım talebi. Ara kat platformu.');
      await page.getByLabel(/KVKK/).check();
      await page.getByRole('button', { name: 'Gönder' }).click();
      const status = page.locator('#main-content [role="status"]');
      await expect(status).toContainText('Talebiniz alındı', { timeout: 20_000 });
      const ref = (await status.textContent())!.match(/TLP-\d{4}-\d{4}/)?.[0];
      expect(ref).toBeTruthy();
      await page.goto('/tr/hesabim/teklifler');
      const row = page.getByRole('row').filter({ hasText: ref! });
      await expect(row).toBeVisible();
      await expect(row).toContainText('Alındı');
      await row.getByRole('link', { name: ref! }).click();
      await expect(page).toHaveURL(/\/tr\/hesabim\/teklifler\/[0-9a-f-]{36}$/);
      const leadId = page.url().split('/').pop()!;
      await expect(page.getByText('E2E hesabım talebi')).toBeVisible();
      await page.getByLabel('Mesaj türü').selectOption('revision_request');
      await page.getByLabel('Mesaj', { exact: true }).fill('Ara kat için IPE 300 yerine IPE 270 ile revize eder misiniz?');
      await page.getByRole('button', { name: 'Gönder' }).click();
      await expect(page.getByRole('status').filter({ hasText: 'Mesajınız iletildi' })).toBeVisible();
      await expect(page.locator('.account-msg[data-dir="inbound"]')).toContainText(/Siz.*Teklif düzenleme/);
      await page.screenshot({ path: `${SHOT}/account-quote-${mobile ? 'mobile' : 'desktop'}.png`, fullPage: true });
      // Admin: gelen mesaj rozeti (aynı hesap personel)
      await page.goto(`/admin/leads/${leadId}`);
      await expect(page.getByText('Müşteriden · Revizyon isteği')).toBeVisible();

      // Sepet: boşken kaydet düğmesi pasif; kayıtlı sepet bölümü var
      await page.goto('/tr/hesabim/sepet');
      await expect(page.getByRole('heading', { name: /Bu cihazdaki sepet/ })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sepeti hesabıma kaydet' })).toBeDisabled();

      // Güvenlik: personel hesabında silme bölümü YOK; şifre formu var
      await page.goto('/tr/hesabim/guvenlik');
      await expect(page.getByRole('heading', { name: 'Şifreyi değiştir' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Hesabımı kalıcı olarak sil' })).toHaveCount(0);
      // yanlış mevcut şifre → alan hatası
      await page.getByLabel('Mevcut şifre').first().fill('yanlis-sifre-123');
      await page.getByLabel('Yeni şifre', { exact: true }).fill('yeni-sifre-123');
      await page.getByLabel('Yeni şifre (tekrar)').fill('yeni-sifre-123');
      await page.getByRole('button', { name: 'Şifreyi değiştir' }).click();
      await expect(page.getByText('E-posta veya şifre hatalı.').first()).toBeVisible();

      // Verilerim: JSON dışa aktarım (oturum çerezleriyle)
      await page.goto('/tr/hesabim/verilerim');
      await expect(page.getByRole('link', { name: 'Verilerimi indir (JSON)' })).toBeVisible();
      const res = await request.get('/api/account/export', { headers: { cookie: (await page.context().cookies()).map((c) => `${c.name}=${c.value}`).join('; ') } });
      expect(res.status()).toBe(200);
      expect(res.headers()['content-disposition']).toContain('attachment');
      const body = (await res.json()) as { profile: unknown; leads: { ref_no: string }[] };
      expect(body.profile).toBeTruthy();
      expect(body.leads.some((l) => l.ref_no === ref)).toBe(true);

      // Bildirimler + konfigürasyonlar sayfaları açılır
      await page.goto('/tr/hesabim/bildirimler');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bildirimler');
      await page.goto('/tr/hesabim/konfigurasyonlar');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Konfigürasyonlarım');
      await page.goto('/en/account/quotes');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('My quotes');
    });
  });
});
