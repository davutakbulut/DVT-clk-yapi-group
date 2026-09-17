import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// VARSAYIM #5: next/og'nin VARSAYILAN fontu Turkce glifleri kapsiyor mu? (ozel font yuklenmiyor)
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#fff', color: '#111', fontSize: 64 }}>
        <div>Çelik Konstrüksiyon İşleri</div>
        <div style={{ fontSize: 56, marginTop: 24 }}>Ş Ğ Ü Ö İ Ç · ş ğ ü ö ı ç</div>
        <div style={{ fontSize: 40, marginTop: 24, color: '#555' }}>IĞDIR · ıspanak · İSTANBUL · ışık</div>
      </div>
    ),
    size,
  );
}
