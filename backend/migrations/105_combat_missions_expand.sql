-- Kage Legacy V2 — Missions D→A + colonne rewards sur sessions combat

ALTER TABLE combat_sessions
  ADD COLUMN rewards_json JSON NULL
  COMMENT 'Résumé récompenses de victoire (xp/ryos/carte)' AFTER talent_effects_json;

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
  JSON_OBJECT('xp', 40, 'ryos', 120, 'cardChance', 10, 'bpPoints', 2),
  10
),
(
  'drain-marsh-cutpurse',
  'Assèchement — Coupe-bourse',
  'Drain — Cutpurse',
  'Un voleur des marais empoisonne les sentiers. Coupez court.',
  'A marsh thief poisons the trails. Cut him short.',
  'D',
  JSON_ARRAY(JSON_OBJECT('templateId', 'marsh_cutpurse', 'difficulty', 1)),
  JSON_OBJECT('xp', 45, 'ryos', 130, 'cardChance', 12, 'bpPoints', 2),
  12
),
(
  'scrapyard-hound',
  'Chasse — Chien de la Ferraille',
  'Hunt — Scrapyard Hound',
  'Une bête dressée garde un dépôt abandonné. Frappez vite.',
  'A trained beast guards an abandoned depot. Strike fast.',
  'D',
  JSON_ARRAY(JSON_OBJECT('templateId', 'scrapyard_dog', 'difficulty', 1)),
  JSON_OBJECT('xp', 50, 'ryos', 140, 'cardChance', 12, 'bpPoints', 3),
  14
),
(
  'secure-ash-outpost',
  'Sécuriser l''avant-poste de Cendre',
  'Secure the Ash Outpost',
  'Un éclaireur du clan Kurogane bloque le col. Anticipez ses intentions.',
  'A Kurogane scout blocks the pass. Anticipate their intents.',
  'C',
  JSON_ARRAY(JSON_OBJECT('templateId', 'kurogane_scout', 'difficulty', 1)),
  JSON_OBJECT('xp', 80, 'ryos', 250, 'cardChance', 15, 'bpPoints', 4),
  20
),
(
  'hold-tide-gate',
  'Tenir la Porte de Marée',
  'Hold the Tide Gate',
  'La sentinelle suit un rythme défensif. Brisez sa garde.',
  'The sentinel follows a defensive rhythm. Break the guard.',
  'C',
  JSON_ARRAY(JSON_OBJECT('templateId', 'tide_sentinel', 'difficulty', 1)),
  JSON_OBJECT('xp', 90, 'ryos', 270, 'cardChance', 16, 'bpPoints', 4),
  22
),
(
  'shatter-mirror-adept',
  'Briser l''Adepte du Miroir',
  'Shatter the Mirror Adept',
  'Illusions et vulnérabilité : préparez vos ripostes.',
  'Illusions and vulnerability: prepare your counters.',
  'C',
  JSON_ARRAY(JSON_OBJECT('templateId', 'mirror_adept', 'difficulty', 1)),
  JSON_OBJECT('xp', 95, 'ryos', 280, 'cardChance', 16, 'bpPoints', 5),
  24
),
(
  'duel-ashen-captain',
  'Duel — Capitaine Cendré',
  'Duel — Ashen Captain',
  'Affrontez un capitaine d''élite au pattern prévisible. Préparez votre armure.',
  'Face an elite captain with a predictable pattern. Prep your block.',
  'B',
  JSON_ARRAY(JSON_OBJECT('templateId', 'ashen_captain', 'difficulty', 1)),
  JSON_OBJECT('xp', 150, 'ryos', 500, 'cardChance', 20, 'bpPoints', 6),
  30
),
(
  'ironroot-siege',
  'Siège — Racine-de-Fer',
  'Siege — Ironroot',
  'Le gardien enchaîne garde et coups lourds. Patience.',
  'The warden chains block and heavy hits. Be patient.',
  'B',
  JSON_ARRAY(JSON_OBJECT('templateId', 'ironroot_warden', 'difficulty', 1)),
  JSON_OBJECT('xp', 160, 'ryos', 520, 'cardChance', 20, 'bpPoints', 6),
  32
),
(
  'stormcaller-trial',
  'Épreuve — Mandeciel',
  'Trial — Stormcaller',
  'Foudre et brûlures en boucle. Gérez vos PV.',
  'Lightning and burns on a loop. Manage your HP.',
  'B',
  JSON_ARRAY(JSON_OBJECT('templateId', 'stormcaller_adept', 'difficulty', 1)),
  JSON_OBJECT('xp', 170, 'ryos', 540, 'cardChance', 22, 'bpPoints', 7),
  34
),
(
  'duskblade-challenge',
  'Défi — Lame-Crépuscule',
  'Challenge — Duskblade',
  'Un rônin d''élite frappe fort. Survives le burst.',
  'An elite ronin hits hard. Survive the burst.',
  'A',
  JSON_ARRAY(JSON_OBJECT('templateId', 'duskblade_ronin', 'difficulty', 1)),
  JSON_OBJECT('xp', 240, 'ryos', 800, 'cardChance', 28, 'bpPoints', 10),
  40
),
(
  'veil-archive-breach',
  'Intrusion — Archives du Voile',
  'Breach — Veil Archives',
  'L''archiviste empile débuffs. Purgez ou tuez vite.',
  'The archivist stacks debuffs. Cleanse or kill fast.',
  'A',
  JSON_ARRAY(JSON_OBJECT('templateId', 'veil_archivist', 'difficulty', 1)),
  JSON_OBJECT('xp', 260, 'ryos', 850, 'cardChance', 30, 'bpPoints', 10),
  42
)
ON DUPLICATE KEY UPDATE
  name_fr = VALUES(name_fr),
  name_en = VALUES(name_en),
  description_fr = VALUES(description_fr),
  description_en = VALUES(description_en),
  `rank` = VALUES(`rank`),
  encounters_json = VALUES(encounters_json),
  rewards_json = VALUES(rewards_json),
  sort_order = VALUES(sort_order),
  is_active = TRUE;
