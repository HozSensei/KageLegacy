-- Deck d'opération : techniques par ninja + 5 éléments d'escouade (cartes tactiques)

CREATE TABLE IF NOT EXISTS operation_decks (
  user_id INT UNSIGNED NOT NULL,
  season_cycle INT NOT NULL,
  techniques_json JSON NOT NULL COMMENT '{"ninjaId":{"primary":"taijutsu","secondary":"ninjutsu"}}',
  element_card_ids_json JSON NOT NULL COMMENT '[user_tactic_card_id,...] max 5',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, season_cycle),
  CONSTRAINT fk_operation_decks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
