-- Clans joueurs (alliance coopérative) + renommage notifications

RENAME TABLE dojo_notifications TO sensei_notifications;

CREATE TABLE IF NOT EXISTS player_clans (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  invite_code VARCHAR(12) NOT NULL,
  leader_user_id INT UNSIGNED NOT NULL,
  well_drops SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  well_capacity SMALLINT UNSIGNED NOT NULL DEFAULT 50,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_player_clan_invite (invite_code),
  CONSTRAINT fk_player_clan_leader FOREIGN KEY (leader_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS player_clan_members (
  clan_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (clan_id, user_id),
  UNIQUE KEY uq_player_clan_member_user (user_id),
  CONSTRAINT fk_pcm_clan FOREIGN KEY (clan_id) REFERENCES player_clans(id) ON DELETE CASCADE,
  CONSTRAINT fk_pcm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS clan_academy_board (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clan_id INT UNSIGNED NOT NULL,
  poster_user_id INT UNSIGNED NOT NULL,
  source_draw_id INT UNSIGNED NULL,
  cycle_start_at TIMESTAMP NOT NULL,
  candidate_json JSON NOT NULL,
  price INT UNSIGNED NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  recruited_by_user_id INT UNSIGNED NULL,
  recruited_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_clan_board_clan_active (clan_id, recruited_by_user_id, expires_at),
  CONSTRAINT fk_cab_clan FOREIGN KEY (clan_id) REFERENCES player_clans(id) ON DELETE CASCADE,
  CONSTRAINT fk_cab_poster FOREIGN KEY (poster_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cab_recruiter FOREIGN KEY (recruited_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE sensei
  ADD COLUMN clan_board_recommended_cycle TIMESTAMP NULL AFTER academy_jackpot_token;

ALTER TABLE sensei_notifications
  MODIFY kind ENUM('bird_flight', 'market_sale', 'mission_report', 'stagnation', 'clan_well_fusion') NOT NULL;
