#!/usr/bin/env bash
# Canlıyı tek komutla günceller: derle → yükle → eski sürümü yedekle → aç → yeniden başlat → doğrula.
#   bash scripts/cpanel-deploy.sh
# .env.local'da gerekir (cPanel → Manage API Tokens ile üretilir; depoya/sohbete yazılmaz):
#   CPANEL_HOST=mt-seal.guzelhosting.com   CPANEL_USER=clkyapig   CPANEL_TOKEN=…   LIVE_URL=https://clkyapigroup.com
set -euo pipefail
cd "$(dirname "$0")/.."
get() { grep -E "^$1=" .env.local | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//'; }
HOST="$(get CPANEL_HOST)"; USER_="$(get CPANEL_USER)"; TOKEN="$(get CPANEL_TOKEN)"; LIVE="$(get LIVE_URL)"
[ -n "$HOST" ] && [ -n "$USER_" ] && [ -n "$TOKEN" ] && [ -n "$LIVE" ] || { echo ".env.local içinde CPANEL_HOST, CPANEL_USER, CPANEL_TOKEN, LIVE_URL gerekli (bkz. docs/processes/06-DEPLOY-CPANEL.md)"; exit 1; }
API="https://$HOST:2083"; AUTH="Authorization: cpanel $USER_:$TOKEN"; HOME_="/home/$USER_"; STAMP="$(date +%Y%m%d%H%M)"
ok() { node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8'));const r=j.cpanelresult?(j.cpanelresult.data?.[0]?.result??j.cpanelresult.event?.result):j.status;if(r!=1){console.error(JSON.stringify(j.errors??j.cpanelresult?.error??j).slice(0,300));process.exit(1)}"; }
fileop() { curl -fsS -m 300 -H "$AUTH" "$API/json-api/cpanel" --data-urlencode cpanel_jsonapi_user="$USER_" -d cpanel_jsonapi_apiversion=2 -d cpanel_jsonapi_module=Fileman -d cpanel_jsonapi_func=fileop -d doubledecode=0 "$@" | ok; }

bash scripts/cpanel-package.sh "$LIVE"
git checkout tsconfig.json 2>/dev/null || true
echo "Yükleniyor…";    curl -fsS -m 900 -H "$AUTH" -F "dir=$HOME_" -F overwrite=1 -F "file-1=@deploy/clk-site.zip;filename=clk-site-new.zip" "$API/execute/Fileman/upload_files" | ok
echo "Yedekleniyor…";  fileop -d op=rename --data-urlencode "sourcefiles=$HOME_/clk-site/app" --data-urlencode "destfiles=$HOME_/clk-site/app-eski-$STAMP"
echo "Açılıyor…";      fileop -d op=extract --data-urlencode "sourcefiles=$HOME_/clk-site-new.zip" --data-urlencode "destfiles=$HOME_"
echo "Yeniden başlatılıyor…"; curl -fsS -m 60 -H "$AUTH" "$API/execute/Fileman/save_file_content" --data-urlencode "dir=$HOME_/clk-site/tmp" -d file=restart.txt -d "content=$STAMP" | ok
sleep 5
# Passenger ilk isteklerde 502/503 verebilir (süreç ayağa kalkıyor): her yol için 8 deneme, 5 sn arayla (K-104 notu)
for p in /tr /tr/urunler /tr/konfigurator /en; do
  for try in 1 2 3 4 5 6 7 8; do
    code=$(curl -s -o /dev/null -m 90 -w '%{http_code}' "$LIVE$p"); [ "$code" = 200 ] && break; sleep 5
  done
  echo "$code $p"
  [ "$code" = 200 ] || { echo "DOĞRULAMA BAŞARISIZ → geri dönüş: clk-site/app'i sil, app-eski-$STAMP'i app yap, Restart"; exit 1; }
done
# Doğrulama geçti → daha eski yedekleri ve yüklenen zip'i çöpe taşı (yalnız bu turun yedeği kalır: geri dönüş için)
LIST=$(curl -fsS -m 60 -H "$AUTH" "$API/execute/Fileman/list_files?dir=$HOME_/clk-site" | node -e "const j=JSON.parse(require('fs').readFileSync(0,'utf8'));console.log((j.data||[]).map(f=>f.file).filter(f=>f.startsWith('app-eski-')&&f!=='app-eski-$STAMP').join(' '))")
for f in $LIST clk-site-new.zip; do p="$HOME_/clk-site/$f"; [ "$f" = clk-site-new.zip ] && p="$HOME_/$f"; fileop -d op=trash --data-urlencode "sourcefiles=$p" >/dev/null 2>&1 || true; done
echo "Canlı güncellendi: $LIVE (geri dönüş yedeği: clk-site/app-eski-$STAMP; daha eskileri ve zip çöpe taşındı)"
