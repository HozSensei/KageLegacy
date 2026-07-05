-- Milestone 4 : économie, marché noir, inventaire, missions idle

CREATE TABLE IF NOT EXISTS item_definitions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  category ENUM('weapon', 'armor', 'consumable') NOT NULL,
  name_fr VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description_fr TEXT NOT NULL,
  description_en TEXT NOT NULL,
  price INT UNSIGNED NOT NULL,
  effects JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS market_offers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  cycle_start_at TIMESTAMP NOT NULL,
  item_definition_id INT UNSIGNED NOT NULL,
  slot_index TINYINT UNSIGNED NOT NULL COMMENT '0-2',
  purchased BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE KEY uq_market_user_cycle_slot (user_id, cycle_start_at, slot_index),
  CONSTRAINT fk_mo_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_mo_item FOREIGN KEY (item_definition_id) REFERENCES item_definitions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  item_definition_id INT UNSIGNED NOT NULL,
  acquired_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  consumed BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_ui_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ui_item FOREIGN KEY (item_definition_id) REFERENCES item_definitions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ninja_equipment (
  ninja_id INT UNSIGNED NOT NULL,
  slot ENUM('gear', 'consumable') NOT NULL,
  user_item_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (ninja_id, slot),
  UNIQUE KEY uq_user_item_equipped (user_item_id),
  CONSTRAINT fk_ne_ninja FOREIGN KEY (ninja_id) REFERENCES ninjas(id) ON DELETE CASCADE,
  CONSTRAINT fk_ne_user_item FOREIGN KEY (user_item_id) REFERENCES user_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS idle_missions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  ninja_id INT UNSIGNED NOT NULL,
  cycle_start_at TIMESTAMP NOT NULL,
  mission_rank ENUM('D', 'C', 'B') NOT NULL,
  send_cost INT UNSIGNED NOT NULL DEFAULT 0,
  reward_amount INT UNSIGNED NOT NULL,
  status ENUM('active', 'completed', 'failed', 'collected') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  UNIQUE KEY uq_mission_ninja_cycle (ninja_id, cycle_start_at),
  CONSTRAINT fk_im_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_im_ninja FOREIGN KEY (ninja_id) REFERENCES ninjas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE sensei
  ADD COLUMN salary_debt BOOLEAN NOT NULL DEFAULT FALSE AFTER ryos;

INSERT INTO item_definitions (slug, category, name_fr, name_en, description_fr, description_en, price, effects) VALUES
(
  'lame-chakra',
  'weapon',
  'Lame de Chakra',
  'Chakra Blade',
  'Consigne Offensive uniquement : +2 Ninjutsu quand ce ninja attaque en ninjutsu.',
  'Offensive orders only: +2 Ninjutsu when this ninja attacks with ninjutsu.',
  1100,
  JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'attack', 'stat', 'ninjutsu', 'bonus', 2, 'when', JSON_OBJECT('strategy', 'Offensive', 'technique', 'ninjutsu'))
    )
  )
),
(
  'kunai-renforcee',
  'weapon',
  'Kunai renforcée',
  'Reinforced Kunai',
  'Consigne Offensive uniquement : +2 Taijutsu sur les frappes corps à corps.',
  'Offensive orders only: +2 Taijutsu on taijutsu strikes.',
  850,
  JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'attack', 'stat', 'taijutsu', 'bonus', 2, 'when', JSON_OBJECT('strategy', 'Offensive', 'technique', 'taijutsu'))
    )
  )
),
(
  'masque-illusion',
  'weapon',
  'Masque d''illusion',
  'Illusion Mask',
  'Techniques Genjutsu uniquement : +1 Genjutsu à l''assaut.',
  'Genjutsu techniques only: +1 Genjutsu on assault.',
  950,
  JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'attack', 'stat', 'genjutsu', 'bonus', 1, 'when', JSON_OBJECT('technique', 'genjutsu'))
    )
  )
),
(
  'gilet-mailles',
  'armor',
  'Gilet tactique en mailles',
  'Tactical Mesh Vest',
  'Consigne Tank uniquement : +15 PV de match.',
  'Tank orders only: +15 match HP.',
  1200,
  JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'pv', 'bonus', 15, 'when', JSON_OBJECT('strategy', 'Tank'))
    )
  )
),
(
  'gants-pare-feu',
  'armor',
  'Gants pare-feu',
  'Fireproof Gloves',
  'Réduit les dégâts subis via Ninjutsu Katon adverse (+2 en défense élémentaire).',
  'Reduces damage taken from enemy Katon ninjutsu (+2 elemental defense).',
  1050,
  JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'element_resist', 'element', 'Katon', 'bonus', 2)
    )
  )
),
(
  'bandeau-focus',
  'armor',
  'Bandeau de focus',
  'Focus Headband',
  'Consigne Protect uniquement : +1 Genjutsu en défense.',
  'Protect orders only: +1 Genjutsu when defending.',
  900,
  JSON_OBJECT(
    'modifiers', JSON_ARRAY(
      JSON_OBJECT('kind', 'defense', 'stat', 'genjutsu', 'bonus', 1, 'when', JSON_OBJECT('strategy', 'Protect'))
    )
  )
),
(
  'pilule-soldat',
  'consumable',
  'Pilule du Soldat',
  'Soldier Pill',
  'Usage unique : +15 Chakra si la réserve tombe sous 12 % en match.',
  'Single use: +15 Chakra if reserves drop below 12% in a match.',
  550,
  JSON_OBJECT(
    'consumable', JSON_OBJECT('trigger', 'chakra_below_pct', 'threshold', 12, 'chakraRestore', 15)
  )
),
(
  'herbes-soin',
  'consumable',
  'Herbes de soin',
  'Healing Herbs',
  'Usage unique : +18 PV si les PV tombent sous 15 % en match.',
  'Single use: +18 HP if health drops below 15% in a match.',
  500,
  JSON_OBJECT(
    'consumable', JSON_OBJECT('trigger', 'pv_below_pct', 'threshold', 15, 'pvRestore', 18)
  )
),
(
  'parchemin-fumee',
  'consumable',
  'Parchemin de fumée',
  'Smoke Scroll',
  'Usage unique : +2 Vitesse au tour 1 (inefficace en consigne Tank).',
  'Single use: +2 Speed on round 1 (no effect under Tank orders).',
  450,
  JSON_OBJECT(
    'consumable', JSON_OBJECT(
      'trigger', 'match_start',
      'firstTourSpeedBonus', 2,
      'when', JSON_OBJECT('strategyNot', 'Tank')
    )
  )
);
