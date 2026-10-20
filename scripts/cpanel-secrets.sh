#!/usr/bin/env bash
# Sunucuya yüklenecek TEK ayar dosyasını üretir: deploy/secrets.env (bkz. docs/processes/06-DEPLOY-CPANEL.md)
#   bash scripts/cpanel-secrets.sh https://clkyapigroup.com info@clkyapigroup.com
# Değerler ekrana YAZILMAZ. Veritabanı adresi .env.local'daki MYSQL_URL'den (sunucuda localhost'a çevrilir, K-116), CRON_SECRET ve
# FILE_URL_SECRET .env.local'dan (yoksa rastgele), posta şifresi gizli sorulur.
# Dosya sunucuda ~/clk-site/secrets.env olarak durur (public_html DIŞINDA); app.js açılışta okur, cron.sh de aynı dosyayı kullanır.
set -euo pipefail
cd "$(dirname "$0")/.."
SITE_URL="${1:-}"; MAILBOX="${2:-}"
[[ "$SITE_URL" =~ ^https?://[^/]+$ && "$MAILBOX" == *@* ]] || { echo "Kullanım: bash scripts/cpanel-secrets.sh https://alanadi.com info@alanadi.com"; exit 1; }
[ -f .env.local ] || { echo ".env.local yok"; exit 1; }
DOMAIN="${MAILBOX#*@}"
get() { grep -E "^$1=" .env.local | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"; }
DB="$(get MYSQL_URL)"; [ -n "$DB" ] || { echo ".env.local içinde MYSQL_URL yok"; exit 1; }
# Uygulama veritabanıyla aynı sunucuda: uzak ana bilgisayar adı yerine localhost (uzak erişim izni yalnız geliştirme IP'sine)
DB="$(printf '%s' "$DB" | sed -E 's#@[^:/]+(:[0-9]+)?/#@localhost:3306/#')"
FILE_SECRET="$(get FILE_URL_SECRET)"; [ -n "$FILE_SECRET" ] || FILE_SECRET="$(openssl rand -base64 32 | tr -d '=+/')"
printf "%s posta kutusunun şifresi (yazarken görünmez, boş geçilebilir): " "$MAILBOX"; read -rs SMTP_PASS; echo
mkdir -p deploy; OUT=deploy/secrets.env; umask 177
{
  echo "SITE_URL=$SITE_URL"
  echo "SITE_ENV=production"
  echo "MYSQL_URL=$DB"
  echo "FILE_URL_SECRET=$FILE_SECRET"
  echo "CRON_SECRET=$(openssl rand -hex 32)"
  echo "MAIL_FROM=CLK Yapı Group <$MAILBOX>"
  echo "SMTP_HOST=mail.$DOMAIN"
  echo "SMTP_PORT=465"
  echo "SMTP_USER=$MAILBOX"
  [ -n "$SMTP_PASS" ] && echo "SMTP_PASSWORD=$SMTP_PASS"
  for k in GOOGLE_PLACES_API_KEY GOOGLE_PLACE_ID INDEXNOW_KEY RESEND_API_KEY UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN TRUSTED_PROXY_HOPS; do v="$(get $k)"; [ -n "$v" ] && echo "$k=$v"; done
} > "$OUT"
echo "Hazır: $OUT ($(wc -l < "$OUT" | tr -d ' ') satır; değerler gösterilmedi)"
echo "Yükle: cPanel → Dosya Yöneticisi → /home/KULLANICI/clk-site/ içine → sonra Setup Node.js App → Restart"
[ "$(uname)" = Darwin ] && open -R "$OUT" || true
