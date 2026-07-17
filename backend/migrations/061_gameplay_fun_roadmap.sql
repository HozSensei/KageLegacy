-- Gameplay fun roadmap : onboarding, objectifs de cycle, rumeur mid-cycle, rivalités

ALTER TABLE sensei
  ADD COLUMN onboarding_deck_done TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN onboarding_mission_done TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN onboarding_dismissed TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN midcycle_rumor_cycle INT UNSIGNED NULL;

CREATE TABLE IF NOT EXISTS sensei_cycle_objectives (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  pool_id INT UNSIGNED NOT NULL,
  season_cycle INT UNSIGNED NOT NULL,
  objective_key VARCHAR(40) NOT NULL,
  target_value INT UNSIGNED NOT NULL DEFAULT 1,
  progress_value INT UNSIGNED NOT NULL DEFAULT 0,
  status ENUM('active', 'completed', 'expired') NOT NULL DEFAULT 'active',
  reward_ryos INT UNSIGNED NOT NULL DEFAULT 150,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  UNIQUE KEY uq_sensei_cycle_objective (user_id, pool_id, season_cycle, objective_key),
  KEY idx_cycle_obj_user (user_id, status),
  CONSTRAINT fk_cycle_obj_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_cycle_obj_pool FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sensei_rivalries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  rival_user_id INT UNSIGNED NOT NULL,
  pool_id INT UNSIGNED NOT NULL,
  consecutive_losses INT UNSIGNED NOT NULL DEFAULT 0,
  is_nemesis TINYINT(1) NOT NULL DEFAULT 0,
  last_result ENUM('win', 'draw', 'loss') NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sensei_rival (user_id, rival_user_id, pool_id),
  KEY idx_rival_nemesis (user_id, is_nemesis),
  CONSTRAINT fk_rival_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rival_rival FOREIGN KEY (rival_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_rival_pool FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    'reconnaissance_result',
    'training_billing',
    'scout_roster',
    'operation_start',
    'cycle_close',
    'upset',
    'rivalry_nemesis',
    'cycle_objective'
  ) NOT NULL;
