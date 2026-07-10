-- Dossier d'opération : posture de préparation par cycle

CREATE TABLE IF NOT EXISTS operation_dossiers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  pool_id INT UNSIGNED NOT NULL,
  season_cycle INT UNSIGNED NOT NULL,
  operation_posture ENUM('balanced', 'offensive', 'tank', 'protect') NOT NULL DEFAULT 'balanced',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_od_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_od_pool FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
  UNIQUE KEY uq_od_user_pool_cycle (user_id, pool_id, season_cycle)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
