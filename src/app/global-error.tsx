'use client';

// Kök çökme ekranı. next-intl bağlamına ERİŞEMEZ (useTranslations fırlatır) ve globals.css yüklü
// olmayabilir → metin iki dilde gömülü, stiller satır içi. "Sıfır statik veri" kuralının
// 03-ERROR-ISOLATION'da kayıtlı zorunlu istisnası. Yalnız üretim derlemesinde devreye girer.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, minHeight: '100dvh', display: 'grid', placeContent: 'center', gap: 12, padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif', background: '#f7f6f4', color: '#0f1315' }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Bir hata oluştu</h1>
        <p lang="en" style={{ margin: 0, color: '#3a4750' }}>
          Something went wrong
        </p>
        <button type="button" onClick={reset} style={{ justifySelf: 'center', padding: '10px 20px', border: '1px solid #0f1315', background: 'transparent', color: 'inherit', font: 'inherit', cursor: 'pointer' }}>
          Yeniden dene · Try again
        </button>
      </body>
    </html>
  );
}
