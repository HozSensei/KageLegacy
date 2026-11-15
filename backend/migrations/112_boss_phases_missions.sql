-- Kage Legacy V2 — Boss multi-phases branchés sur missions / runs
-- Templates : hollow_bell_warden, embercoil_matron, grave_orchid_seer,
--             mirrorfracture_colossus, voidspire_regent (code enemyTemplates.js)

UPDATE mission_definitions
SET encounters_json = JSON_ARRAY(
  JSON_OBJECT('templateId', 'kurogane_scout', 'difficulty', 1),
  JSON_OBJECT('templateId', 'ashen_captain', 'difficulty', 1),
  JSON_OBJECT('templateId', 'ironroot_warden', 'difficulty', 1),
  JSON_OBJECT('templateId', 'hollow_bell_warden', 'difficulty', 1, 'boss', TRUE)
)
WHERE slug = 'duel-ashen-captain';

UPDATE mission_definitions
SET encounters_json = JSON_ARRAY(
  JSON_OBJECT('templateId', 'tide_sentinel', 'difficulty', 1),
  JSON_OBJECT('templateId', 'ironroot_warden', 'difficulty', 1),
  JSON_OBJECT('templateId', 'ashen_captain', 'difficulty', 1),
  JSON_OBJECT('templateId', 'embercoil_matron', 'difficulty', 1, 'boss', TRUE)
)
WHERE slug = 'ironroot-siege';

UPDATE mission_definitions
SET encounters_json = JSON_ARRAY(
  JSON_OBJECT('templateId', 'mirror_adept', 'difficulty', 1),
  JSON_OBJECT('templateId', 'stormcaller_adept', 'difficulty', 1),
  JSON_OBJECT('templateId', 'ashen_captain', 'difficulty', 1),
  JSON_OBJECT('templateId', 'hollow_bell_warden', 'difficulty', 1, 'boss', TRUE)
)
WHERE slug = 'stormcaller-trial';

UPDATE mission_definitions
SET encounters_json = JSON_ARRAY(
  JSON_OBJECT('templateId', 'ashen_captain', 'difficulty', 1),
  JSON_OBJECT('templateId', 'ironroot_warden', 'difficulty', 1),
  JSON_OBJECT('templateId', 'stormcaller_adept', 'difficulty', 1),
  JSON_OBJECT('templateId', 'veil_archivist', 'difficulty', 1),
  JSON_OBJECT('templateId', 'grave_orchid_seer', 'difficulty', 1, 'boss', TRUE)
)
WHERE slug = 'duskblade-challenge';

UPDATE mission_definitions
SET encounters_json = JSON_ARRAY(
  JSON_OBJECT('templateId', 'mirror_adept', 'difficulty', 1),
  JSON_OBJECT('templateId', 'stormcaller_adept', 'difficulty', 1),
  JSON_OBJECT('templateId', 'ashen_captain', 'difficulty', 1),
  JSON_OBJECT('templateId', 'duskblade_ronin', 'difficulty', 1),
  JSON_OBJECT('templateId', 'mirrorfracture_colossus', 'difficulty', 1, 'boss', TRUE)
)
WHERE slug = 'veil-archive-breach';

