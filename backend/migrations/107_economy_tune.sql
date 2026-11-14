-- Kage Legacy V2 — Alignement rewards_json missions sur economyConfig (planchers BP / ryos).
-- Structure des missions inchangée ; montants seulement.

-- Rang D : ~150 ryos, 100 BP XP (conserve xp/cardChance si déjà présents)
UPDATE mission_definitions
SET rewards_json = JSON_SET(
  COALESCE(rewards_json, JSON_OBJECT()),
  '$.ryos', GREATEST(COALESCE(JSON_EXTRACT(rewards_json, '$.ryos'), 0), 150),
  '$.bpPoints', GREATEST(COALESCE(JSON_EXTRACT(rewards_json, '$.bpPoints'), 0), 100),
  '$.xp', GREATEST(COALESCE(JSON_EXTRACT(rewards_json, '$.xp'), 0), 50),
  '$.cardChance', GREATEST(COALESCE(JSON_EXTRACT(rewards_json, '$.cardChance'), 0), 12)
)
WHERE `rank` = 'D' AND is_active = TRUE;

UPDATE mission_definitions
SET rewards_json = JSON_SET(
  COALESCE(rewards_json, JSON_OBJECT()),
  '$.ryos', GREATEST(COALESCE(JSON_EXTRACT(rewards_json, '$.ryos'), 0), 280),
  '$.bpPoints', GREATEST(COALESCE(JSON_EXTRACT(rewards_json, '$.bpPoints'), 0), 200),
  '$.xp', GREATEST(COALESCE(JSON_EXTRACT(rewards_json, '$.xp'), 0), 90),
  '$.cardChance', GREATEST(COALESCE(JSON_EXTRACT(rewards_json, '$.cardChance'), 0), 16)
)
WHERE `rank` = 'C' AND is_active = TRUE;

UPDATE mission_definitions
SET rewards_json = JSON_SET(
  COALESCE(rewards_json, JSON_OBJECT()),
  '$.ryos', GREATEST(COALESCE(JSON_EXTRACT(rewards_json, '$.ryos'), 0), 520),
  '$.bpPoints', GREATEST(COALESCE(JSON_EXTRACT(rewards_json, '$.bpPoints'), 0), 350),
  '$.xp', GREATEST(COALESCE(JSON_EXTRACT(rewards_json, '$.xp'), 0), 160),
  '$.cardChance', GREATEST(COALESCE(JSON_EXTRACT(rewards_json, '$.cardChance'), 0), 22)
)
WHERE `rank` = 'B' AND is_active = TRUE;

UPDATE mission_definitions
SET rewards_json = JSON_SET(
  COALESCE(rewards_json, JSON_OBJECT()),
  '$.ryos', GREATEST(COALESCE(JSON_EXTRACT(rewards_json, '$.ryos'), 0), 850),
  '$.bpPoints', GREATEST(COALESCE(JSON_EXTRACT(rewards_json, '$.bpPoints'), 0), 500),
  '$.xp', GREATEST(COALESCE(JSON_EXTRACT(rewards_json, '$.xp'), 0), 260),
  '$.cardChance', GREATEST(COALESCE(JSON_EXTRACT(rewards_json, '$.cardChance'), 0), 30)
)
WHERE `rank` = 'A' AND is_active = TRUE;
