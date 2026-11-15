-- Kage Legacy V2 — Deck combat (Phase 4)
-- Sessions Slay-the-Spire-like + missions stub pour tests

CREATE TABLE IF NOT EXISTS mission_definitions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(100) NOT NULL,
  name_fr VARCHAR(200) NOT NULL,
  name_en VARCHAR(200) NOT NULL,
  description_fr TEXT NULL,
  description_en TEXT NULL,
  `rank` ENUM('D', 'C', 'B', 'A', 'S') NOT NULL DEFAULT 'D',
  -- Liste d'encounters : [{ "templateId": "ronin_bandit", "difficulty": 1 }]
  encounters_json JSON NOT NULL,
  rewards_json JSON NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT uq_mission_definitions_slug UNIQUE (slug),
  INDEX idx_mission_rank (`rank`),
  INDEX idx_mission_active (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS combat_sessions (
  id VARCHAR(36) PRIMARY KEY COMMENT 'UUID',
  user_id INT UNSIGNED NOT NULL,
  mission_id INT UNSIGNED NULL,
  deck_id INT UNSIGNED NULL,

  state ENUM('in_progress', 'victory', 'defeat', 'forfeited') NOT NULL DEFAULT 'in_progress',

  player_state_json JSON NOT NULL,
  enemy_state_json JSON NOT NULL,

  current_turn INT UNSIGNED NOT NULL DEFAULT 1,
  current_phase ENUM('player_turn', 'enemy_turn', 'game_over') NOT NULL DEFAULT 'player_turn',

  -- Snapshots de lancement (stats / effets talents)
  stats_snapshot_json JSON NULL,
  talent_effects_json JSON NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_combat_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_combat_sessions_mission FOREIGN KEY (mission_id) REFERENCES mission_definitions(id) ON DELETE SET NULL,
  INDEX idx_combat_sessions_user (user_id, state),
  INDEX idx_combat_sessions_mission (mission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS combat_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  combat_session_id VARCHAR(36) NOT NULL,
  turn INT UNSIGNED NOT NULL DEFAULT 1,
  action_type VARCHAR(50) NOT NULL,
  action_data_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_combat_logs_session FOREIGN KEY (combat_session_id) REFERENCES combat_sessions(id) ON DELETE CASCADE,
  INDEX idx_combat_logs_session (combat_session_id, turn)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Missions stub (noms originaux — pas d'IP tierce)
INSERT INTO mission_definitions (slug, name_fr, name_en, description_fr, description_en, `rank`, encounters_json, rewards_json, sort_order)
VALUES
(
  'patrol-mist-road',
  'Patrouille — Route des Brumes',
  'Patrol — Mist Road',
  'Éliminez un rônin isolé qui rançonne les voyageurs.',
  'Clear a lone ronin shaking down travelers.',
  'D',
  JSON_ARRAY(JSON_OBJECT('templateId', 'ronin_bandit', 'difficulty', 1)),
  JSON_OBJECT('xp', 40, 'ryos', 120),
  10
),
(
  'secure-ash-outpost',
  'Sécuriser l''avant-poste de Cendre',
  'Secure the Ash Outpost',
  'Un éclaireur du clan Kurogane bloque le col. Anticipez ses intentions.',
  'A Kurogane scout blocks the pass. Anticipate their intents.',
  'C',
  JSON_ARRAY(JSON_OBJECT('templateId', 'kurogane_scout', 'difficulty', 1)),
  JSON_OBJECT('xp', 80, 'ryos', 250),
  20
),
(
  'duel-ashen-captain',
  'Duel — Capitaine Cendré',
  'Duel — Ashen Captain',
  'Affrontez un capitaine d''élite au pattern prévisible. Préparez votre armure.',
  'Face an elite captain with a predictable pattern. Prep your block.',
  'B',
  JSON_ARRAY(JSON_OBJECT('templateId', 'ashen_captain', 'difficulty', 1)),
  JSON_OBJECT('xp', 150, 'ryos', 500),
  30
)
ON DUPLICATE KEY UPDATE
  name_fr = VALUES(name_fr),
  name_en = VALUES(name_en),
  description_fr = VALUES(description_fr),
  description_en = VALUES(description_en),
  encounters_json = VALUES(encounters_json),
  rewards_json = VALUES(rewards_json),
  sort_order = VALUES(sort_order),
  is_active = TRUE;
