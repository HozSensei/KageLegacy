-- Rétention : Sceau de Chakra quotidien, Académie rotative 3 aspirants, Parchemins d'héritage

ALTER TABLE sensei
  ADD COLUMN last_daily_seal_grant_date DATE NULL AFTER scout_env_confirmed_cycle,
  ADD COLUMN academy_last_rotation_date DATE NULL AFTER last_daily_seal_grant_date,
  ADD COLUMN academy_jackpot_token TINYINT(1) NOT NULL DEFAULT 0 AFTER academy_last_rotation_date;

CREATE TABLE IF NOT EXISTS heritage_scrolls (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  ninja_name VARCHAR(128) NOT NULL,
  dominant_stat ENUM('taijutsu', 'ninjutsu', 'genjutsu', 'medecine') NOT NULL,
  peak_value TINYINT UNSIGNED NOT NULL,
  bonus_type VARCHAR(32) NOT NULL,
  bonus_percent DECIMAL(5, 2) NOT NULL,
  departed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_heritage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_heritage_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO item_definitions (slug, category, name_fr, name_en, description_fr, description_en, price, effects) VALUES
(
  'sceau-chakra',
  'bureau',
  'Sceau de Chakra',
  'Chakra Seal',
  'Rituel quotidien : brisez le sceau au Bureau pour révéler une récompense surprise.',
  'Daily ritual: break the seal at the Bureau to reveal a surprise reward.',
  0,
  JSON_OBJECT('bureau', JSON_OBJECT('trigger', 'chakra_seal'))
);

-- Académie rotative : 3 aspirants permanents (slot 0 = plus récent, 2 = plus ancien)
ALTER TABLE academy_draws
  ADD COLUMN slot_index TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER user_id,
  ADD COLUMN spawned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER purchased;

UPDATE academy_draws SET spawned_at = COALESCE(created_at, UTC_TIMESTAMP());

DELETE ad1 FROM academy_draws ad1
INNER JOIN academy_draws ad2
  ON ad1.user_id = ad2.user_id
  AND ad1.id < ad2.id;

UPDATE academy_draws SET slot_index = 0 WHERE slot_index = 0;

ALTER TABLE academy_draws
  DROP INDEX uq_academy_user_cycle,
  DROP COLUMN cycle_start_at,
  ADD UNIQUE KEY uq_academy_user_slot (user_id, slot_index);
