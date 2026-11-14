-- Kage Legacy V2 — Battle Pass (Phase 6)
-- Saisons, progression joueur, quêtes, cosmétiques

CREATE TABLE IF NOT EXISTS battle_pass_seasons (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  season_number INT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  theme VARCHAR(50) NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  max_level INT UNSIGNED NOT NULL DEFAULT 50,
  base_xp_per_level INT UNSIGNED NOT NULL DEFAULT 1000,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  rewards_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_bp_season_number UNIQUE (season_number),
  INDEX idx_bp_seasons_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_battle_pass (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  season_id INT UNSIGNED NOT NULL,
  current_level INT UNSIGNED NOT NULL DEFAULT 0,
  current_xp INT UNSIGNED NOT NULL DEFAULT 0,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  premium_purchased_at TIMESTAMP NULL,
  claimed_rewards_json JSON NOT NULL,
  missions_completed INT UNSIGNED NOT NULL DEFAULT 0,
  combats_won INT UNSIGNED NOT NULL DEFAULT 0,
  cards_obtained INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ubp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ubp_season FOREIGN KEY (season_id) REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  CONSTRAINT uq_user_season UNIQUE (user_id, season_id),
  INDEX idx_ubp_user (user_id),
  INDEX idx_ubp_season (season_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS battle_pass_quests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  season_id INT UNSIGNED NOT NULL,
  quest_type ENUM('daily', 'weekly', 'milestone') NOT NULL,
  quest_key VARCHAR(100) NOT NULL,
  description_fr TEXT NOT NULL,
  description_en TEXT NOT NULL,
  goal_value INT UNSIGNED NOT NULL,
  xp_reward INT UNSIGNED NOT NULL,
  bonus_reward_json JSON NULL,
  available_from TIMESTAMP NOT NULL,
  available_until TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bpq_season FOREIGN KEY (season_id) REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  INDEX idx_bpq_season_type (season_id, quest_type),
  INDEX idx_bpq_window (available_from, available_until),
  INDEX idx_bpq_key (quest_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_battle_pass_quests (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  quest_id INT UNSIGNED NOT NULL,
  current_progress INT UNSIGNED NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ubpq_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ubpq_quest FOREIGN KEY (quest_id) REFERENCES battle_pass_quests(id) ON DELETE CASCADE,
  CONSTRAINT uq_user_quest UNIQUE (user_id, quest_id),
  INDEX idx_ubpq_user (user_id),
  INDEX idx_ubpq_quest (quest_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_cosmetics (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  cosmetic_type ENUM('avatar', 'card_back', 'emote', 'card_effect') NOT NULL,
  cosmetic_key VARCHAR(100) NOT NULL,
  season_obtained INT UNSIGNED NULL,
  obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ucos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ucos_season FOREIGN KEY (season_obtained) REFERENCES battle_pass_seasons(id) ON DELETE SET NULL,
  CONSTRAINT uq_user_cosmetic UNIQUE (user_id, cosmetic_type, cosmetic_key),
  INDEX idx_ucos_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
