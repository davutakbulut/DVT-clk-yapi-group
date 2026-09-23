#!/usr/bin/env bash
# Kötüye kullanım / aşırı yük denetimi (K-104) — canlı ya da yerel siteye karşı hız sınırlarını ve IP sahteciliğini sınar.
#   bash scripts/abuse-probe.sh https://clkyapigroup.com
# Yalnız KENDİ sitenizde çalıştırın. ~150 küçük istek atar; sonuç: her adımda beklenen/gerçekleşen.
set -uo pipefail
BASE="${1:?Kullanım: bash scripts/abuse-probe.sh https://alanadi}"
codes() { sort | uniq -c | tr '\n' ' '; }
echo "Hedef: $BASE"
echo "1) /api/search — sabit sahte XFF ile 65 istek → en az 5 adet 429 bekleniyor"
for i in $(seq 1 65); do curl -s -o /dev/null -m 10 -w "%{http_code}\n" -H "X-Forwarded-For: 203.0.113.9" "$BASE/api/search?q=zz$i$RANDOM&locale=tr"; done | codes; echo
echo "2) /api/search — her istekte FARKLI sahte XFF ile 65 istek → yine 429 bekleniyor (gelmiyorsa IP sahteciliği açığı, K-104)"
for i in $(seq 1 65); do curl -s -o /dev/null -m 10 -w "%{http_code}\n" -H "X-Forwarded-For: 203.0.113.$((i%250))" "$BASE/api/search?q=zy$i$RANDOM&locale=tr"; done | codes; echo
echo "3) /api/analytics/collect — 40 boş gövde → 4xx (doğrulama) ve/veya 429 bekleniyor, 500 OLMAMALI"
for i in $(seq 1 40); do curl -s -o /dev/null -m 10 -w "%{http_code}\n" -X POST -H "Content-Type: application/json" -d '{}' "$BASE/api/analytics/collect"; done | codes; echo
echo "4) /api/errors — 70 istek → 429 bekleniyor"
for i in $(seq 1 70); do curl -s -o /dev/null -m 10 -w "%{http_code}\n" -X POST -H "Content-Type: application/json" -d '{"message":"probe"}' "$BASE/api/errors"; done | codes; echo
echo "5) Cron uçları gizli anahtarsız → 401/403 bekleniyor"
for c in mail heartbeat purge revalidate indexnow rates reviews reminders analytics; do printf "%s:%s " "$c" "$(curl -s -o /dev/null -m 10 -w '%{http_code}' "$BASE/api/cron/$c")"; done; echo
echo "6) Büyük gövde (1 MB) → 413/400 bekleniyor, 500 OLMAMALI"
head -c 1000000 /dev/zero | tr '\0' 'a' > /tmp/big.txt; printf "errors:%s " "$(curl -s -o /dev/null -m 20 -w '%{http_code}' -X POST -H 'Content-Type: application/json' --data-binary @/tmp/big.txt "$BASE/api/errors")"; printf "collect:%s\n" "$(curl -s -o /dev/null -m 20 -w '%{http_code}' -X POST -H 'Content-Type: application/json' --data-binary @/tmp/big.txt "$BASE/api/analytics/collect")"
echo "7) Rastgele 20 adres (404 maliyeti) — hepsi 404, süre makul olmalı"
t0=$(date +%s); for i in $(seq 1 20); do curl -s -o /dev/null -m 10 "$BASE/tr/olmayan-$RANDOM$i"; done; echo "20×404: $(( $(date +%s) - t0 )) sn"
echo "8) /api/redirects/hit başlıksız → RPC_GATE_SECRET tanımlıysa 401 bekleniyor"
printf "hit:%s\n" "$(curl -s -o /dev/null -m 10 -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"path":"/eski"}' "$BASE/api/redirects/hit")"
echo "9) Doğrudan Supabase RPC (anon anahtar, kapı başlığı YOK) → kapı yapılandırıldıysa 42501/rpc_gate hatası bekleniyor"
if [ -f .env.local ]; then
  SU=$(grep -E '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2- | tr -d '"'); AK=$(grep -E '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2- | tr -d '"')
  if [ -n "$SU" ] && [ -n "$AK" ]; then
    R=$(curl -s -m 15 -X POST "$SU/rest/v1/rpc/submit_lead" -H "apikey: $AK" -H "Authorization: Bearer $AK" -H "Content-Type: application/json" -d '{"p":{"full_name":"Probe","email":"probe@example.com","consent_kvkk":true,"message":"kapı denemesi"}}')
    echo "$R" | grep -q "rpc_gate" && echo "   doğrudan RPC reddedildi (kapı çalışıyor)" || echo "   UYARI: doğrudan RPC kabul edildi → kapı yapılandırılmamış: node --env-file=.env.local scripts/set-rpc-gate.mjs — yanıt: $(echo "$R" | cut -c1-120)"
  else echo "   .env.local'da Supabase URL/anon anahtar yok, atlandı"; fi
else echo "   .env.local yok, atlandı"; fi
echo "Bitti. Beklenenden sapma varsa docs/processes/07-ABUSE-RESISTANCE.md içindeki tabloya bakın."
