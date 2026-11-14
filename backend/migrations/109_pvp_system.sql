-- Kage Legacy V2 — PvP Host architecture (matchmaking ± niveau)
-- Namespace pvp_* : file d'attente + matches (pas d'autorité continue serveur)

CREATE TABLE IF NOT EXISTS pvp_queue (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  player_level SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  deck_id INT UNSIGNED NULL,
  level_window TINYINT UNSIGNED NOT NULL DEFAULT 3 COMMENT 'Fenêtre ±N niveaux',
  status ENUM('waiting', 'matched', 'cancelled') NOT NULL DEFAULT 'waiting',
  matched_match_id VARCHAR(36) NULL,
  enqueued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_pvp_queue_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_pvp_queue_waiting (status, player_level, enqueued_at),
  INDEX idx_pvp_queue_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pvp_matches (
  id VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
  host_user_id INT UNSIGNED NOT NULL,
  guest_user_id INT UNSIGNED NOT NULL,
  host_level SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  guest_level SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  level_window TINYINT UNSIGNED NOT NULL DEFAULT 3,

  status ENUM('pending', 'ready', 'in_progress', 'completed', 'cancelled', 'forfeited')
    NOT NULL DEFAULT 'pending',

  -- Seed déterministe pour shuffle / crits côté Host
  seed VARCHAR(64) NOT NULL,
  host_deck_id INT UNSIGNED NULL,
  guest_deck_id INT UNSIGNED NULL,

  -- Snapshot bootstrap (fighters + cartes runtime) — source initiale uniquement
  bootstrap_json JSON NOT NULL,

  host_ready TINYINT(1) NOT NULL DEFAULT 0,
  guest_ready TINYINT(1) NOT NULL DEFAULT 0,

  winner_user_id INT UNSIGNED NULL,
  winner_seat ENUM('host', 'guest') NULL,
  end_reason VARCHAR(40) NULL COMMENT 'hp|forfeit|report|timeout',

  -- Anti-triche MVP : trust-host + checksums / résumé
  anti_cheat_mode VARCHAR(32) NOT NULL DEFAULT 'trust_host',
  host_checksum VARCHAR(32) NULL,
  guest_checksum VARCHAR(32) NULL,
  result_summary_json JSON NULL,

  started_at TIMESTAMP NULL,
  ended_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_pvp_matches_host FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_pvp_matches_guest FOREIGN KEY (guest_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_pvp_matches_host (host_user_id, status),
  INDEX idx_pvp_matches_guest (guest_user_id, status),
  INDEX idx_pvp_matches_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
