#!/usr/bin/env bash
# cPanel (CloudLinux Node.js Selector / Passenger) için yükleme paketi üretir — bkz. docs/processes/06-DEPLOY-CPANEL.md
#
#   bash scripts/cpanel-package.sh https://www.alanadiniz.com
#
# Çıktı: deploy/clk-site.zip — içinde derlenmiş site + yalnız çalışma zamanı bağımlılıkları (node_modules'u sunucuda kurmak gerekmez).
# Sunucuda DERLEME YAPILMAZ (paylaşımlı hosting bellek limiti). Sırlar pakete GİRMEZ: cPanel → Node.js → Environment variables.
set -euo pipefail
cd "$(dirname "$0")/.."

SITE_URL="${1:-}"
[[ "$SITE_URL" =~ ^https?://[^/]+$ ]] || { echo "Kullanım: bash scripts/cpanel-package.sh https://www.alanadiniz.com   (sonda / yok)"; exit 1; }
[ -f .env.local ] || { echo ".env.local yok: NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY derlemeye gömülür"; exit 1; }

OUT=deploy
APP="$OUT/clk-site"
rm -rf "$APP" "$OUT/clk-site.zip" .next-cpanel   # secrets.env gibi diğer dosyalara dokunma
mkdir -p "$APP"

# Gizli olmayan canlı ayarlar: derlemeye (X-Robots-Tag başlığı derlemede sabitlenir) ve çalışma zamanına (settings.env) girer
set -a; source scripts/cpanel-settings.env; set +a

echo "1/4 Derleniyor ($SITE_URL · indekslenebilir: ${SITE_INDEXABLE:-false})…"
NEXT_OUTPUT=standalone NEXT_DIST_DIR=.next-cpanel NEXT_PUBLIC_SITE_URL="$SITE_URL" npx next build > "$OUT/build.log" 2>&1 || { tail -30 "$OUT/build.log"; echo "Derleme başarısız (bkz. $OUT/build.log)"; exit 1; }

echo "2/4 Paket toplanıyor…"
cp -R .next-cpanel/standalone/. "$APP/"
mkdir -p "$APP/.next-cpanel"
cp -R .next-cpanel/static "$APP/.next-cpanel/static"
[ -d public ] && cp -R public "$APP/public"
# Sırlar ve geliştirme artıkları pakete girmez
rm -f "$APP"/.env "$APP"/.env.* 2>/dev/null || true
rm -rf "$APP/deploy" "$APP/.share" "$APP/assets" "$APP/_archive" "$APP/backups" 2>/dev/null || true

echo "3/4 Linux (x64, glibc) için sharp ikilileri ekleniyor…"
SHARP_VERSION=$(node -p "require('./node_modules/sharp/package.json').version")
TMP=$(mktemp -d)
( cd "$TMP" && npm init -y >/dev/null 2>&1 && npm install --no-audit --no-fund --os=linux --cpu=x64 --libc=glibc "sharp@$SHARP_VERSION" >/dev/null 2>&1 )
mkdir -p "$APP/node_modules/@img"
cp -R "$TMP"/node_modules/@img/*linux* "$APP/node_modules/@img/" 2>/dev/null || { echo "UYARI: linux sharp ikilisi alınamadı — panelden görsel yükleme çalışmayabilir"; }
rm -rf "$TMP"

# CloudLinux Node.js Selector uygulama kökünde gerçek bir node_modules klasörüne izin vermez (kendi sanal ortamına sembolik bağ koyar)
# → paketin tamamı app/ alt klasöründe durur; kökte yalnız başlangıç dosyası ve cron betiği kalır.
mkdir -p "$APP/app"
for item in .next-cpanel messages node_modules package.json server.js public; do
  [ -e "$APP/$item" ] && mv "$APP/$item" "$APP/app/$item"
done

grep -vE "^\s*(#|$)" scripts/cpanel-settings.env > "$APP/settings.env"

# Passenger başlangıç dosyası: cPanel "Application startup file" = app.js
cat > "$APP/app.js" <<'JS'
// cPanel/Passenger başlangıç dosyası. Passenger dinlenecek soketi kendi verir (listen() çağrısını yakalar).
// HOSTNAME 0.0.0.0 OLMALI: belirli bir ad (127.0.0.1/localhost) verilirse Next, middleware'in iç yönlendirmelerini
// (/tr/urunler → /tr/products) "dış adres" sanıp kendine vekil istek atar → 307 döngüsü / 500 (yerelde doğrulandı).
const path = require('node:path');
process.env.NODE_ENV = 'production';
process.env.HOSTNAME = '0.0.0.0';
// secrets.env (scripts/cpanel-secrets.sh üretir; public_html dışında): KEY=VALUE satırları → ortam. Paneldeki değişkenler önceliklidir.
// settings.env: gizli olmayan ayarlar (paketle gelir: SITE_ENV, SITE_INDEXABLE, INDEXNOW_KEY).
for (const file of ['secrets.env', 'settings.env']) {
  try {
    for (const line of require('node:fs').readFileSync(path.join(__dirname, file), 'utf8').split('\n')) {
      const i = line.indexOf('=');
      if (i > 0 && !line.startsWith('#') && process.env[line.slice(0, i).trim()] === undefined) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  } catch {
    // dosya yoksa yalnız paneldeki değişkenlerle çalışır
  }
}
// http → https (301): sunucunun ön katmanı X-Forwarded-Proto gönderir; .htaccess kuralı Passenger'dan önce çalışmadığı için burada.
// Statik dosyalar dahil her yolu kapsar. Kapatmak için FORCE_HTTPS=0. ACME doğrulama yolu hariç.
if (process.env.FORCE_HTTPS !== '0') {
  const http = require('node:http');
  const createServer = http.createServer;
  http.createServer = function (options, listener) {
    const handler = typeof options === 'function' ? options : listener;
    const wrapped = (req, res) => {
      if (req.headers['x-forwarded-proto'] === 'http' && !String(req.url).startsWith('/.well-known/')) {
        res.writeHead(301, { Location: `https://${req.headers.host}${req.url}`, 'Cache-Control': 'max-age=3600' });
        return res.end();
      }
      return handler(req, res);
    };
    return typeof options === 'function' ? createServer.call(http, wrapped) : createServer.call(http, options, wrapped);
  };
}
// E-posta kuyruğu: paylaşımlı hosting cron'u en sık 15 dk'da bir çalışır → onay e-postaları gecikir. Uygulama ayaktayken kuyruk
// dakikada bir buradan tetiklenir (aynı korumalı uç; cron yedek olarak kalır). Uygulama uyurken form da gelmez; form uyandırır.
if (process.env.SITE_URL && process.env.CRON_SECRET && process.env.MAIL_TICK !== '0') {
  const tick = () => fetch(`${process.env.SITE_URL}/api/cron/mail`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }, signal: AbortSignal.timeout(50_000) }).catch(() => {});
  setTimeout(tick, 20_000).unref();
  setInterval(tick, 60_000).unref();
}
process.chdir(path.join(__dirname, 'app'));
require('./app/server.js');
JS

# Zamanlanmış görevler (vercel.json'daki cron'ların cPanel karşılığı)
cat > "$APP/cron.sh" <<'SH'
#!/usr/bin/env bash
# Kullanım (cPanel → Cron Jobs):  bash ~/clk-site/cron.sh mail
# SITE_URL ve CRON_SECRET bu dosyanın yanındaki secrets.env'den okunur (kaynak olarak çalıştırılmaz: değerlerde boşluk olabilir).
set -uo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
val() { grep -E "^$1=" "$DIR/secrets.env" | head -1 | cut -d= -f2-; }
LOG="$HOME/logs/clk-cron.log"
CODE=$(curl -sS -m 120 -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $(val CRON_SECRET)" "$(val SITE_URL)/api/cron/$1" 2>>"$LOG")
# Başarılı dakikalık koşular günlüğü şişirmesin: yalnız hata ve dakikalık olmayan işler yazılır; günlük 500 satırda tutulur
if [ "$CODE" != "200" ] || [ "$1" != "mail" ]; then echo "$(date '+%F %T') $1 $CODE" >> "$LOG"; fi
[ -f "$LOG" ] && [ "$(wc -l < "$LOG")" -gt 500 ] && tail -300 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
[ "$CODE" = "200" ]
SH
chmod +x "$APP/cron.sh"

echo "4/4 Sıkıştırılıyor…"
( cd "$OUT" && zip -qr clk-site.zip clk-site )
echo "Hazır: $OUT/clk-site.zip ($(du -h "$OUT/clk-site.zip" | cut -f1)) — açılmış boyut $(du -sh "$APP" | cut -f1)"
find "$APP" -name "*.node" | sed "s|$APP/||" | head -10
