-- Milestone 8 : Pools de frontière, classement et calendrier

CREATE TABLE IF NOT EXISTS pools (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  division_level TINYINT UNSIGNED NOT NULL DEFAULT 5 COMMENT '5 = Division V (bas), 1 = élite',
  season_number INT UNSIGNED NOT NULL DEFAULT 1,
  current_cycle TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1-10 dans la saison',
  status ENUM('active', 'completed', 'archived') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pool_members (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pool_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pool_user (pool_id, user_id),
  UNIQUE KEY uq_user_single_pool (user_id),
  CONSTRAINT fk_pm_pool FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
  CONSTRAINT fk_pm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pool_standings (
  pool_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  points INT UNSIGNED NOT NULL DEFAULT 0,
  played INT UNSIGNED NOT NULL DEFAULT 0,
  wins INT UNSIGNED NOT NULL DEFAULT 0,
  draws INT UNSIGNED NOT NULL DEFAULT 0,
  losses INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (pool_id, user_id),
  CONSTRAINT fk_ps_pool FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
  CONSTRAINT fk_ps_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS matches (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pool_id INT UNSIGNED NOT NULL,
  season_cycle TINYINT UNSIGNED NOT NULL COMMENT '1-10',
  home_user_id INT UNSIGNED NOT NULL,
  away_user_id INT UNSIGNED NOT NULL,
  status ENUM('scheduled', 'simulated', 'revealing', 'applied') NOT NULL DEFAULT 'scheduled',
  result ENUM('pending', 'home_win', 'away_win', 'draw') NOT NULL DEFAULT 'pending',
  home_score TINYINT UNSIGNED NULL,
  away_score TINYINT UNSIGNED NULL,
  winner_user_id INT UNSIGNED NULL,
  ending_tour TINYINT UNSIGNED NULL,
  simulated_at TIMESTAMP NULL,
  results_applied_at TIMESTAMP NULL,
  INDEX idx_match_pool_cycle (pool_id, season_cycle),
  CONSTRAINT fk_match_pool FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
  CONSTRAINT fk_match_home FOREIGN KEY (home_user_id) REFERENCES users(id),
  CONSTRAINT fk_match_away FOREIGN KEY (away_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
