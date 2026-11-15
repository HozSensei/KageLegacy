-- Kage Legacy V2 — Achievement registry (permanent, not daily quests)

CREATE TABLE IF NOT EXISTS user_achievements (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  achievement_key VARCHAR(100) NOT NULL,
  current_progress INT UNSIGNED NOT NULL DEFAULT 0,
  highest_tier INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Highest unlocked tier index (1-based); 0 = none',
  claimed_tiers_json JSON NOT NULL,
  meta_json JSON NULL COMMENT 'streak counters, last sync, etc.',
  first_unlocked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ua_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT uq_user_achievement UNIQUE (user_id, achievement_key),
  INDEX idx_ua_user (user_id),
  INDEX idx_ua_key (achievement_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
