// VARSAYIM #2: kok not-found — kok layout gecirgen oldugu icin kendi <html>'ini render eder.
export default function RootNotFound() {
  return (
    <html lang="tr">
      <body>
        <h1 data-testid="root-404">KOK 404 (dilsiz)</h1>
      </body>
    </html>
  );
}
