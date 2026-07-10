-- Cartes tactiques (collection, charges, slot ninja, marché P2P)

CREATE TABLE IF NOT EXISTS tactic_card_definitions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  name_fr VARCHAR(120) NOT NULL,
  name_en VARCHAR(120) NOT NULL,
  description_fr TEXT NOT NULL,
  description_en TEXT NOT NULL,
  rarity ENUM('common', 'rare', 'legendary') NOT NULL DEFAULT 'common',
  card_type ENUM('attack', 'defense', 'support') NOT NULL,
  stat_type ENUM('taijutsu', 'ninjutsu', 'genjutsu', 'medecine') NOT NULL,
  element_affinity ENUM('Katon', 'Suiton', 'Raiton', 'Doton', 'Futon') NULL,
  trigger_kind VARCHAR(48) NOT NULL,
  trigger_params JSON NOT NULL,
  target_kind VARCHAR(48) NOT NULL,
  target_params JSON NOT NULL,
  effect_kind VARCHAR(48) NOT NULL,
  effect_params JSON NOT NULL,
  catalog_price INT UNSIGNED NOT NULL DEFAULT 400,
  narrative_key VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_tactic_cards (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  tactic_card_definition_id INT UNSIGNED NOT NULL,
  charges_remaining TINYINT UNSIGNED NOT NULL DEFAULT 3,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_utc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_utc_def FOREIGN KEY (tactic_card_definition_id) REFERENCES tactic_card_definitions(id) ON DELETE RESTRICT,
  CONSTRAINT chk_utc_charges CHECK (charges_remaining BETWEEN 0 AND 3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_user_tactic_cards_user ON user_tactic_cards (user_id);

CREATE TABLE IF NOT EXISTS ninja_tactic_cards (
  ninja_id INT UNSIGNED NOT NULL PRIMARY KEY,
  user_tactic_card_id INT UNSIGNED NOT NULL UNIQUE,
  CONSTRAINT fk_ntc_ninja FOREIGN KEY (ninja_id) REFERENCES ninjas(id) ON DELETE CASCADE,
  CONSTRAINT fk_ntc_card FOREIGN KEY (user_tactic_card_id) REFERENCES user_tactic_cards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE player_listings
  MODIFY listing_type ENUM('item', 'ninja', 'tactic_card') NOT NULL DEFAULT 'item',
  ADD COLUMN user_tactic_card_id INT UNSIGNED NULL AFTER ninja_id,
  ADD CONSTRAINT fk_pl_tactic_card FOREIGN KEY (user_tactic_card_id) REFERENCES user_tactic_cards(id) ON DELETE CASCADE;

CREATE INDEX idx_player_listings_tactic_card ON player_listings (user_tactic_card_id, status);

INSERT INTO tactic_card_definitions (
  slug, name_fr, name_en, description_fr, description_en,
  rarity, card_type, stat_type, element_affinity,
  trigger_kind, trigger_params, target_kind, target_params, effect_kind, effect_params,
  catalog_price, narrative_key
) VALUES
(
  'tai-parade-ecole',
  'Parade de l''École',
  'Academy Parry',
  'Réduit les dégâts si le porteur est pris pour cible plusieurs fois au même tour.',
  'Reduces damage when the bearer is targeted multiple times in the same turn.',
  'common', 'defense', 'taijutsu', NULL,
  'targeted_twice_same_tour', JSON_OBJECT('minHits', 2),
  'self', JSON_OBJECT(),
  'damage_reduction_pct', JSON_OBJECT('basePct', 0.35, 'statScale', 0.05),
  350, 'card_parry'
),
(
  'med-pansement-rapide',
  'Pansement de terrain',
  'Field Dressing',
  'Soigne l''allié le plus blessé si ses PV tombent sous 50 %.',
  'Heals the most wounded ally when their HP drops below 50%.',
  'common', 'support', 'medecine', NULL,
  'ally_below_pv_pct', JSON_OBJECT('threshold', 50),
  'ally_lowest_pv', JSON_OBJECT(),
  'heal_flat', JSON_OBJECT('base', 12, 'statScale', 1.2),
  380, 'card_field_heal'
),
(
  'nin-eclair-discret',
  'Éclair discret',
  'Subtle Bolt',
  'Ajoute des dégâts de chip quand le porteur attaque.',
  'Adds chip damage when the bearer attacks.',
  'common', 'attack', 'ninjutsu', NULL,
  'on_attack', JSON_OBJECT(),
  'enemy_defender', JSON_OBJECT(),
  'bonus_damage', JSON_OBJECT('base', 6, 'statScale', 0.8),
  360, 'card_chip'
),
(
  'gen-kage-bunshin',
  'Kage Bunshin no Jutsu',
  'Shadow Clone Jutsu',
  'Les clones absorbent l''assaut si le tank est ciblé deux fois ou plus au même tour.',
  'Clones absorb the assault if the bearer is targeted twice or more in one turn.',
  'rare', 'defense', 'genjutsu', NULL,
  'targeted_twice_same_tour', JSON_OBJECT('minHits', 2),
  'self', JSON_OBJECT(),
  'damage_reduction_pct', JSON_OBJECT('basePct', 0.55, 'statScale', 0.04),
  900, 'card_bunshin'
),
(
  'suiton-cage-aqueuse',
  'Suiton — Cage aqueuse',
  'Water Style — Aqua Prison',
  'Immobilise l''attaquant adverse quand le porteur contre-attaque.',
  'Immobilizes the enemy attacker when the bearer counters.',
  'rare', 'attack', 'ninjutsu', 'Suiton',
  'on_defend_against_attack', JSON_OBJECT(),
  'enemy_attacker', JSON_OBJECT(),
  'paralysis', JSON_OBJECT('duration', 1, 'statThreshold', 8),
  950, 'card_water_cage'
),
(
  'katon-mur-braises',
  'Katon — Mur de braises',
  'Fire Style — Ember Wall',
  'Réduit fortement les dégâts subis sous 40 % PV.',
  'Greatly reduces damage taken while below 40% HP.',
  'common', 'attack', 'ninjutsu', 'Katon',
  'self_below_pv_pct', JSON_OBJECT('threshold', 40),
  'self', JSON_OBJECT(),
  'damage_reduction_pct', JSON_OBJECT('basePct', 0.4, 'statScale', 0.03),
  420, 'card_ember_wall'
),
(
  'med-soin-zone',
  'Herbes de regroupement',
  'Squad Recovery Herbs',
  'Soigne toute l''escouade si tous les alliés actifs sont sous 50 % PV.',
  'Heals the whole squad when all active allies are below 50% HP.',
  'rare', 'support', 'medecine', NULL,
  'all_allies_below_pv_pct', JSON_OBJECT('threshold', 50),
  'all_allies', JSON_OBJECT(),
  'heal_pct_max', JSON_OBJECT('basePct', 0.12, 'statScale', 0.01),
  880, 'card_zone_heal'
),
(
  'raiton-surcharge',
  'Raiton — Surcharge',
  'Lightning Style — Overcharge',
  'Décharge supplémentaire à l''impact.',
  'Extra discharge on impact.',
  'common', 'attack', 'ninjutsu', 'Raiton',
  'on_attack', JSON_OBJECT(),
  'enemy_defender', JSON_OBJECT(),
  'bonus_damage', JSON_OBJECT('base', 8, 'statScale', 0.9),
  400, 'card_lightning'
),
(
  'gen-illusion-mineure',
  'Genjutsu — Brume mentale',
  'Genjutsu — Mind Haze',
  'Perturbe l''attaquant adverse après un genjutsu réussi.',
  'Disrupts the enemy after a successful genjutsu.',
  'common', 'attack', 'genjutsu', NULL,
  'on_genjutsu_success', JSON_OBJECT(),
  'enemy_defender', JSON_OBJECT(),
  'confusion', JSON_OBJECT('duration', 1, 'statThreshold', 7),
  410, 'card_mind_haze'
),
(
  'doton-racines',
  'Doton — Racines d''ancrage',
  'Earth Style — Anchoring Roots',
  'Stabilise le porteur tank sous pression.',
  'Stabilizes the bearer under pressure.',
  'rare', 'defense', 'ninjutsu', 'Doton',
  'on_defend_against_attack', JSON_OBJECT(),
  'self', JSON_OBJECT(),
  'damage_reduction_pct', JSON_OBJECT('basePct', 0.3, 'statScale', 0.04),
  820, 'card_earth_roots'
),
(
  'futon-lame-retour',
  'Futon — Lame de retour',
  'Wind Style — Returning Blade',
  'Riposte légère après une parade.',
  'Light riposte after defending.',
  'common', 'attack', 'ninjutsu', 'Futon',
  'on_defend_against_attack', JSON_OBJECT(),
  'enemy_attacker', JSON_OBJECT(),
  'bonus_damage', JSON_OBJECT('base', 7, 'statScale', 0.7),
  390, 'card_wind_blade'
),
(
  'legende-suiton-dragon',
  'Suiton — Dragon aqueux',
  'Water Style — Aqua Dragon',
  'Déferlement légendaire quand l''escouade est acculée.',
  'Legendary surge when the squad is cornered.',
  'legendary', 'attack', 'ninjutsu', 'Suiton',
  'all_allies_below_pv_pct', JSON_OBJECT('threshold', 35),
  'all_enemies_active', JSON_OBJECT(),
  'bonus_damage', JSON_OBJECT('base', 18, 'statScale', 1.1),
  1800, 'card_water_dragon'
);

CREATE TABLE IF NOT EXISTS village_shop_card_stock (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  restock_period INT UNSIGNED NOT NULL,
  tactic_card_definition_id INT UNSIGNED NOT NULL,
  stock_remaining TINYINT UNSIGNED NOT NULL DEFAULT 1,
  CONSTRAINT fk_vscs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_vscs_def FOREIGN KEY (tactic_card_definition_id) REFERENCES tactic_card_definitions(id) ON DELETE CASCADE,
  UNIQUE KEY uq_vscs_user_period_def (user_id, restock_period, tactic_card_definition_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
