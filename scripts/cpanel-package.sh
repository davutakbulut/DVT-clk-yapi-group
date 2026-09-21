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
rm -rf "$OUT" .next-cpanel
mkdir -p "$APP"

echo "1/4 Derleniyor ($SITE_URL)…"
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

# Passenger başlangıç dosyası: cPanel "Application startup file" = app.js
cat > "$APP/app.js" <<'JS'
// cPanel/Passenger başlangıç dosyası. Passenger dinlenecek soketi kendi verir (listen() çağrısını yakalar).
// HOSTNAME 0.0.0.0 OLMALI: belirli bir ad (127.0.0.1/localhost) verilirse Next, middleware'in iç yönlendirmelerini
// (/tr/urunler → /tr/products) "dış adres" sanıp kendine vekil istek atar → 307 döngüsü / 500 (yerelde doğrulandı).
process.env.NODE_ENV = 'production';
process.env.HOSTNAME = '0.0.0.0';
process.chdir(__dirname);
require('./server.js');
JS

# Zamanlanmış görevler (vercel.json'daki cron'ların cPanel karşılığı)
cat > "$APP/cron.sh" <<'SH'
#!/usr/bin/env bash
# Kullanım (cPanel → Cron Jobs):  bash ~/clk-site/cron.sh mail
# SITE_URL ve CRON_SECRET bu dosyanın yanındaki cron.env'den okunur (chmod 600).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$DIR/cron.env"
curl -fsS -m 120 -H "Authorization: Bearer $CRON_SECRET" "$SITE_URL/api/cron/$1" >/dev/null
SH
chmod +x "$APP/cron.sh"

echo "4/4 Sıkıştırılıyor…"
( cd "$OUT" && zip -qr clk-site.zip clk-site )
echo "Hazır: $OUT/clk-site.zip ($(du -h "$OUT/clk-site.zip" | cut -f1)) — açılmış boyut $(du -sh "$APP" | cut -f1)"
find "$APP" -name "*.node" | sed "s|$APP/||" | head -10
