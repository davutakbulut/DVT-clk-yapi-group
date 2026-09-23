#!/usr/bin/env bash
# Sunucudaki ~/clk-site/secrets.env içinde TEK anahtarı ekler/günceller ve uygulamayı yeniden başlatır (değer ekrana yazılmaz).
#   bash scripts/cpanel-secret-set.sh RPC_GATE_SECRET        → değer .env.local'dan alınır
#   bash scripts/cpanel-secret-set.sh TRUSTED_PROXY_HOPS 1   → değer komut satırından
set -euo pipefail
cd "$(dirname "$0")/.."
KEY="${1:?anahtar adı}"; VAL="${2:-}"
get() { grep -E "^$1=" .env.local | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }
[ -n "$VAL" ] || VAL="$(get "$KEY")"; [ -n "$VAL" ] || { echo "$KEY için değer yok (.env.local ya da 2. argüman)"; exit 1; }
HOST="$(get CPANEL_HOST)"; USER_="$(get CPANEL_USER)"; TOKEN="$(get CPANEL_TOKEN)"
[ -n "$HOST$USER_$TOKEN" ] || { echo "CPANEL_HOST/USER/TOKEN yok"; exit 1; }
API="https://$HOST:2083"; AUTH="Authorization: cpanel $USER_:$TOKEN"; DIR="/home/$USER_/clk-site"
CUR=$(curl -fsS -m 60 -H "$AUTH" "$API/execute/Fileman/get_file_content?dir=$DIR&file=secrets.env" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write((j.data&&j.data.content)||'')")
NEW=$(printf '%s\n' "$CUR" | grep -v "^$KEY=" | sed '/^$/d'; printf '%s=%s\n' "$KEY" "$VAL")
curl -fsS -m 60 -H "$AUTH" "$API/execute/Fileman/save_file_content" --data-urlencode "dir=$DIR" -d file=secrets.env --data-urlencode "content=$NEW" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8'));if(j.status!=1){console.error(JSON.stringify(j.errors));process.exit(1)}"
curl -fsS -m 60 -H "$AUTH" "$API/execute/Fileman/save_file_content" --data-urlencode "dir=$DIR/tmp" -d file=restart.txt -d "content=$(date +%s)" >/dev/null
echo "$KEY sunucuya yazıldı; uygulama yeniden başlatılıyor (değer gösterilmedi)"
