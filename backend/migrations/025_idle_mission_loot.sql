-- M4 : missions idle par palier de danger + tables de butin probabilistes

ALTER TABLE ninjas
  ADD COLUMN forme_lock_cycles TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER weekly_forme,
  ADD COLUMN injury_discount_ryos INT UNSIGNED NOT NULL DEFAULT 0 AFTER forme_lock_cycles;

ALTER TABLE idle_missions
  ADD COLUMN mission_tier ENUM('routine', 'infiltration', 'cyclone') NULL AFTER cycle_start_at,
  ADD COLUMN resolves_at_hour TINYINT UNSIGNED NOT NULL DEFAULT 72 AFTER mission_rank,
  ADD COLUMN loot_result JSON NULL AFTER reward_amount,
  ADD COLUMN injury_type ENUM('none', 'light', 'grave', 'death') NOT NULL DEFAULT 'none' AFTER loot_result;

UPDATE idle_missions SET mission_tier = CASE mission_rank
  WHEN 'D' THEN 'routine'
  WHEN 'C' THEN 'infiltration'
  WHEN 'B' THEN 'cyclone'
END WHERE mission_tier IS NULL;

ALTER TABLE idle_missions
  MODIFY mission_tier ENUM('routine', 'infiltration', 'cyclone') NOT NULL,
  DROP COLUMN mission_rank;

ALTER TABLE idle_missions
  ADD UNIQUE KEY uq_mission_user_cycle_tier (user_id, cycle_start_at, mission_tier);

INSERT INTO item_definitions (slug, category, name_fr, name_en, description_fr, description_en, price, effects) VALUES
(
  'pansement-terrain',
  'bureau',
  'Pansement de terrain',
  'Field Dressing',
  'Réduit de 50 Ryos les frais de la prochaine blessure légère soignée au dispensaire.',
  'Reduces the cost of the next light injury treated at the dispensary by 50 Ryos.',
  0,
  JSON_OBJECT('bureau', JSON_OBJECT('trigger', 'injury_discount', 'amount', 50))
),
(
  'kit-materiel-medical',
  'bureau',
  'Kit de matériel médical',
  'Medical Supply Kit',
  'Soigne gratuitement un ninja en forme Lamentable (comme une visite au dispensaire).',
  'Freely heals a ninja in Lamentable form (like a dispensary visit).',
  0,
  JSON_OBJECT('bureau', JSON_OBJECT('trigger', 'forme_upgrade'))
),
(
  'parchemin-jutsu-interdit',
  'bureau',
  'Parchemin de Jutsu interdit',
  'Forbidden Jutsu Scroll',
  'Confère +0,5 ou +1,0 immédiat dans une stat au ninja ciblé (simule plusieurs cycles d''entraînement).',
  'Grants +0.5 or +1.0 immediately in one stat to the targeted ninja (simulates several training cycles).',
  0,
  JSON_OBJECT('bureau', JSON_OBJECT('trigger', 'jutsu_scroll'))
);
