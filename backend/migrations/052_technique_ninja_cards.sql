-- Cartes « technique ninja » liées au porteur (remplace éléments d'escouade + domaines génériques)

ALTER TABLE tactic_card_definitions
  ADD COLUMN pli_secondary_stat ENUM('taijutsu', 'ninjutsu', 'genjutsu', 'medecine') NULL AFTER stat_type,
  ADD COLUMN pli_bonus_pct DECIMAL(5, 4) NOT NULL DEFAULT 0.1500 AFTER pli_secondary_stat;

ALTER TABLE operation_decks
  ADD COLUMN technique_slots_json JSON NOT NULL DEFAULT ('{}')
    COMMENT '{"ninjaId":[userTacticCardId,...max 3]}'
    AFTER element_card_ids_json;

DELETE pl FROM player_listings pl WHERE pl.listing_type = 'tactic_card';
DELETE FROM village_shop_card_stock;
DELETE FROM user_tactic_cards;
DELETE FROM tactic_card_definitions;

INSERT INTO tactic_card_definitions (
  slug, name_fr, name_en, description_fr, description_en,
  rarity, card_type, stat_type, pli_secondary_stat, pli_bonus_pct, element_affinity,
  trigger_kind, trigger_params, target_kind, target_params, effect_kind, effect_params,
  catalog_price, narrative_key
) VALUES
(
  'tai-lame-chakras',
  'Lame de chakra',
  'Chakra Blade',
  'Technique taijutsu générique : moyenne taijutsu + ninjutsu du porteur, +15 % pour ce pli.',
  'Generic taijutsu technique: bearer taijutsu + ninjutsu average, +15% for this pli.',
  'common', 'attack', 'taijutsu', 'ninjutsu', 0.1500, NULL,
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  360, 'tech_chakra_blade'
),
(
  'tai-lame-suiton',
  'Lame suiton',
  'Water Blade',
  'Taijutsu du porteur (moyenne avec ninjutsu) +30 %. Requiert l''élément Suiton.',
  'Bearer taijutsu (averaged with ninjutsu) +30%. Requires Suiton element.',
  'common', 'attack', 'taijutsu', 'ninjutsu', 0.3000, 'Suiton',
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  420, 'tech_water_blade'
),
(
  'tai-coup-poing-leon',
  'Coup du lion',
  'Lion''s Barrage',
  'Frappe taijutsu pure du porteur, +18 % pour ce pli.',
  'Pure taijutsu strike from the bearer, +18% for this pli.',
  'common', 'attack', 'taijutsu', NULL, 0.1800, NULL,
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  350, 'tech_lion_strike'
),
(
  'tai-rotation-poings',
  'Rotation des poings',
  'Whirlwind Fists',
  'Moyenne taijutsu + médecine du porteur, +20 %.',
  'Bearer taijutsu + medicine average, +20%.',
  'common', 'attack', 'taijutsu', 'medecine', 0.2000, NULL,
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  380, 'tech_whirlwind'
),
(
  'tai-lame-futon',
  'Tranchant futon',
  'Wind Edge',
  'Moyenne taijutsu + ninjutsu, +30 %. Requiert Futon.',
  'Taijutsu + ninjutsu average, +30%. Requires Futon.',
  'rare', 'attack', 'taijutsu', 'ninjutsu', 0.3000, 'Futon',
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  780, 'tech_wind_edge'
),
(
  'nin-afflux-chakra',
  'Afflux de chakra',
  'Chakra Surge',
  'Ninjutsu du porteur, +15 % — sans prérequis d''élément.',
  'Bearer ninjutsu, +15% — no element requirement.',
  'common', 'attack', 'ninjutsu', NULL, 0.1500, NULL,
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  340, 'tech_chakra_surge'
),
(
  'nin-katon-boule',
  'Boule de feu',
  'Fireball',
  'Ninjutsu du porteur, +30 %. Requiert Katon.',
  'Bearer ninjutsu, +30%. Requires Katon.',
  'common', 'attack', 'ninjutsu', NULL, 0.3000, 'Katon',
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  400, 'tech_fireball'
),
(
  'nin-suiton-dragon',
  'Dragon aqueux',
  'Water Dragon',
  'Ninjutsu du porteur, +35 %. Requiert Suiton.',
  'Bearer ninjutsu, +35%. Requires Suiton.',
  'legendary', 'attack', 'ninjutsu', NULL, 0.3500, 'Suiton',
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  1600, 'tech_water_dragon'
),
(
  'nin-raiton-eclair',
  'Éclair raiton',
  'Lightning Bolt',
  'Ninjutsu du porteur, +30 %. Requiert Raiton.',
  'Bearer ninjutsu, +30%. Requires Raiton.',
  'common', 'attack', 'ninjutsu', NULL, 0.3000, 'Raiton',
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  410, 'tech_lightning'
),
(
  'nin-doton-seisme',
  'Séisme doton',
  'Earthquake',
  'Ninjutsu du porteur, +28 %. Requiert Doton.',
  'Bearer ninjutsu, +28%. Requires Doton.',
  'rare', 'attack', 'ninjutsu', NULL, 0.2800, 'Doton',
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  820, 'tech_earthquake'
),
(
  'nin-futon-lame',
  'Lame de vent',
  'Wind Blade',
  'Moyenne ninjutsu + taijutsu, +30 %. Requiert Futon.',
  'Ninjutsu + taijutsu average, +30%. Requires Futon.',
  'common', 'attack', 'ninjutsu', 'taijutsu', 0.3000, 'Futon',
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  390, 'tech_wind_blade'
),
(
  'nin-clone-ombre',
  'Clone de l''ombre',
  'Shadow Clone',
  'Moyenne ninjutsu + genjutsu, +22 %.',
  'Ninjutsu + genjutsu average, +22%.',
  'rare', 'attack', 'ninjutsu', 'genjutsu', 0.2200, NULL,
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  880, 'tech_shadow_clone'
),
(
  'gen-mirage-simple',
  'Mirage simple',
  'Simple Mirage',
  'Genjutsu du porteur, +15 %.',
  'Bearer genjutsu, +15%.',
  'common', 'attack', 'genjutsu', NULL, 0.1500, NULL,
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  350, 'tech_simple_mirage'
),
(
  'gen-brume-mentale',
  'Brume mentale',
  'Mind Haze',
  'Moyenne genjutsu + ninjutsu, +25 %.',
  'Genjutsu + ninjutsu average, +25%.',
  'common', 'attack', 'genjutsu', 'ninjutsu', 0.2500, NULL,
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  400, 'tech_mind_haze'
),
(
  'gen-dango-cuisiniere',
  'Dango de l''enfer',
  'Hell Dango',
  'Genjutsu du porteur, +30 %.',
  'Bearer genjutsu, +30%.',
  'rare', 'attack', 'genjutsu', NULL, 0.3000, NULL,
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  900, 'tech_hell_dango'
),
(
  'med-scalpel-chakra',
  'Scalpel de chakra',
  'Chakra Scalpel',
  'Moyenne médecine + taijutsu offensive, +20 %.',
  'Medicine + taijutsu offensive average, +20%.',
  'common', 'attack', 'medecine', 'taijutsu', 0.2000, NULL,
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  370, 'tech_chakra_scalpel'
),
(
  'med-paume-mystique',
  'Paume mystique',
  'Mystic Palm',
  'Médecine du porteur (soin ou riposte), +15 %.',
  'Bearer medicine (heal or riposte), +15%.',
  'common', 'support', 'medecine', NULL, 0.1500, NULL,
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  360, 'tech_mystic_palm'
),
(
  'med-antidote-choc',
  'Antidote de choc',
  'Shock Antidote',
  'Moyenne médecine + ninjutsu, +18 %.',
  'Medicine + ninjutsu average, +18%.',
  'common', 'support', 'medecine', 'ninjutsu', 0.1800, NULL,
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  380, 'tech_antidote'
),
(
  'tai-frappe-ombre',
  'Frappe de l''ombre',
  'Shadow Strike',
  'Moyenne taijutsu + genjutsu, +25 %.',
  'Taijutsu + genjutsu average, +25%.',
  'rare', 'attack', 'taijutsu', 'genjutsu', 0.2500, NULL,
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  850, 'tech_shadow_strike'
),
(
  'nin-chidori',
  'Chidori',
  'Chidori',
  'Moyenne ninjutsu + taijutsu, +32 %. Requiert Raiton.',
  'Ninjutsu + taijutsu average, +32%. Requires Raiton.',
  'legendary', 'attack', 'ninjutsu', 'taijutsu', 0.3200, 'Raiton',
  'pli_play', JSON_OBJECT(), 'self', JSON_OBJECT(), 'pli_power', JSON_OBJECT(),
  1700, 'tech_chidori'
);

UPDATE operation_decks
SET techniques_json = '{}',
    element_card_ids_json = '[]',
    technique_slots_json = '{}';