INSERT INTO mission_definitions (slug, name_fr, name_en, description_fr, description_en, `rank`, encounters_json, rewards_json, sort_order)
VALUES
(
  'toll-hollow-bell',
  'Glas — Cloche Creuse',
  'Toll — Hollow Bell',
  'Le Gardien de la Cloche Creuse dresse une barrière vivante. Brisez-la avant le glas.',
  'The Hollow Bell Warden raises a living barrier. Shatter it before the toll.',
  'B',
  JSON_ARRAY(
    JSON_OBJECT('templateId', 'kurogane_scout', 'difficulty', 1),
    JSON_OBJECT('templateId', 'ironroot_warden', 'difficulty', 1),
    JSON_OBJECT('templateId', 'ashen_captain', 'difficulty', 1),
    JSON_OBJECT('templateId', 'hollow_bell_warden', 'difficulty', 1, 'boss', TRUE)
  ),
  JSON_OBJECT('xp', 380, 'ryos', 1100, 'cardChance', 38, 'bpPoints', 14, 'runBonusMult', 2.1),
  36
),
(
  'embercoil-ascent',
  'Ascension — Spiralebraise',
  'Ascent — Embercoil',
  'La Matrone Spiralebraise charge ses coups. Interrompez le vent de braise.',
  'Embercoil Matron winds up crushing blows. Interrupt the ember gale.',
  'B',
  JSON_ARRAY(
    JSON_OBJECT('templateId', 'tide_sentinel', 'difficulty', 1),
    JSON_OBJECT('templateId', 'stormcaller_adept', 'difficulty', 1),
    JSON_OBJECT('templateId', 'kurogane_scout', 'difficulty', 1),
    JSON_OBJECT('templateId', 'embercoil_matron', 'difficulty', 1, 'boss', TRUE)
  ),
  JSON_OBJECT('xp', 390, 'ryos', 1120, 'cardChance', 38, 'bpPoints', 14, 'runBonusMult', 2.1),
  37
),
(
  'orchid-grave-vigil',
  'Veillee — Orchidee-Tombe',
  'Vigil — Grave Orchid',
  'La Voyante invoque des petales funebres. Coupez ses ombres avant le fletrissement.',
  'The Seer summons funeral petals. Cut down her shades before the wilt.',
  'A',
  JSON_ARRAY(
    JSON_OBJECT('templateId', 'mirror_adept', 'difficulty', 1),
    JSON_OBJECT('templateId', 'veil_archivist', 'difficulty', 1),
    JSON_OBJECT('templateId', 'stormcaller_adept', 'difficulty', 1),
    JSON_OBJECT('templateId', 'duskblade_ronin', 'difficulty', 1),
    JSON_OBJECT('templateId', 'grave_orchid_seer', 'difficulty', 1, 'boss', TRUE)
  ),
  JSON_OBJECT('xp', 580, 'ryos', 1750, 'cardChance', 50, 'bpPoints', 22, 'runBonusMult', 2.5),
  44
),
(
  'fracturemire-siege',
  'Siege — Fracturemire',
  'Siege — Mirrorfracture',
  'Le Colosse Fracturemire empile barrieres et eclats. Brisez le prisme.',
  'Mirrorfracture Colossus stacks barriers and shards. Shatter the prism.',
  'A',
  JSON_ARRAY(
    JSON_OBJECT('templateId', 'ashen_captain', 'difficulty', 1),
    JSON_OBJECT('templateId', 'ironroot_warden', 'difficulty', 1),
    JSON_OBJECT('templateId', 'duskblade_ronin', 'difficulty', 1),
    JSON_OBJECT('templateId', 'veil_archivist', 'difficulty', 1),
    JSON_OBJECT('templateId', 'mirrorfracture_colossus', 'difficulty', 1, 'boss', TRUE)
  ),
  JSON_OBJECT('xp', 600, 'ryos', 1800, 'cardChance', 52, 'bpPoints', 24, 'runBonusMult', 2.5),
  46
),
(
  'voidspire-regency',
  'Regence — Fleche-Vide',
  'Regency — Voidspire',
  'Le Regent de la Fleche-Vide bascule en trois phases. Survivez a l eclipse.',
  'The Voidspire Regent shifts through three phases. Survive the eclipse.',
  'S',
  JSON_ARRAY(
    JSON_OBJECT('templateId', 'stormcaller_adept', 'difficulty', 1),
    JSON_OBJECT('templateId', 'duskblade_ronin', 'difficulty', 1),
    JSON_OBJECT('templateId', 'grave_orchid_seer', 'difficulty', 1),
    JSON_OBJECT('templateId', 'mirrorfracture_colossus', 'difficulty', 1),
    JSON_OBJECT('templateId', 'voidspire_regent', 'difficulty', 1, 'boss', TRUE)
  ),
  JSON_OBJECT('xp', 900, 'ryos', 2800, 'cardChance', 60, 'bpPoints', 35, 'runBonusMult', 3.0),
  50
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
