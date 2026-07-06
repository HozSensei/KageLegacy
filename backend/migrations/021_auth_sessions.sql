-- Auth multi-joueurs : mots de passe et sessions

ALTER TABLE users
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER username;

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_session_token (token_hash),
  KEY idx_session_user (user_id),
  KEY idx_session_expires (expires_at),
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
