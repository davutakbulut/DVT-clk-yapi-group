#!/usr/bin/env bash
# Sunucuya yüklenecek TEK ayar dosyasını üretir: deploy/secrets.env (bkz. docs/processes/06-DEPLOY-CPANEL.md)
#   bash scripts/cpanel-secrets.sh https://clkyapigroup.com info@clkyapigroup.com
# Değerler ekrana YAZILMAZ. SUPABASE_SECRET_KEY .env.local'dan alınır, CRON_SECRET rastgele üretilir, posta şifresi gizli sorulur.
# Dosya sunucuda ~/clk-site/secrets.env olarak durur (public_html DIŞINDA); app.js açılışta okur, cron.sh de aynı dosyayı kullanır.
set -euo pipefail
cd "$(dirname "$0")/.."
SITE_URL="${1:-}"; MAILBOX="${2:-}"
[[ "$SITE_URL" =~ ^https?://[^/]+$ && "$MAILBOX" == *@* ]] || { echo "Kullanım: bash scripts/cpanel-secrets.sh https://alanadi.com info@alanadi.com"; exit 1; }
[ -f .env.local ] || { echo ".env.local yok"; exit 1; }
DOMAIN="${MAILBOX#*@}"
get() { grep -E "^$1=" .env.local | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"; }
SUPA="$(get SUPABASE_SECRET_KEY)"; [ -n "$SUPA" ] || { echo ".env.local içinde SUPABASE_SECRET_KEY yok"; exit 1; }
printf "%s posta kutusunun şifresi (yazarken görünmez, boş geçilebilir): " "$MAILBOX"; read -rs SMTP_PASS; echo
mkdir -p deploy; OUT=deploy/secrets.env; umask 177
{
  echo "SITE_URL=$SITE_URL"
  echo "SITE_ENV=production"
  echo "SUPABASE_SECRET_KEY=$SUPA"
  echo "CRON_SECRET=$(openssl rand -hex 32)"
  echo "MAIL_FROM=CLK Yapı Group <$MAILBOX>"
  echo "SMTP_HOST=mail.$DOMAIN"
  echo "SMTP_PORT=465"
  echo "SMTP_USER=$MAILBOX"
  [ -n "$SMTP_PASS" ] && echo "SMTP_PASSWORD=$SMTP_PASS"
  for k in GOOGLE_PLACES_API_KEY GOOGLE_PLACE_ID INDEXNOW_KEY RESEND_API_KEY UPSTASH_REDIS_REST_URL UPSTASH_REDIS_REST_TOKEN; do v="$(get $k)"; [ -n "$v" ] && echo "$k=$v"; done
} > "$OUT"
echo "Hazır: $OUT ($(wc -l < "$OUT" | tr -d ' ') satır; değerler gösterilmedi)"
echo "Yükle: cPanel → Dosya Yöneticisi → /home/KULLANICI/clk-site/ içine → sonra Setup Node.js App → Restart"
[ "$(uname)" = Darwin ] && open -R "$OUT" || true
