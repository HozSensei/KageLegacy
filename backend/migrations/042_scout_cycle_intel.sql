-- Cycle espionnage : tendances H36, gel compo + rapport H54

ALTER TABLE cycle_job_runs
  MODIFY job_name ENUM('h36', 'h54', 'h71', 'h72') NOT NULL;

CREATE TABLE IF NOT EXISTS cycle_scout_intel (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cycle_start_at TIMESTAMP NOT NULL,
  pool_id INT UNSIGNED NOT NULL,
  viewer_user_id INT UNSIGNED NOT NULL,
  opponent_user_id INT UNSIGNED NOT NULL,
  season_cycle TINYINT UNSIGNED NOT NULL,
  tendencies_json JSON NULL,
  tendencies_sample_size TINYINT UNSIGNED NOT NULL DEFAULT 0,
  tendencies_reliability ENUM('none', 'very_low', 'low', 'medium', 'high') NOT NULL DEFAULT 'none',
  roster_report_json JSON NULL,
  recon_meta_json JSON NULL,
  roster_frozen_at TIMESTAMP NULL,
  tendencies_generated_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_scout_intel_viewer_cycle (cycle_start_at, viewer_user_id, pool_id, season_cycle),
  INDEX idx_scout_intel_opponent (opponent_user_id, cycle_start_at),
  CONSTRAINT fk_scout_intel_viewer FOREIGN KEY (viewer_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_scout_intel_opponent FOREIGN KEY (opponent_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_scout_intel_pool FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
