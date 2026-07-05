-- M7 — Vol d'Oiseau : inscription cérémonie + notifications dojo

ALTER TABLE ninjas
  ADD COLUMN bird_flight_requested BOOLEAN NOT NULL DEFAULT FALSE AFTER chunin_exam_requested;

CREATE TABLE IF NOT EXISTS dojo_notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  kind ENUM('bird_flight') NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dismissed_at TIMESTAMP NULL,
  CONSTRAINT fk_dojo_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_dojo_notif_user_pending (user_id, dismissed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
