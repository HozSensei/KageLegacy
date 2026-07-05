-- Milestone 6 : segments narratifs de la chronique d'opération

CREATE TABLE IF NOT EXISTS match_narrative_segments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  match_id INT UNSIGNED NOT NULL,
  segment_order SMALLINT UNSIGNED NOT NULL,
  block_type ENUM('intro', 'tension', 'action', 'denouement', 'epilogue') NOT NULL,
  unlock_minutes DECIMAL(6, 2) NOT NULL COMMENT 'Minutes après reveal_start_at',
  text TEXT NOT NULL,
  UNIQUE KEY uq_match_segment_order (match_id, segment_order),
  INDEX idx_match_unlock (match_id, unlock_minutes),
  CONSTRAINT fk_mns_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
