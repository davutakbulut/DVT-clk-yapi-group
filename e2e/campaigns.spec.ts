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

// K-108: toplu e-posta. Test HİÇBİR ZAMAN gerçek alıcıya kampanya başlatmaz: yalnız example.com adresleri kullanılır,
// bunlar kitle çözümünde (0057) elenir → "alıcı yok". Gönderim döngüsü PGlite + birim testlerinde sınanır.
test.describe('toplu e-posta (panel)', () => {
  test.skip(!hasAccount, 'E2E_ADMIN_* yok');

  test('taslak: canlı önizleme → alıcı hesabı (alanlar silinmez) → kaydet → alıcısız başlatılamaz → sil', async ({ page }) => {
    test.slow();
    const name = `E2E Kampanya ${Date.now()}`;
    await login(page, '/admin/campaigns/new');
    await page.getByLabel('Kampanya adı').fill(name);
    await page.getByLabel('Konu').fill('E2E duyuru konusu');
    await page.getByLabel('Metin').fill('## Yeni ürünler\n\nSayın {{full_name}},\n**Önemli** bir duyurumuz var.\n\n- Birinci madde\n- İkinci madde');
    await page.getByLabel('Düğme yazısı').fill('Ürünleri incele');
    await page.getByLabel('Düğme adresi').fill('https://clkyapigroup.com/tr/urunler');
    const preview = page.frameLocator('iframe[title="Önizleme"]');
    await expect(preview.locator('h2')).toHaveText('Yeni ürünler');
    await expect(preview.locator('strong')).toHaveText('Önemli');
    await expect(preview.locator('li')).toHaveCount(2);
    await expect(preview.getByRole('link', { name: 'Ürünleri incele' })).toHaveAttribute('href', 'https://clkyapigroup.com/tr/urunler');
    await expect(preview.getByRole('link', { name: 'Listeden çık' })).toHaveAttribute('href', /\/tr\/abonelik-iptal\?t=/);

    await page.getByRole('textbox', { name: 'Elle eklenen adresler' }).fill('E2E Bir <e2e-bir@example.com>\ne2e-iki@example.com; E2E İki\nadres-degil');
    await page.getByLabel(/Bu adreslerin sahiplerinden/).check();
    await page.getByRole('button', { name: 'Alıcıları hesapla' }).click();
    await expect(page.getByText('0 alıcı', { exact: true })).toBeVisible(); // example.com teste ayrılmış alan adı → kitleye girmez
    await expect(page.getByText(/1 satır alınmadı/)).toBeVisible();
    // Form eylemi alanları sıfırlamamalı
    await expect(page.getByLabel('Kampanya adı')).toHaveValue(name);
    await expect(page.getByLabel(/Bu adreslerin sahiplerinden/)).toBeChecked();

    await page.getByRole('button', { name: 'Taslağı kaydet' }).click();
    await page.waitForURL(/\/admin\/campaigns\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    await expect(page.getByRole('textbox', { name: 'Elle eklenen adresler' })).toHaveValue(/e2e-bir@example\.com/);

    await page.getByLabel(/başladıktan sonra/).check();
    await page.getByRole('button', { name: 'Gönderimi başlat' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Alıcı yok' })).toBeVisible();

    await page.goto('/admin/campaigns');
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toContainText('Taslak');
    await row.getByRole('link', { name }).click();
    await page.getByRole('button', { name: 'Taslağı sil' }).click();
    await page.waitForURL(/\/admin\/campaigns$/);
    await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(0);
  });

  test('hazır şablon: önizle (form değişmez) → kullan → doldurulmamış alan uyarısı, başlatma kapalı → üzerine yazma onayı', async ({ page }) => {
    test.slow();
    const name = `E2E Kampanya şablon ${Date.now()}`;
    await login(page, '/admin/campaigns/new');
    await page.getByLabel('Kampanya adı').fill(name);
    const card = page.locator('li').filter({ hasText: 'Teklif hatırlatma' });
    await card.getByRole('button', { name: 'Önizle' }).click();
    const preview = page.frameLocator('iframe[title="Önizleme"]');
    await expect(preview.locator('body')).toContainText('teklifimizi değerlendirme fırsatınız oldu mu?');
    await expect(page.getByRole('status').filter({ hasText: 'Şablon önizlemesi: Teklif hatırlatma' })).toBeVisible();
    await expect(page.getByLabel('Konu')).toHaveValue(''); // önizleme formu değiştirmez
    await card.getByRole('button', { name: 'Bu şablonu kullan' }).click();
    await expect(page.getByLabel('Konu')).toHaveValue('Teklifimizle ilgili sorunuz var mı?');
    await expect(page.getByLabel('Metin')).toHaveValue(/\[tarih\] tarihinde ilettiğimiz/);
    await expect(page.getByLabel('Düğme adresi')).toHaveValue(/^https:\/\//);
    await expect(page.getByText(/Doldurulması gereken 2 alan var/)).toBeVisible();

    // Formda metin varken başka şablon: önce onay ister
    const other = page.locator('li').filter({ hasText: 'Yeni yıl kutlaması' });
    await other.getByRole('button', { name: 'Bu şablonu kullan' }).click();
    await expect(other.getByRole('alert')).toContainText('bu şablonla değişecek');
    await expect(page.getByLabel('Konu')).toHaveValue('Teklifimizle ilgili sorunuz var mı?');
    await other.getByRole('button', { name: 'Vazgeç' }).click();

    await page.getByRole('button', { name: 'Taslağı kaydet' }).click();
    await page.waitForURL(/\/admin\/campaigns\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('button', { name: 'Gönderimi başlat' })).toBeDisabled();
    await expect(page.getByText('Köşeli parantezli alanları doldurup taslağı kaydedin.')).toBeVisible();
    const body = await page.getByLabel('Metin').inputValue();
    await page.getByLabel('Metin').fill(body.replace('[tarih]', '12 Eylül').replace('[proje ya da ürün]', 'çelik hol'));
    await expect(page.getByText(/Doldurulması gereken/)).toHaveCount(0);
    await expect(preview.locator('body')).toContainText('12 Eylül tarihinde ilettiğimiz çelik hol teklifimizi');
    await page.getByRole('button', { name: 'Taslağı sil' }).click();
    await page.waitForURL(/\/admin\/campaigns$/);
  });

  test('şablon yönetimi: yeni şablon (canlı önizleme) → listede → seçicide görünür → sil', async ({ page }) => {
    test.slow();
    const name = `E2E Şablon ${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    await login(page, '/admin/campaigns/templates/new');
    await page.getByLabel('Şablon adı').fill(name);
    await page.getByLabel('Durum').selectOption('event');
    await page.getByLabel('Konu').fill('E2E şablon konusu');
    await page.getByLabel('Metin').fill('## E2E başlık\n\nSayın {{full_name}},\n[tarih] için deneme metni.');
    await expect(page.frameLocator('iframe[title="Önizleme"]').locator('h2')).toHaveText('E2E başlık');
    await expect(page.getByText('Bu şablonda doldurulacak alanlar:')).toContainText('[tarih]');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await page.waitForURL(/\/admin\/campaigns\/templates\/[0-9a-f-]{36}$/);
    await page.goto('/admin/campaigns/templates');
    await expect(page.getByRole('row').filter({ hasText: name })).toContainText('Etkinlik ve davet');
    await page.goto('/admin/campaigns/new');
    await expect(page.locator('li').filter({ hasText: name })).toBeVisible();
    await page.goto('/admin/campaigns/templates');
    await page.getByRole('link', { name }).click();
    await page.getByRole('button', { name: 'Şablonu sil' }).click();
    await page.waitForURL(/\/admin\/campaigns\/templates$/);
    await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(0);
  });

  test('engel listesi: ekle → listede → kaldır; gönderim ayarları açılır', async ({ page }) => {
    const address = `e2e-engel-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
    await login(page, '/admin/campaigns/suppressions');
    await page.getByRole('textbox', { name: 'E-posta', exact: true }).fill(address);
    await page.getByLabel('Neden').selectOption('bounced');
    await page.getByLabel('Not').fill('E2E notu');
    await page.getByRole('button', { name: 'Ekle' }).click();
    const row = page.getByRole('row').filter({ hasText: address });
    await expect(row).toContainText('İleti geri döndü');
    await row.getByRole('button', { name: 'Listeden kaldır' }).click();
    await expect(page.getByRole('row').filter({ hasText: address })).toHaveCount(0);

    await page.goto('/admin/campaigns/settings');
    await expect(page.getByLabel('Saatlik en çok ileti')).toHaveValue(/^[1-9]\d*$/);
    await expect(page.getByLabel('"Listeden çık" bağlantı yazısı (Türkçe)')).not.toHaveValue('');
  });
});

test.describe('listeden çık (herkese açık)', () => {
  test('anahtarsız bağlantı hata gösterir; bilinmeyen anahtar onayda reddedilir; sayfa noindex', async ({ page }) => {
    await page.goto('/tr/abonelik-iptal');
    await page.getByRole('button', { name: 'Yalnız zorunlu' }).click({ timeout: 3000 }).catch(() => undefined);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Listeden çık');
    await expect(page.locator('.unsub-error')).toContainText('Bağlantı geçersiz');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await page.goto('/tr/abonelik-iptal?t=00000000-0000-4000-8000-000000000000');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Listeden çıkmayı onayla' }).click();
    await expect(page.locator('.unsub-error')).toContainText('Bağlantı geçersiz');
  });

  test('tek tık ucu: POST her zaman 204 (bilgi sızdırmaz), GET onay sayfasına yönlendirir', async ({ request }) => {
    const post = await request.post('/api/unsubscribe?t=00000000-0000-4000-8000-000000000000', { form: { 'List-Unsubscribe': 'One-Click' } });
    expect(post.status()).toBe(204);
    expect((await request.post('/api/unsubscribe?t=bozuk')).status()).toBe(204);
    const get = await request.get('/api/unsubscribe?t=00000000-0000-4000-8000-000000000000', { maxRedirects: 0 });
    expect(get.status()).toBe(302);
    expect(get.headers()['location']).toContain('/tr/abonelik-iptal?t=00000000-0000-4000-8000-000000000000');
  });
});
