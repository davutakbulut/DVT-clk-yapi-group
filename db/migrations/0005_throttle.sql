-- K-116 · K-104 istek sınırı sayacı (app_private.throttle karşılığı): veritabanı genelinde, süreçten bağımsız.
-- Pencere başına tek satır; sınır aşılınca RPC P0429 ile reddeder (src/core/db/mysql/rpc/registry.ts → throttle()).
CREATE TABLE throttle (
  `key` VARCHAR(200) NOT NULL,
  window_start DATETIME(6) NOT NULL,
  hits INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`key`, window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
