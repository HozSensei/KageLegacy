-- Marché aspirants (1 achat max / cycle, fenêtre H0–H12)

CREATE TABLE IF NOT EXISTS recruitment_offers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  cycle_start_at TIMESTAMP NOT NULL,
  slot_index TINYINT UNSIGNED NOT NULL COMMENT '0-2',
  candidate_json JSON NOT NULL,
  price INT UNSIGNED NOT NULL,
  purchased BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_recruitment_user_cycle_slot (user_id, cycle_start_at, slot_index),
  CONSTRAINT fk_recruitment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
