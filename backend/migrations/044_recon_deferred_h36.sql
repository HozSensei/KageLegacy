-- Reconnaissance différée : file d'attente matchmaking + résolution H36 + chronique

CREATE TABLE IF NOT EXISTS reconnaissance_registrations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cycle_start_at TIMESTAMP NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  status ENUM('queued', 'matched', 'resolved', 'cancelled') NOT NULL DEFAULT 'queued',
  mission_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  UNIQUE KEY uq_recon_reg_user_cycle (cycle_start_at, user_id),
  INDEX idx_recon_reg_cycle_status (cycle_start_at, status),
  CONSTRAINT fk_recon_reg_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reconnaissance_narrative_segments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mission_id INT UNSIGNED NOT NULL,
  segment_order SMALLINT UNSIGNED NOT NULL,
  block_type ENUM('intro', 'tension', 'action', 'denouement', 'epilogue') NOT NULL,
  unlock_minutes DECIMAL(6, 2) NOT NULL DEFAULT 0,
  text TEXT NOT NULL,
  template_key VARCHAR(128) NULL,
  template_index SMALLINT UNSIGNED NULL,
  template_vars JSON NULL,
  UNIQUE KEY uq_recon_segment_order (mission_id, segment_order),
  INDEX idx_recon_mission_unlock (mission_id, unlock_minutes),
  CONSTRAINT fk_recon_narrative_mission FOREIGN KEY (mission_id) REFERENCES reconnaissance_missions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE reconnaissance_registrations
  ADD CONSTRAINT fk_recon_reg_mission FOREIGN KEY (mission_id) REFERENCES reconnaissance_missions(id) ON DELETE SET NULL;
