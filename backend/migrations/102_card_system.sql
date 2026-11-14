-- Kage Legacy V2 — Card System
-- Phase 2: Definitions, collection, decks, passive bonuses

-- Catalogue de cartes
CREATE TABLE IF NOT EXISTS card_definitions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(100) NOT NULL,
  name_fr VARCHAR(200) NOT NULL,
  name_en VARCHAR(200) NOT NULL,

  type ENUM('attack', 'defense', 'skill', 'summon', 'item') NOT NULL,
  stat_type ENUM('taijutsu', 'ninjutsu', 'genjutsu', 'medicine') NULL,
  element VARCHAR(20) NULL COMMENT 'katon, suiton, raiton, doton, futon, null',
  rarity ENUM('common', 'rare', 'legendary', 'mythic') NOT NULL,

  base_cost INT NOT NULL DEFAULT 0,
  base_damage INT NOT NULL DEFAULT 0,
  base_block INT NOT NULL DEFAULT 0,
  base_heal INT NOT NULL DEFAULT 0,

  effects_json JSON NULL,
  summon_json JSON NULL,
  exhaust BOOLEAN NOT NULL DEFAULT FALSE,

  -- Bonus passif tant que la carte est dans le deck actif
  passive_bonus_json JSON NULL,
  passive_description_fr TEXT NULL,
  passive_description_en TEXT NULL,

  description_fr TEXT NOT NULL,
  description_en TEXT NOT NULL,
  lore_fr TEXT NULL,
  lore_en TEXT NULL,

  upgradable BOOLEAN NOT NULL DEFAULT TRUE,
  upgrade_bonuses_json JSON NULL,

  image_url VARCHAR(255) NULL,
  artist VARCHAR(100) NOT NULL DEFAULT 'Generated',

  season_introduced INT UNSIGNED NULL,
  is_exclusive BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_card_definitions_slug UNIQUE (slug),
  INDEX idx_card_rarity (rarity),
  INDEX idx_card_type (type),
  INDEX idx_card_element (element),
  INDEX idx_card_stat_type (stat_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Collection du joueur (une ligne par définition ; quantity = copies)
CREATE TABLE IF NOT EXISTS user_card_collection (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  card_definition_id INT UNSIGNED NOT NULL,

  upgrade_level TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0=base, 1=+, 2=++',
  quantity INT UNSIGNED NOT NULL DEFAULT 1,

  obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  obtained_source ENUM('mission', 'booster', 'craft', 'battle_pass', 'event', 'starter', 'grant') NOT NULL DEFAULT 'grant',

  times_played INT UNSIGNED NOT NULL DEFAULT 0,
  total_damage_dealt INT UNSIGNED NOT NULL DEFAULT 0,
  total_block_gained INT UNSIGNED NOT NULL DEFAULT 0,

  CONSTRAINT fk_ucc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ucc_card FOREIGN KEY (card_definition_id) REFERENCES card_definitions(id) ON DELETE CASCADE,
  CONSTRAINT uq_user_card_def UNIQUE (user_id, card_definition_id),
  CONSTRAINT chk_upgrade_level CHECK (upgrade_level BETWEEN 0 AND 2),
  CONSTRAINT chk_ucc_quantity CHECK (quantity >= 1),
  INDEX idx_ucc_user (user_id),
  INDEX idx_ucc_upgrade (upgrade_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Decks du joueur
CREATE TABLE IF NOT EXISTS user_decks (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  archetype ENUM('aggro', 'control', 'combo', 'midrange') NOT NULL DEFAULT 'midrange',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_user_decks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_decks_active (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cartes dans un deck (réf. collection + définition dénormalisée pour les lectures stats)
CREATE TABLE IF NOT EXISTS user_deck_cards (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  deck_id INT UNSIGNED NOT NULL,
  user_card_collection_id INT UNSIGNED NOT NULL,
  card_definition_id INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL DEFAULT 1,
  position INT UNSIGNED NULL,

  CONSTRAINT fk_udc_deck FOREIGN KEY (deck_id) REFERENCES user_decks(id) ON DELETE CASCADE,
  CONSTRAINT fk_udc_collection FOREIGN KEY (user_card_collection_id) REFERENCES user_card_collection(id) ON DELETE CASCADE,
  CONSTRAINT fk_udc_card_def FOREIGN KEY (card_definition_id) REFERENCES card_definitions(id) ON DELETE CASCADE,
  CONSTRAINT uq_deck_collection UNIQUE (deck_id, user_card_collection_id),
  CONSTRAINT chk_udc_quantity CHECK (quantity >= 1),
  INDEX idx_udc_deck (deck_id),
  INDEX idx_udc_card_def (card_definition_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
