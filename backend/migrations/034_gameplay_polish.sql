-- Gameplay polish : résistances élémentaires, moral, notifications Chunin, objet moral

ALTER TABLE sensei_notifications
  MODIFY kind ENUM(
    'bird_flight',
    'market_sale',
    'mission_report',
    'stagnation',
    'clan_well_fusion',
    'chunin_exam_success',
    'chunin_exam_failure'
  ) NOT NULL;

INSERT INTO item_definitions (slug, category, name_fr, name_en, description_fr, description_en, price, effects, promo_eligible, default_stock) VALUES
(
  'brassard-katon',
  'match',
  'Brassard anti-Katon',
  'Anti-Katon Bracer',
  'Réduit les dégâts de Ninjutsu Katon adverse (+2 défense élémentaire). 2× / match.',
  'Reduces enemy Katon ninjutsu damage (+2 elemental defense). Twice per match.',
  650,
  JSON_OBJECT('match', JSON_OBJECT('trigger', 'element_resist', 'element', 'Katon', 'defenseBonus', 2, 'usesPerMatch', 2)),
  TRUE,
  2
),
(
  'brassard-suiton',
  'match',
  'Brassard anti-Suiton',
  'Anti-Suiton Bracer',
  'Réduit les dégâts de Ninjutsu Suiton adverse (+2 défense élémentaire). 2× / match.',
  'Reduces enemy Suiton ninjutsu damage (+2 elemental defense). Twice per match.',
  650,
  JSON_OBJECT('match', JSON_OBJECT('trigger', 'element_resist', 'element', 'Suiton', 'defenseBonus', 2, 'usesPerMatch', 2)),
  TRUE,
  2
),
(
  'brassard-raiton',
  'match',
  'Brassard anti-Raiton',
  'Anti-Raiton Bracer',
  'Réduit les dégâts de Ninjutsu Raiton adverse (+2 défense élémentaire). 2× / match.',
  'Reduces enemy Raiton ninjutsu damage (+2 elemental defense). Twice per match.',
  650,
  JSON_OBJECT('match', JSON_OBJECT('trigger', 'element_resist', 'element', 'Raiton', 'defenseBonus', 2, 'usesPerMatch', 2)),
  TRUE,
  2
),
(
  'brassard-doton',
  'match',
  'Brassard anti-Doton',
  'Anti-Doton Bracer',
  'Réduit les dégâts de Ninjutsu Doton adverse (+2 défense élémentaire). 2× / match.',
  'Reduces enemy Doton ninjutsu damage (+2 elemental defense). Twice per match.',
  650,
  JSON_OBJECT('match', JSON_OBJECT('trigger', 'element_resist', 'element', 'Doton', 'defenseBonus', 2, 'usesPerMatch', 2)),
  TRUE,
  2
),
(
  'brassard-futon',
  'match',
  'Brassard anti-Futon',
  'Anti-Futon Bracer',
  'Réduit les dégâts de Ninjutsu Futon adverse (+2 défense élémentaire). 2× / match.',
  'Reduces enemy Futon ninjutsu damage (+2 elemental defense). Twice per match.',
  650,
  JSON_OBJECT('match', JSON_OBJECT('trigger', 'element_resist', 'element', 'Futon', 'defenseBonus', 2, 'usesPerMatch', 2)),
  TRUE,
  2
),
(
  'encens-motivation',
  'bureau',
  'Encens de motivation',
  'Motivation Incense',
  'Remonte le moral d''un ninja de +3 (max 20).',
  'Raises a ninja''s morale by +3 (max 20).',
  450,
  JSON_OBJECT('bureau', JSON_OBJECT('trigger', 'moral_boost', 'amount', 3)),
  TRUE,
  2
);
