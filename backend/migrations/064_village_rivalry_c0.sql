-- Villages C0: appartenance Sensei + scores + rivalites de cycle

ALTER TABLE sensei
  ADD COLUMN village_id ENUM('leaf', 'sand', 'mist', 'stone') NOT NULL DEFAULT 'leaf',
  ADD COLUMN village_retake_used TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN village_title VARCHAR(80) NULL;

CREATE TABLE IF NOT EXISTS village_score_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  village_id ENUM('leaf', 'sand', 'mist', 'stone') NOT NULL,
  cycle_start_at DATETIME NOT NULL,
  action_key VARCHAR(40) NOT NULL,
  points INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_vse_user_cycle (user_id, cycle_start_at),
  KEY idx_vse_village_cycle (village_id, cycle_start_at),
  CONSTRAINT fk_vse_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS village_cycle_totals (
  village_id ENUM('leaf', 'sand', 'mist', 'stone') NOT NULL,
  cycle_start_at DATETIME NOT NULL,
  points INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (village_id, cycle_start_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS village_rivalries (
  cycle_start_at DATETIME NOT NULL PRIMARY KEY,
  village_a ENUM('leaf', 'sand', 'mist', 'stone') NOT NULL,
  village_b ENUM('leaf', 'sand', 'mist', 'stone') NOT NULL,
  winner_village_id ENUM('leaf', 'sand', 'mist', 'stone') NULL,
  resolved_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
