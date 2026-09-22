#!/bin/bash
# Siteyi birkaç kişiyle paylaşmak için: üretim derlemesi + Cloudflare hızlı tüneli (hesapsız).
#
#   bash scripts/share-tunnel.sh start    # tüneli açar, adresi yazar (.share/url)
#   bash scripts/share-tunnel.sh rebuild  # ADRESİ DEĞİŞTİRMEDEN siteyi yeniden derleyip sunucuyu yeniler (kod/içerik güncellemesi)
#   bash scripts/share-tunnel.sh status   # adres + işlemler çalışıyor mu
#   bash scripts/share-tunnel.sh stop     # kapatır
#
# · Adres, tünel işlemi yaşadıkça SABİTTİR; işlem/bilgisayar kapanırsa yeni adres üretilir (kalıcı adres = alan adı + adlandırılmış tünel).
# · Ayrı derleme klasörü (.next-share) ve port (3400): dev sunucusu, E2E ve `npm run build` paylaşılan siteyi etkilemez.
# · caffeinate: tünel açıkken Mac uyumaz (prizdeyken). Site GERÇEK veritabanına bağlıdır; noindex başlığı açıktır.
set -euo pipefail
cd "$(dirname "$0")/.."
PORT=3400
DIR=.share
mkdir -p "$DIR"

alive() { [ -f "$DIR/$1.pid" ] && kill -0 "$(cat "$DIR/$1.pid")" 2>/dev/null; }

case "${1:-status}" in
  start)
    if alive tunnel && alive server; then echo "Zaten açık: $(cat "$DIR/url")"; exit 0; fi
    "$0" stop >/dev/null 2>&1 || true
    : > "$DIR/tunnel.log"
    nohup cloudflared tunnel --no-autoupdate --url "http://localhost:$PORT" > "$DIR/tunnel.log" 2>&1 &
    echo $! > "$DIR/tunnel.pid"
    for _ in $(seq 1 60); do
      URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$DIR/tunnel.log" | head -1 || true)
      [ -n "${URL:-}" ] && break
      sleep 1
    done
    [ -n "${URL:-}" ] || { echo "Tünel adresi alınamadı (bkz. $DIR/tunnel.log)"; exit 1; }
    echo "$URL" > "$DIR/url"
    echo "Adres: $URL — derleniyor…"
    # Adres derlemeye gömülür (canonical, e-posta bağlantıları); sırlar .env.local'dan okunur
    NEXT_DIST_DIR=.next-share NEXT_PUBLIC_SITE_URL="$URL" npx next build > "$DIR/build.log" 2>&1 || { echo "Derleme başarısız (bkz. $DIR/build.log)"; exit 1; }
    NEXT_DIST_DIR=.next-share NEXT_PUBLIC_SITE_URL="$URL" nohup npx next start -p "$PORT" > "$DIR/server.log" 2>&1 &
    echo $! > "$DIR/server.pid"
    nohup caffeinate -s -w "$(cat "$DIR/tunnel.pid")" >/dev/null 2>&1 &
    for _ in $(seq 1 40); do curl -s -o /dev/null "http://localhost:$PORT/tr" && break; sleep 1; done
    echo "Hazır: $URL"
    ;;
  rebuild)
    alive tunnel || { echo "Tünel kapalı; önce: bash scripts/share-tunnel.sh start"; exit 1; }
    URL=$(cat "$DIR/url")
    NEXT_DIST_DIR=.next-share-new NEXT_PUBLIC_SITE_URL="$URL" npx next build > "$DIR/build.log" 2>&1 || { echo "Derleme başarısız (bkz. $DIR/build.log)"; exit 1; }
    alive server && kill "$(cat "$DIR/server.pid")" 2>/dev/null || true
    pkill -f "next start -p $PORT" 2>/dev/null || true
    sleep 1
    # Finder .DS_Store yazınca rm/mv yarışı: hedef boş değilse yeniden dene
    for _ in 1 2 3; do rm -rf .next-share; mv .next-share-new .next-share 2>/dev/null && break; sleep 1; done
    [ -f .next-share/BUILD_ID ] || { echo "Derleme taşınamadı (.next-share-new → .next-share)"; exit 1; }
    NEXT_DIST_DIR=.next-share NEXT_PUBLIC_SITE_URL="$URL" nohup npx next start -p "$PORT" > "$DIR/server.log" 2>&1 &
    echo $! > "$DIR/server.pid"
    for _ in $(seq 1 40); do curl -s -o /dev/null "http://localhost:$PORT/tr" && break; sleep 1; done
    echo "Güncellendi: $URL"
    ;;
  stop)
    for n in server tunnel; do alive "$n" && kill "$(cat "$DIR/$n.pid")" 2>/dev/null || true; rm -f "$DIR/$n.pid"; done
    pkill -f "next start -p $PORT" 2>/dev/null || true
    echo "Kapatıldı."
    ;;
  status)
    echo "adres : $(cat "$DIR/url" 2>/dev/null || echo yok)"
    alive tunnel && echo "tünel : çalışıyor" || echo "tünel : KAPALI"
    alive server && echo "sunucu: çalışıyor" || echo "sunucu: KAPALI"
    ;;
esac
