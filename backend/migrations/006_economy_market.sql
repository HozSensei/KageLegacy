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
  'Affûtée pour canaliser le ninjutsu en mêlée.',
  'Honed to channel ninjutsu in close strikes.',
  1200,
  JSON_OBJECT('attackStat', 'ninjutsu', 'attackBonus', 2)
),
(
  'kunai-renforcee',
  'weapon',
  'Kunai renforcée',
  'Reinforced Kunai',
  'Lames lourdes qui renforcent les frappes de taijutsu.',
  'Heavy blades that empower taijutsu strikes.',
  900,
  JSON_OBJECT('attackStat', 'taijutsu', 'attackBonus', 2)
),
(
  'masque-illusion',
  'weapon',
  'Masque d''illusion',
  'Illusion Mask',
  'Amplifie la projection genjutsu au moment de l''assaut.',
  'Amplifies genjutsu projection during assault.',
  1100,
  JSON_OBJECT('attackStat', 'genjutsu', 'attackBonus', 2)
),
(
  'gilet-mailles',
  'armor',
  'Gilet tactique en mailles',
  'Tactical Mesh Vest',
  'Renforce la constitution au combat (+30 PV de match).',
  'Bolsters constitution in combat (+30 match HP).',
  1400,
  JSON_OBJECT('matchPvBonus', 30, 'defenseStat', 'taijutsu', 'defenseBonus', 1)
),
(
  'brassards-doton',
  'armor',
  'Brassards de Doton',
  'Doton Bracers',
  'Ancrage défensif : +1 ninjutsu en parade.',
  'Defensive anchor: +1 ninjutsu when defending.',
  1000,
  JSON_OBJECT('matchPvBonus', 15, 'defenseStat', 'ninjutsu', 'defenseBonus', 1)
),
(
  'bandeau-focus',
  'armor',
  'Bandeau de focus',
  'Focus Headband',
  'Stabilise l''esprit : +20 PV et +1 genjutsu en défense.',
  'Steadies the mind: +20 HP and +1 genjutsu on defense.',
  950,
  JSON_OBJECT('matchPvBonus', 20, 'defenseStat', 'genjutsu', 'defenseBonus', 1)
),
(
  'pilule-soldat',
  'consumable',
  'Pilule du Soldat',
  'Soldier Pill',
  'Usage unique : restaure 20 chakra si la réserve tombe sous 15 % en match.',
  'Single use: restores 20 chakra if reserves drop below 15% in a match.',
  600,
  JSON_OBJECT('consumable', JSON_OBJECT('trigger', 'chakra_below_pct', 'threshold', 15, 'chakraRestore', 20))
),
(
  'herbes-soin',
  'consumable',
  'Herbes de soin',
  'Healing Herbs',
  'Usage unique : regagne 25 PV si les PV tombent sous 20 % en match.',
  'Single use: recovers 25 HP if health drops below 20% in a match.',
  550,
  JSON_OBJECT('consumable', JSON_OBJECT('trigger', 'pv_below_pct', 'threshold', 20, 'pvRestore', 25))
),
(
  'parchemin-fumee',
  'consumable',
  'Parchemin de fumée',
  'Smoke Scroll',
  'Usage unique : +1 vitesse tactique au premier tour du match.',
  'Single use: +1 tactical speed on the first round of a match.',
  500,
  JSON_OBJECT('consumable', JSON_OBJECT('trigger', 'match_start', 'firstTourSpeedBonus', 1))
);
