-- Mission de reconnaissance : combat d'entraînement H36–H70 (matchmaking, défis, bot)

CREATE TABLE IF NOT EXISTS reconnaissance_challenges (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cycle_start_at TIMESTAMP NOT NULL,
  challenger_user_id INT UNSIGNED NOT NULL,
  defender_user_id INT UNSIGNED NOT NULL,
  status ENUM('pending', 'accepted', 'declined', 'cancelled', 'expired') NOT NULL DEFAULT 'pending',
  mission_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  INDEX idx_recon_challenge_cycle (cycle_start_at),
  INDEX idx_recon_challenge_defender (defender_user_id, status),
  CONSTRAINT fk_recon_challenger FOREIGN KEY (challenger_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_recon_defender FOREIGN KEY (defender_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reconnaissance_missions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cycle_start_at TIMESTAMP NOT NULL,
  home_user_id INT UNSIGNED NOT NULL,
  away_user_id INT UNSIGNED NOT NULL,
  away_is_bot BOOLEAN NOT NULL DEFAULT FALSE,
  source ENUM('matchmaking', 'challenge') NOT NULL,
  challenge_id INT UNSIGNED NULL,
  result ENUM('home_win', 'away_win', 'draw') NOT NULL,
  winner_user_id INT UNSIGNED NULL,
  environment_slug VARCHAR(64) NULL,
  combat_log JSON NULL,
  home_ryos INT UNSIGNED NOT NULL DEFAULT 0,
  away_ryos INT UNSIGNED NOT NULL DEFAULT 0,
  home_loot JSON NULL,
  away_loot JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recon_mission_cycle (cycle_start_at),
  INDEX idx_recon_mission_home (home_user_id, cycle_start_at),
  INDEX idx_recon_mission_away (away_user_id, cycle_start_at),
  CONSTRAINT fk_recon_mission_home FOREIGN KEY (home_user_id) REFERENCES users(id),
  CONSTRAINT fk_recon_mission_away FOREIGN KEY (away_user_id) REFERENCES users(id),
  CONSTRAINT fk_recon_mission_challenge FOREIGN KEY (challenge_id) REFERENCES reconnaissance_challenges(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE reconnaissance_challenges
  ADD CONSTRAINT fk_recon_challenge_mission FOREIGN KEY (mission_id) REFERENCES reconnaissance_missions(id) ON DELETE SET NULL;

ALTER TABLE sensei_notifications
  MODIFY kind ENUM(
    'bird_flight',
    'market_sale',
    'mission_report',
    'stagnation',
    'clan_well_fusion',
    'chunin_exam_success',
    'chunin_exam_failure',
    'reconnaissance_challenge',
    'reconnaissance_result'
  ) NOT NULL;
