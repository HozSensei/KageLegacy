-- Invitations PvP privées partageables par code, valables 30 minutes.
CREATE TABLE IF NOT EXISTS pvp_invites (
  code CHAR(8) PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  player_level SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  deck_id INT UNSIGNED NULL,
  level_window TINYINT UNSIGNED NOT NULL DEFAULT 3,
  status ENUM('pending', 'accepted', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
  match_id VARCHAR(36) NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_pvp_invites_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_pvp_invites_user_status (user_id, status),
  INDEX idx_pvp_invites_expiry (status, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
