-- K-116 · Kendi giriş sistemimiz (Supabase Auth yerine). Jetonların yalnız SHA-256 özeti saklanır: veritabanı sızsa bile
-- oturum/bağlantı kullanılamaz. Şifre özeti users.password_hash (scrypt, core/db/mysql/authStore.ts).
SET NAMES utf8mb4;

CREATE TABLE auth_sessions (
  id UUID NOT NULL DEFAULT UUID_v4(),
  user_id UUID NOT NULL,
  token_hash CHAR(64) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  last_used_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expires_at DATETIME(6) NOT NULL,
  user_agent VARCHAR(300) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY auth_sessions_token_uq (token_hash),
  KEY auth_sessions_user_idx (user_id),
  CONSTRAINT auth_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Tek kullanımlık e-posta bağlantıları: şifre sıfırlama, davet/sihirli bağlantı, kayıt doğrulama, e-posta değişikliği
CREATE TABLE auth_tokens (
  id UUID NOT NULL DEFAULT UUID_v4(),
  purpose VARCHAR(20) NOT NULL,
  user_id UUID NOT NULL,
  token_hash CHAR(64) NOT NULL,
  new_email VARCHAR(254) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expires_at DATETIME(6) NOT NULL,
  used_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY auth_tokens_token_uq (token_hash),
  KEY auth_tokens_user_idx (user_id, purpose),
  CONSTRAINT auth_tokens_purpose_check CHECK (purpose IN ('recovery', 'invite', 'signup', 'email_change', 'magiclink')),
  CONSTRAINT auth_tokens_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- Kaba kuvvet ve e-posta bombardımanı sınırı (K-104): giriş denemesi ve bağlantı isteği sayımı
CREATE TABLE auth_attempts (
  id BIGINT NOT NULL AUTO_INCREMENT,
  kind VARCHAR(20) NOT NULL,
  email VARCHAR(254) NULL,
  ip VARCHAR(45) NULL,
  ok BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY auth_attempts_email_idx (kind, email, created_at),
  KEY auth_attempts_ip_idx (kind, ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
