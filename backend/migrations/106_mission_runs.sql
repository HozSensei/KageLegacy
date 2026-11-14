-- Kage Legacy V2 — Mission runs (parcours multi-combats + événements)

CREATE TABLE IF NOT EXISTS mission_runs (
  id VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
  user_id INT UNSIGNED NOT NULL,
  mission_id INT UNSIGNED NOT NULL,
  deck_id INT UNSIGNED NULL,

  state ENUM('in_progress', 'victory', 'defeat', 'abandoned') NOT NULL DEFAULT 'in_progress',

  -- Index du nœud courant (disponible) dans nodes_json
  current_node_index INT UNSIGNED NOT NULL DEFAULT 0,

  -- Parcours généré : [{ id, type: combat|event, status, ... }]
  nodes_json JSON NOT NULL,

  -- PV / scrap / buffs de run (persistent entre combats)
  player_run_state_json JSON NOT NULL,

  stats_snapshot_json JSON NULL,
  talent_effects_json JSON NULL,

  current_combat_id VARCHAR(36) NULL COMMENT 'Combat en cours lié à ce run',

  rewards_json JSON NULL COMMENT 'Récompenses de fin de run',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_mission_runs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_mission_runs_mission FOREIGN KEY (mission_id) REFERENCES mission_definitions(id) ON DELETE CASCADE,
  INDEX idx_mission_runs_user_state (user_id, state),
  INDEX idx_mission_runs_mission (mission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lien combat → run (récompenses différées)
ALTER TABLE combat_sessions
  ADD COLUMN mission_run_id VARCHAR(36) NULL
  COMMENT 'Run de mission parent (récompenses en fin de parcours)'
  AFTER mission_id;

ALTER TABLE combat_sessions
  ADD INDEX idx_combat_sessions_run (mission_run_id);

-- Enrichir les missions existantes : chaînes d'encounters (3–5) + boss sur rangs élevés
UPDATE mission_definitions
SET encounters_json = JSON_ARRAY(
  JSON_OBJECT('templateId', 'ronin_bandit', 'difficulty', 1),
  JSON_OBJECT('templateId', 'marsh_cutpurse', 'difficulty', 1),
  JSON_OBJECT('templateId', 'scrapyard_dog', 'difficulty', 1)
),
rewards_json = JSON_OBJECT('xp', 90, 'ryos', 280, 'cardChance', 22, 'bpPoints', 5, 'runBonusMult', 1.6)
WHERE slug = 'patrol-mist-road';

UPDATE mission_definitions
SET encounters_json = JSON_ARRAY(
  JSON_OBJECT('templateId', 'marsh_cutpurse', 'difficulty', 1),
  JSON_OBJECT('templateId', 'ronin_bandit', 'difficulty', 1),
  JSON_OBJECT('templateId', 'scrapyard_dog', 'difficulty', 1)
),
rewards_json = JSON_OBJECT('xp', 100, 'ryos', 300, 'cardChance', 24, 'bpPoints', 5, 'runBonusMult', 1.6)
WHERE slug = 'drain-marsh-cutpurse';

UPDATE mission_definitions
SET encounters_json = JSON_ARRAY(
  JSON_OBJECT('templateId', 'scrapyard_dog', 'difficulty', 1),
  JSON_OBJECT('templateId', 'ronin_bandit', 'difficulty', 1),
  JSON_OBJECT('templateId', 'marsh_cutpurse', 'difficulty', 1)
),
rewards_json = JSON_OBJECT('xp', 110, 'ryos', 320, 'cardChance', 24, 'bpPoints', 6, 'runBonusMult', 1.6)
WHERE slug = 'scrapyard-hound';

UPDATE mission_definitions
SET encounters_json = JSON_ARRAY(
  JSON_OBJECT('templateId', 'kurogane_scout', 'difficulty', 1),
  JSON_OBJECT('templateId', 'tide_sentinel', 'difficulty', 1),
  JSON_OBJECT('templateId', 'mirror_adept', 'difficulty', 1)
),
rewards_json = JSON_OBJECT('xp', 180, 'ryos', 520, 'cardChance', 28, 'bpPoints', 8, 'runBonusMult', 1.8)
WHERE slug = 'secure-ash-outpost';

UPDATE mission_definitions
SET encounters_json = JSON_ARRAY(
  JSON_OBJECT('templateId', 'tide_sentinel', 'difficulty', 1),
  JSON_OBJECT('templateId', 'kurogane_scout', 'difficulty', 1),
  JSON_OBJECT('templateId', 'mirror_adept', 'difficulty', 1)
),
rewards_json = JSON_OBJECT('xp', 190, 'ryos', 540, 'cardChance', 28, 'bpPoints', 8, 'runBonusMult', 1.8)
WHERE slug = 'hold-tide-gate';

UPDATE mission_definitions
SET encounters_json = JSON_ARRAY(
  JSON_OBJECT('templateId', 'mirror_adept', 'difficulty', 1),
  JSON_OBJECT('templateId', 'tide_sentinel', 'difficulty', 1),
  JSON_OBJECT('templateId', 'kurogane_scout', 'difficulty', 1)
),
rewards_json = JSON_OBJECT('xp', 200, 'ryos', 560, 'cardChance', 30, 'bpPoints', 9, 'runBonusMult', 1.8)
WHERE slug = 'shatter-mirror-adept';

UPDATE mission_definitions
SET encounters_json = JSON_ARRAY(
  JSON_OBJECT('templateId', 'kurogane_scout', 'difficulty', 1),
  JSON_OBJECT('templateId', 'ashen_captain', 'difficulty', 1),
  JSON_OBJECT('templateId', 'ironroot_warden', 'difficulty', 1),
  JSON_OBJECT('templateId', 'stormcaller_adept', 'difficulty', 1, 'boss', TRUE)
),
rewards_json = JSON_OBJECT('xp', 320, 'ryos', 980, 'cardChance', 36, 'bpPoints', 12, 'runBonusMult', 2.0)
WHERE slug = 'duel-ashen-captain';

UPDATE mission_definitions
SET encounters_json = JSON_ARRAY(
  JSON_OBJECT('templateId', 'tide_sentinel', 'difficulty', 1),
  JSON_OBJECT('templateId', 'ironroot_warden', 'difficulty', 1),
  JSON_OBJECT('templateId', 'ashen_captain', 'difficulty', 1),
  JSON_OBJECT('templateId', 'stormcaller_adept', 'difficulty', 1, 'boss', TRUE)
),
rewards_json = JSON_OBJECT('xp', 340, 'ryos', 1020, 'cardChance', 36, 'bpPoints', 12, 'runBonusMult', 2.0)
WHERE slug = 'ironroot-siege';

UPDATE mission_definitions
SET encounters_json = JSON_ARRAY(
  JSON_OBJECT('templateId', 'mirror_adept', 'difficulty', 1),
  JSON_OBJECT('templateId', 'stormcaller_adept', 'difficulty', 1),
  JSON_OBJECT('templateId', 'ashen_captain', 'difficulty', 1),
  JSON_OBJECT('templateId', 'ironroot_warden', 'difficulty', 1, 'boss', TRUE)
),
rewards_json = JSON_OBJECT('xp', 360, 'ryos', 1060, 'cardChance', 38, 'bpPoints', 14, 'runBonusMult', 2.0)
WHERE slug = 'stormcaller-trial';

UPDATE mission_definitions
SET encounters_json = JSON_ARRAY(
  JSON_OBJECT('templateId', 'ashen_captain', 'difficulty', 1),
  JSON_OBJECT('templateId', 'ironroot_warden', 'difficulty', 1),
  JSON_OBJECT('templateId', 'stormcaller_adept', 'difficulty', 1),
  JSON_OBJECT('templateId', 'veil_archivist', 'difficulty', 1),
  JSON_OBJECT('templateId', 'duskblade_ronin', 'difficulty', 1, 'boss', TRUE)
),
rewards_json = JSON_OBJECT('xp', 520, 'ryos', 1600, 'cardChance', 48, 'bpPoints', 20, 'runBonusMult', 2.4)
WHERE slug = 'duskblade-challenge';

UPDATE mission_definitions
SET encounters_json = JSON_ARRAY(
  JSON_OBJECT('templateId', 'mirror_adept', 'difficulty', 1),
  JSON_OBJECT('templateId', 'stormcaller_adept', 'difficulty', 1),
  JSON_OBJECT('templateId', 'ashen_captain', 'difficulty', 1),
  JSON_OBJECT('templateId', 'duskblade_ronin', 'difficulty', 1),
  JSON_OBJECT('templateId', 'veil_archivist', 'difficulty', 1, 'boss', TRUE)
),
rewards_json = JSON_OBJECT('xp', 560, 'ryos', 1700, 'cardChance', 50, 'bpPoints', 22, 'runBonusMult', 2.4)
WHERE slug = 'veil-archive-breach';
